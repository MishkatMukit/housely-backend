import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import {
	ApplicationStatus,
	FlatStatus,
	LeaseStatus,
	PaymentStatus,
	PaymentType,
} from "../../../generated/prisma/enums";
import config from "../../config";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import type {
	ICreateLeasePayload,
	IListLeasesQuery,
	ITerminateLeasePayload,
} from "../../Interfaces/lease.interface";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import {
	monthPeriodsBetween,
	normalizeToFirstOfMonth,
} from "../../utils/paymentPeriods";

const isAdmin = (user: IRequestUser) =>
	user.role === "ADMIN" || user.role === "SUPERADMIN";

const LEASE_INCLUDES = {
	flat: {
		include: {
			variant: true,
			property: {
				select: {
					id: true,
					title: true,
					address: true,
					city: true,
					district: true,
				},
			},
		},
	},
	tenant: { include: { user: { omit: { password: true } } } },
	payments: { orderBy: { createdAt: "desc" } },
} as const;

const createLease = async (
	user: IRequestUser,
	payload: ICreateLeasePayload,
) => {
	const tenant = await prisma.tenant.findUnique({
		where: { id: payload.tenantId },
		include: { user: { omit: { password: true } } },
	});
	if (!tenant) throw new AppError("Tenant Not Found", httpStatus.NOT_FOUND);

	const flat = await prisma.flat.findUnique({
		where: { id: payload.flatId },
		include: { variant: true, property: { include: { owner: true } } },
	});
	if (!flat) throw new AppError("Flat Not Found", httpStatus.NOT_FOUND);

	if (!isAdmin(user) && flat.property.owner.userId !== user.id) {
		throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
	}

	const approvedApplication = await prisma.application.findFirst({
		where: {
			flatId: payload.flatId,
			tenantId: tenant.id,
			status: ApplicationStatus.APPROVED,
		},
	});
	if (!approvedApplication) {
		throw new AppError(
			"Tenant does not have an approved application for this flat",
			httpStatus.BAD_REQUEST,
		);
	}

	const existingNonTerminal = await prisma.lease.findFirst({
		where: {
			flatId: payload.flatId,
			status: {
				in: [LeaseStatus.PENDING, LeaseStatus.ACTIVE, LeaseStatus.INACTIVE],
			},
		},
	});
	if (existingNonTerminal) {
		throw new AppError(
			"This flat already has an active lease",
			httpStatus.CONFLICT,
		);
	}

	const ownerId = flat.property.owner.id;
	const amount = payload.amount ?? flat.variant.rentAmount;
	const advanceAmount = flat.variant.advanceAmount;
	const startDate = normalizeToFirstOfMonth(payload.startDate);
	const endDate = new Date(payload.endDate);
	const status =
		new Date(startDate) <= new Date()
			? LeaseStatus.ACTIVE
			: LeaseStatus.PENDING;

	const lease = await prisma.$transaction(async (tx) => {
		const currentFlat = await tx.flat.findUnique({
			where: { id: flat.id },
			select: { status: true },
		});
		if (!currentFlat || currentFlat.status !== FlatStatus.AVAILABLE) {
			throw new AppError(
				"Flat is not available for lease",
				httpStatus.CONFLICT,
			);
		}

		const created = await tx.lease.create({
			data: {
				tenantId: tenant.id,
				ownerId,
				flatId: flat.id,
				amount,
				startDate,
				endDate,
				status,
			},
		});

		await tx.flat.update({
			where: { id: flat.id },
			data: { status: FlatStatus.OCCUPIED },
		});

		// Seed the advance payment row for the payments module
		await tx.payment.create({
			data: {
				leaseId: created.id,
				tenantId: tenant.id,
				ownerId,
				amount: advanceAmount,
				type: PaymentType.ADVANCE,
				status: PaymentStatus.PENDING,
			},
		});

		// Seed the first MONTHLY_RENT row (the lease's first calendar month)
		// only once that month has begun. Subsequent months are materialized
		// by the lease cron as they come due.
		if (new Date(startDate) <= new Date()) {
			const firstPeriod = monthPeriodsBetween(startDate, startDate)[0];
			if (!firstPeriod) return created;
			await tx.payment.create({
				data: {
					leaseId: created.id,
					tenantId: tenant.id,
					ownerId,
					amount,
					type: PaymentType.MONTHLY_RENT,
					status: PaymentStatus.PENDING,
					periodStart: firstPeriod.periodStart,
					periodEnd: firstPeriod.periodEnd,
				},
			});
		}

		return created;
	});

	const result = await prisma.lease.findUnique({
		where: { id: lease.id },
		include: LEASE_INCLUDES,
	});

	const tenantUser = tenant.user;
	if (tenantUser?.email) {
		await sendLeaseMail(
			tenantUser.name,
			tenantUser.email,
			"created",
			`Your lease for ${flat.property.title} (flat ${flat.flatNumber}) starts on ${startDate.toDateString()}.`,
		);
	}

	return result;
};

const listMyLeases = async (userId: string, query: IListLeasesQuery) => {
	const tenant = await prisma.tenant.findUnique({ where: { userId } });
	if (!tenant)
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);

	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		tenantId: tenant.id,
		...(query.status ? { status: query.status } : {}),
		...(query.propertyId ? { flat: { propertyId: query.propertyId } } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.lease.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: LEASE_INCLUDES,
			orderBy: { createdAt: "desc" },
		}),
		prisma.lease.count({ where: whereCondition }),
	]);

	return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const listOwnerLeases = async (userId: string, query: IListLeasesQuery) => {
	const owner = await prisma.owner.findUnique({ where: { userId } });
	if (!owner)
		throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);

	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		ownerId: owner.id,
		...(query.status ? { status: query.status } : {}),
		...(query.propertyId ? { flat: { propertyId: query.propertyId } } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.lease.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: LEASE_INCLUDES,
			orderBy: { createdAt: "desc" },
		}),
		prisma.lease.count({ where: whereCondition }),
	]);

	return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getLeaseById = async (user: IRequestUser, leaseId: string) => {
	const lease = await prisma.lease.findUnique({
		where: { id: leaseId },
		include: {
			flat: {
				include: { variant: true, property: { include: { owner: true } } },
			},
			tenant: { include: { user: { omit: { password: true } } } },
			payments: { orderBy: { createdAt: "desc" } },
		},
	});
	if (!lease) throw new AppError("Lease Not Found", httpStatus.NOT_FOUND);

	const allowed =
		isAdmin(user) ||
		lease.tenant.userId === user.id ||
		lease.flat.property.owner.userId === user.id;
	if (!allowed) throw new AppError("Lease Not Found", httpStatus.NOT_FOUND);

	return lease;
};

const terminateLease = async (
	user: IRequestUser,
	leaseId: string,
	payload: ITerminateLeasePayload,
) => {
	const lease = await prisma.lease.findUnique({
		where: { id: leaseId },
		include: {
			flat: { include: { property: { include: { owner: true } } } },
			tenant: { include: { user: { omit: { password: true } } } },
		},
	});
	if (!lease) throw new AppError("Lease Not Found", httpStatus.NOT_FOUND);

	if (!isAdmin(user) && lease.flat.property.owner.userId !== user.id) {
		throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
	}

	if (
		lease.status !== LeaseStatus.PENDING &&
		lease.status !== LeaseStatus.ACTIVE
	) {
		throw new AppError(
			"Only pending or active leases can be terminated",
			httpStatus.CONFLICT,
		);
	}

	const terminated = await prisma.$transaction(async (tx) => {
		const updated = await tx.lease.update({
			where: { id: leaseId },
			data: {
				status: LeaseStatus.TERMINATED,
				rejectionReason: payload.rejectionReason?.trim() || null,
			},
		});
		await tx.flat.update({
			where: { id: lease.flatId },
			data: { status: FlatStatus.AVAILABLE },
		});
		await tx.payment.updateMany({
			where: { leaseId, status: PaymentStatus.PENDING },
			data: { status: PaymentStatus.FAILED },
		});
		return updated;
	});

	const tenantUser = lease.tenant.user;
	if (tenantUser?.email) {
		await sendLeaseMail(
			tenantUser.name,
			tenantUser.email,
			"terminated",
			payload.rejectionReason?.trim() ||
				"Your lease was terminated by the property owner.",
		);
	}

	return terminated;
};

const sendLeaseMail = async (
	name: string,
	email: string,
	outcome: "created" | "terminated",
	detail: string,
) => {
	try {
		const templatePath = path.join(
			process.cwd(),
			"src",
			"app",
			"templates",
			outcome === "created" ? "lease-created.ejs" : "lease-finished.ejs",
		);
		const html = await ejs.renderFile(templatePath, { name, reason: detail });
		await transporter.sendMail({
			from: config.email_sender,
			to: email,
			subject:
				outcome === "created"
					? "Housely — Your Lease Has Been Created"
					: "Housely — Your Lease Was Terminated",
			html,
		});
	} catch (error) {
		console.error("Failed to send lease email:", error);
	}
};

export const leaseService = {
	createLease,
	listMyLeases,
	listOwnerLeases,
	getLeaseById,
	terminateLease,
};
