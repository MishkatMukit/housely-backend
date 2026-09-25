import httpStatus from "http-status";
import {
	ApplicationStatus,
	FlatStatus,
	LeaseStatus,
	OwnerStatus,
	PaymentStatus,
} from "../../../generated/prisma/enums";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";

const getAdminAnalytics = async () => {
	const totalOwners = await prisma.owner.count();

	const totalPendingOwnerApplications = await prisma.owner.count({
		where: { status: OwnerStatus.PENDING },
	});

	const totalApprovedOwners = await prisma.owner.count({
		where: { status: OwnerStatus.APPROVED },
	});

	const totalRejectedOwners = await prisma.owner.count({
		where: { status: OwnerStatus.REJECTED },
	});

	const totalTenants = await prisma.tenant.count();

	const totalProperties = await prisma.property.count();

	const totalFlats = await prisma.flat.count();

	const availableFlats = await prisma.flat.count({
		where: { status: FlatStatus.AVAILABLE },
	});

	const totalActiveLeases = await prisma.lease.count({
		where: { status: LeaseStatus.ACTIVE },
	});

	const totalApplications = await prisma.application.count();

	const totalRevenueResult = await prisma.payment.aggregate({
		where: { status: PaymentStatus.COMPLETED },
		_sum: { amount: true },
	});

	const totalRevenue = totalRevenueResult._sum.amount?.toNumber() || 0;

	return {
		totalOwners,
		totalPendingOwnerApplications,
		totalApprovedOwners,
		totalRejectedOwners,
		totalTenants,
		totalProperties,
		totalFlats,
		availableFlats,
		totalActiveLeases,
		totalApplications,
		totalRevenue,
	};
};

const getOwnerAnalytics = async (user: IRequestUser) => {
	const owner = await prisma.owner.findUnique({
		where: { userId: user.id },
	});

	if (!owner) {
		throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);
	}

	const totalProperties = await prisma.property.count({
		where: { ownerId: owner.id },
	});

	const totalFlats = await prisma.flat.count({
		where: { property: { ownerId: owner.id } },
	});

	const availableFlats = await prisma.flat.count({
		where: {
			property: { ownerId: owner.id },
			status: FlatStatus.AVAILABLE,
		},
	});

	const totalApplications = await prisma.application.count({
		where: { flat: { property: { ownerId: owner.id } } },
	});

	const totalActiveLeases = await prisma.lease.count({
		where: { ownerId: owner.id, status: LeaseStatus.ACTIVE },
	});

	const totalEarningsResult = await prisma.payment.aggregate({
		where: { ownerId: owner.id, status: PaymentStatus.COMPLETED },
		_sum: { amount: true },
	});

	const totalEarnings = totalEarningsResult._sum.amount?.toNumber() || 0;

	const pendingPayments = await prisma.payment.count({
		where: { ownerId: owner.id, status: PaymentStatus.PENDING },
	});

	return {
		totalProperties,
		totalFlats,
		availableFlats,
		totalApplications,
		totalActiveLeases,
		totalEarnings,
		pendingPayments,
	};
};

const getTenantAnalytics = async (user: IRequestUser) => {
	const tenant = await prisma.tenant.findUnique({
		where: { userId: user.id },
	});

	if (!tenant) {
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);
	}

	const totalApplications = await prisma.application.count({
		where: { tenantId: tenant.id },
	});

	const totalApprovedApplications = await prisma.application.count({
		where: {
			tenantId: tenant.id,
			status: ApplicationStatus.APPROVED,
		},
	});

	const totalRejectedApplications = await prisma.application.count({
		where: {
			tenantId: tenant.id,
			status: ApplicationStatus.REJECTED,
		},
	});

	const totalActiveLeases = await prisma.lease.count({
		where: { tenantId: tenant.id, status: LeaseStatus.ACTIVE },
	});

	const totalCompletedPayments = await prisma.payment.count({
		where: { tenantId: tenant.id, status: PaymentStatus.COMPLETED },
	});

	const totalPendingPayments = await prisma.payment.count({
		where: { tenantId: tenant.id, status: PaymentStatus.PENDING },
	});

	const totalSpentResult = await prisma.payment.aggregate({
		where: { tenantId: tenant.id, status: PaymentStatus.COMPLETED },
		_sum: { amount: true },
	});

	const totalSpent = totalSpentResult._sum.amount?.toNumber() || 0;

	return {
		totalApplications,
		totalApprovedApplications,
		totalRejectedApplications,
		totalActiveLeases,
		totalCompletedPayments,
		totalPendingPayments,
		totalSpent,
	};
};

export const analyticsService = {
	getAdminAnalytics,
	getOwnerAnalytics,
	getTenantAnalytics,
};