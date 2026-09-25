import httpStatus from "http-status";
import { PaymentStatus, PaymentType } from "../../../generated/prisma/enums";
import config from "../../config";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import { bkashPaymentClient } from "../../lib/bkash.client";
import { invoiceService } from "../../lib/invoice";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";

const callbackURL = () =>
	config.bkash_callback_url ||
	`${config.app_url}/api/payments/callback`;

const initiateCheckout = async (
	user: IRequestUser,
	paymentId: string,
) => {
	const tenant = await prisma.tenant.findUnique({ where: { userId: user.id } });
	if (!tenant)
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);

	const payment = await prisma.payment.findFirst({
		where: {
			id: paymentId,
			tenantId: tenant.id,
			status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
		},
	});

	if (!payment) {
		throw new AppError(
			"Payment not found or not payable by you",
			httpStatus.NOT_FOUND,
		);
	}

	// Only the in-progress month's rent can be paid; future months are
	// materialized by the cron as they come due.
	if (payment.type === PaymentType.MONTHLY_RENT && payment.periodStart) {
		const firstOfCurrentMonth = new Date(
			Date.UTC(
				new Date().getUTCFullYear(),
				new Date().getUTCMonth(),
				1,
			),
		);
		if (payment.periodStart > firstOfCurrentMonth) {
			throw new AppError(
				"This month's rent is not due yet",
				httpStatus.BAD_REQUEST,
			);
		}
	}

	const invoice = bkashPaymentClient.formatPaymentId(payment);

	const result = await bkashPaymentClient.createPayment({
		invoice,
		amount: payment.amount.toFixed(2),
		callbackURL: callbackURL(),
		payerReference: user.id,
	});

	// Reset to PENDING and clear any stale bKash reference so a previously
	// failed payment can be retried on a fresh checkout.
	await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: PaymentStatus.PENDING,
			bkashPaymentId: result.paymentID,
		},
	});

	return {
		paymentId: payment.id,
		bkashPaymentId: result.paymentID,
		bkashURL: result.bkashURL,
		invoice,
	};
};

const markFailed = async (paymentID: string) => {
	await prisma.payment
		.updateMany({
			where: { bkashPaymentId: paymentID },
			data: { status: PaymentStatus.FAILED },
		})
		.catch(() => undefined);
};

const handleCallback = async (
	query: Record<string, string>,
) => {
	const { paymentID, status } = query;

	if (!paymentID) {
		throw new AppError(
			"bKash payment ID is required",
			httpStatus.BAD_REQUEST,
		);
	}

	const payment = await prisma.payment.findFirst({
		where: { bkashPaymentId: paymentID },
	});

	if (!payment) {
		throw new AppError("Payment not found", httpStatus.NOT_FOUND);
	}

	const frontendRedirect = (outcome: string) =>
		`${config.frontend_url}/dashboard/payments?status=${outcome}`;

	// bKash may retry callbacks; a row already completed skips re-execution.
	if (payment.status === PaymentStatus.COMPLETED) {
		return { redirectUrl: frontendRedirect("success") };
	}

	if (status !== "success" && status !== "Completed") {
		await markFailed(paymentID);
		return { redirectUrl: frontendRedirect(status || "failure") };
	}

	const executed = await bkashPaymentClient.executePayment(paymentID);

	if (
		executed.transactionStatus !== "Completed" ||
		!executed.trxID
	) {
		await markFailed(paymentID);
		return { redirectUrl: frontendRedirect("failure") };
	}

	if (executed.amount !== payment.amount.toFixed(2)) {
		await markFailed(paymentID);
		throw new AppError(
			"bKash payment amount mismatch",
			httpStatus.BAD_REQUEST,
		);
	}

	const updated = await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: PaymentStatus.COMPLETED,
			bkashTransactionId: executed.trxID,
			paidAt: new Date(),
			paymentMethod: "bkash",
		},
	});

	// Send the tenant their PDF invoice; must never break the bKash redirect.
	void invoiceService.sendRentInvoiceMail(updated.id);

	return {
		redirectUrl: `${frontendRedirect("success")}&paymentId=${updated.id}&trxID=${executed.trxID}`,
	};
};

const verifyPayment = async (
	paymentID: string,
	fallbackStatus: string,
) => {
	const query = await bkashPaymentClient.queryPayment(paymentID);

	if (
		query.transactionStatus === "Completed" &&
		query.trxID
	) {
		const payment = await prisma.payment.findFirst({
			where: { bkashPaymentId: paymentID },
		});

		if (!payment) {
			throw new AppError("Payment not found", httpStatus.NOT_FOUND);
		}

		const updated = await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.COMPLETED,
				bkashTransactionId: query.trxID,
				paidAt: new Date(),
				paymentMethod: "bkash",
			},
		});

		void invoiceService.sendRentInvoiceMail(updated.id);

		return {
			paymentId: updated.id,
			status: "COMPLETED",
			trxID: query.trxID,
		};
	}

	if (
		query.transactionStatus === "Failed" ||
		fallbackStatus === "failure"
	) {
		await markFailed(paymentID);
	}

	return {
		paymentId: null,
		status: query.transactionStatus,
		trxID: query.trxID,
	};
};

const listMyPayments = async (
	user: IRequestUser,
	query: Record<string, unknown>,
) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const tenant = await prisma.tenant.findUnique({ where: { userId: user.id } });
	if (!tenant)
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);

	const where: Record<string, unknown> = {
		tenantId: tenant.id,
		...(query.type ? { type: query.type } : {}),
		...(query.status ? { status: query.status } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.payment.findMany({ where, skip, take: limit, orderBy: { createdAt: "asc" } }),
		prisma.payment.count({ where }),
	]);

	return { meta: { page, limit, total }, data };
};

const listOwnerPayments = async (
	user: IRequestUser,
	query: Record<string, unknown>,
) => {
	const page = Number(query.page) || 1;
	const limit = Number(query.limit) || 10;
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = {
		...(query.type ? { type: query.type } : {}),
		...(query.status ? { status: query.status } : {}),
	};

	if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
		const owner = await prisma.owner.findUnique({
			where: { userId: user.id },
		});
		if (!owner)
			throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);
		where.ownerId = owner.id;
	}

	const [data, total] = await Promise.all([
		prisma.payment.findMany({ where, skip, take: limit, orderBy: { createdAt: "asc" } }),
		prisma.payment.count({ where }),
	]);

	return { meta: { page, limit, total }, data };
};

export const paymentService = {
	initiateCheckout,
	handleCallback,
	verifyPayment,
	listMyPayments,
	listOwnerPayments,
};
