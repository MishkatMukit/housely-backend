import cron from "node-cron";
import {
	FlatStatus,
	LeaseStatus,
	PaymentStatus,
	PaymentType,
} from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { monthKey, monthPeriodsBetween } from "../utils/paymentPeriods";

// Activate leases whose startDate has arrived (future-start leases were
// seeded as PENDING at creation).
const activatePendingLeases = async () => {
	const now = new Date();
	const result = await prisma.lease.updateMany({
		where: { status: LeaseStatus.PENDING, startDate: { lte: now } },
		data: { status: LeaseStatus.ACTIVE },
	});
	if (result.count > 0) {
		console.log(`[lease-cron] activated ${result.count} pending lease(s)`);
	}
};

// Auto-complete leases whose endDate has passed, freeing the flat.
const completeExpiredLeases = async () => {
	const now = new Date();
	const expired = await prisma.lease.findMany({
		where: { status: LeaseStatus.ACTIVE, endDate: { lt: now } },
		select: { id: true, flatId: true },
	});

	for (const lease of expired) {
		try {
			await prisma.$transaction([
				prisma.lease.update({
					where: { id: lease.id },
					data: {
						status: LeaseStatus.COMPLETED,
						rejectionReason: "Completed: lease period ended",
					},
				}),
				prisma.flat.update({
					where: { id: lease.flatId },
					data: { status: FlatStatus.AVAILABLE },
				}),
				prisma.payment.updateMany({
					where: { leaseId: lease.id, status: PaymentStatus.PENDING },
					data: { status: PaymentStatus.FAILED },
				}),
			]);
			console.log(
				`[lease-cron] completed lease ${lease.id} and freed flat ${lease.flatId}`,
			);
		} catch (error) {
			console.error(
				`[lease-cron] failed to complete lease ${lease.id}:`,
				error,
			);
		}
	}
};

// Ensure every calendar month of an ACTIVE lease has a MONTHLY_RENT row.
// Rows are seeded at lease creation; this catch-up covers pre-existing leases
// and is idempotent via the (leaseId, type, periodStart) unique index.
const generateDueMonthlyPayments = async () => {
	const leases = await prisma.lease.findMany({
		where: { status: LeaseStatus.ACTIVE },
		select: {
			id: true,
			tenantId: true,
			ownerId: true,
			amount: true,
			startDate: true,
			endDate: true,
		},
	});

	for (const lease of leases) {
		const periods = monthPeriodsBetween(lease.startDate, lease.endDate);
		if (periods.length === 0) continue;

		const existing = await prisma.payment.findMany({
			where: {
				leaseId: lease.id,
				type: PaymentType.MONTHLY_RENT,
				periodStart: { not: null },
			},
			select: { periodStart: true },
		});
		const existingKeys = new Set(
			existing
				.map((p) => p.periodStart)
				.filter((v): v is Date => v !== null)
				.map((d) => monthKey(d)),
		);

		const missing = periods.filter(
			(period) => !existingKeys.has(monthKey(period.periodStart)),
		);
		if (missing.length === 0) continue;

		await prisma.payment.createMany({
			data: missing.map((period) => ({
				leaseId: lease.id,
				tenantId: lease.tenantId,
				ownerId: lease.ownerId,
				amount: lease.amount,
				type: PaymentType.MONTHLY_RENT,
				status: PaymentStatus.PENDING,
				periodStart: period.periodStart,
				periodEnd: period.periodEnd,
			})),
			skipDuplicates: true,
		});
		console.log(
			`[lease-cron] created ${missing.length} monthly payment(s) for lease ${lease.id}`,
		);
	}
};

let started = false;

export const startLeaseCron = () => {
	if (started) return;
	started = true;

	cron.schedule("* * * * *", async () => {
		try {
			await activatePendingLeases();
			await completeExpiredLeases();
			await generateDueMonthlyPayments();
		} catch (error) {
			console.error("[lease-cron] run failed:", error);
		}
	});

	console.log("[lease-cron] scheduled to run every minute");
};

export const leaseCronJobs = {
	generateDueMonthlyPayments,
};
