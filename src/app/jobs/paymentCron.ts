import cron from "node-cron";
import { PaymentStatus } from "../../generated/prisma/enums";
import { bkashPaymentClient } from "../lib/bkash.client";
import { invoiceService } from "../lib/invoice";
import { prisma } from "../lib/prisma";

// A tenant who initiates bKash checkout but never returns through the callback
// leaves the Payment row stranded in PENDING forever. This job reconciles those
// rows against the bKash gateway: COMPLETED if bKash reports a success, else
// FAILED. It only touches rows that have a bKash payment ID and are older than
// STALE_MINUTES, so in-flight checkouts are never touched.
const STALE_MINUTES = 15;

const reconcileStrandedPayments = async () => {
	const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);

	const stranded = await prisma.payment.findMany({
		where: {
			status: PaymentStatus.PENDING,
			bkashPaymentId: { not: null },
			createdAt: { lt: cutoff },
		},
		select: { id: true, bkashPaymentId: true },
	});

	for (const payment of stranded) {
		try {
			const paymentID = payment.bkashPaymentId;
			if (!paymentID) continue;

			const status = await bkashPaymentClient.queryPayment(paymentID);
			if (status === undefined) continue;

			if (
				status.transactionStatus === "Completed" &&
				status.trxID
			) {
				await prisma.payment.update({
					where: { id: payment.id },
					data: {
						status: PaymentStatus.COMPLETED,
						bkashTransactionId: status.trxID,
						paymentMethod: "bkash",
						paidAt: new Date(),
					},
				});
				void invoiceService.sendRentInvoiceMail(payment.id);
				console.log(
					`[payment-cron] reconciled ${payment.id} -> COMPLETED (${status.trxID})`,
				);
			} else {
				await prisma.payment.update({
					where: { id: payment.id },
					data: { status: PaymentStatus.FAILED },
				});
				console.log(
					`[payment-cron] reconciled ${payment.id} -> FAILED`,
				);
			}
		} catch (error) {
			console.error(
				`[payment-cron] failed to reconcile ${payment.id}:`,
				error,
			);
		}
	}
};

let started = false;

export const startPaymentCron = () => {
	if (started) return;
	started = true;

	cron.schedule("* * * * *", async () => {
		try {
			await reconcileStrandedPayments();
		} catch (error) {
			console.error("[payment-cron] run failed:", error);
		}
	});

	console.log("[payment-cron] scheduled to run every minute");
};
