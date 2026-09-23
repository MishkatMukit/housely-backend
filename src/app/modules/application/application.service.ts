import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import {
	ApplicationStatus,
	FlatStatus,
	LeaseStatus,
	TenantStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import type {
	IApplyForFlatPayload,
	IListApplicationsQuery,
	IRejectApplicationPayload,
} from "../../Interfaces/application.interface";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";

const assertOwnerProperty = async (userId: string, propertyId: string) => {
	const property = await prisma.property.findUnique({
		where: { id: propertyId },
		include: { owner: { select: { userId: true } } },
	});
	if (!property) throw new AppError("Property Not Found", httpStatus.NOT_FOUND);
	if (property.owner.userId !== userId) {
		throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
	}
	return property;
};

const resolveActiveTenant = async (userId: string) => {
	const tenant = await prisma.tenant.findUnique({ where: { userId } });
	if (!tenant)
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);
	if (tenant.status !== TenantStatus.ACTIVE) {
		throw new AppError(
			"Only active tenants can perform this action",
			httpStatus.FORBIDDEN,
		);
	}
	return tenant;
};

const FRIENDLY_INCLUDES = {
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
					images: true,
				},
			},
		},
	},
	tenant: { include: { user: { omit: { password: true } } } },
} as const;

const applyForFlat = async (userId: string, payload: IApplyForFlatPayload) => {
	const tenant = await resolveActiveTenant(userId);

	const flat = await prisma.flat.findUnique({ where: { id: payload.flatId } });
	if (!flat) throw new AppError("Flat Not Found", httpStatus.NOT_FOUND);
	if (flat.status !== FlatStatus.AVAILABLE) {
		throw new AppError(
			"This flat is not available for application",
			httpStatus.CONFLICT,
		);
	}

	const existingPending = await prisma.application.findFirst({
		where: {
			tenantId: tenant.id,
			flatId: payload.flatId,
			status: ApplicationStatus.PENDING,
		},
	});
	if (existingPending) {
		throw new AppError(
			"You already have a pending application for this flat",
			httpStatus.CONFLICT,
		);
	}

	const existingApproved = await prisma.application.findFirst({
		where: {
			tenantId: tenant.id,
			flatId: payload.flatId,
			status: ApplicationStatus.APPROVED,
		},
	});
	if (existingApproved) {
		throw new AppError(
			"You already have an approved application for this flat",
			httpStatus.CONFLICT,
		);
	}

	const activeLease = await prisma.lease.findFirst({
		where: {
			flatId: payload.flatId,
			status: { in: [LeaseStatus.PENDING, LeaseStatus.ACTIVE] },
		},
	});
	if (activeLease)
		throw new AppError(
			"This flat already has an active lease",
			httpStatus.CONFLICT,
		);

	const application = await prisma.application.create({
		data: {
			tenant: { connect: { id: tenant.id } },
			flat: { connect: { id: payload.flatId } },
			...(payload.monthlyIncome !== undefined
				? { monthlyIncome: payload.monthlyIncome }
				: {}),
			employment: payload.employment?.trim() || null,
			message: payload.message?.trim() || null,
		},
		include: FRIENDLY_INCLUDES,
	});

	return application;
};

const listMyApplications = async (
	userId: string,
	query: IListApplicationsQuery,
) => {
	const tenant = await prisma.tenant.findUnique({ where: { userId } });
	if (!tenant)
		throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);

	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		tenantId: tenant.id,
		...(query.status ? { status: query.status } : {}),
		...(query.flatId ? { flatId: query.flatId } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.application.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: FRIENDLY_INCLUDES,
			orderBy: { createdAt: "desc" },
		}),
		prisma.application.count({ where: whereCondition }),
	]);

	return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const withdrawApplication = async (userId: string, applicationId: string) => {
	const application = await prisma.application.findUnique({
		where: { id: applicationId },
		include: { tenant: true },
	});
	if (!application || application.tenant.userId !== userId) {
		throw new AppError("Application Not Found", httpStatus.NOT_FOUND);
	}

	if (application.status !== ApplicationStatus.PENDING) {
		throw new AppError(
			application.status === ApplicationStatus.APPROVED
				? "Approved applications cannot be withdrawn. Contact the property owner directly."
				: "Only pending applications can be withdrawn",
			httpStatus.CONFLICT,
		);
	}

	return prisma.application.update({
		where: { id: applicationId },
		data: { status: ApplicationStatus.WITHDRAWN },
		include: FRIENDLY_INCLUDES,
	});
};

const listPropertyApplications = async (
	userId: string,
	propertyId: string,
	query: IListApplicationsQuery,
) => {
	await assertOwnerProperty(userId, propertyId);

	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		flat: { propertyId },
		status: query.status ?? ApplicationStatus.PENDING,
		...(query.flatId ? { flatId: query.flatId } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.application.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: FRIENDLY_INCLUDES,
			orderBy: { createdAt: "desc" },
		}),
		prisma.application.count({ where: whereCondition }),
	]);

	return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getApplicationById = async (
	user: IRequestUser,
	applicationId: string,
) => {
	const application = await prisma.application.findUnique({
		where: { id: applicationId },
		include: {
			flat: {
				include: { variant: true, property: { include: { owner: true } } },
			},
			tenant: { include: { user: { omit: { password: true } } } },
		},
	});
	if (!application)
		throw new AppError("Application Not Found", httpStatus.NOT_FOUND);

	if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
		if (
			application.tenant.userId !== user.id &&
			application.flat.property.owner.userId !== user.id
		) {
			throw new AppError("Application Not Found", httpStatus.NOT_FOUND);
		}
	}

	return application;
};

const approveApplication = async (userId: string, applicationId: string) => {
	const application = await prisma.application.findUnique({
		where: { id: applicationId },
		include: {
			flat: { include: { property: { include: { owner: true } } } },
			tenant: { include: { user: { omit: { password: true } } } },
		},
	});
	if (!application)
		throw new AppError("Application Not Found", httpStatus.NOT_FOUND);
	if (application.flat.property.owner.userId !== userId) {
		throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
	}
	if (application.status !== ApplicationStatus.PENDING) {
		throw new AppError(
			"Only pending applications can be approved",
			httpStatus.CONFLICT,
		);
	}

	const [approved] = await prisma.$transaction([
		prisma.application.update({
			where: { id: applicationId },
			data: { status: ApplicationStatus.APPROVED },
			include: FRIENDLY_INCLUDES,
		}),
		// Auto-reject the rest of the queue for the same flat (no double-booking)
		prisma.application.updateMany({
			where: {
				id: { not: applicationId },
				flatId: application.flatId,
				status: ApplicationStatus.PENDING,
			},
			data: {
				status: ApplicationStatus.REJECTED,
				rejectionReason:
					"Auto-rejected: another application was approved for this flat",
			},
		}),
	]);

	const user = application.tenant.user;
	if (user?.email) {
		await sendApplicationDecidedMail(
			user.name,
			user.email,
			"approved",
			`Congratulations! Your application for ${application.flat.property.title} has been approved.`,
		);
	}

	return approved;
};

const rejectApplication = async (
	userId: string,
	applicationId: string,
	payload: IRejectApplicationPayload,
) => {
	const application = await prisma.application.findUnique({
		where: { id: applicationId },
		include: {
			flat: { include: { property: { include: { owner: true } } } },
			tenant: { include: { user: { omit: { password: true } } } },
		},
	});
	if (!application)
		throw new AppError("Application Not Found", httpStatus.NOT_FOUND);
	if (application.flat.property.owner.userId !== userId) {
		throw new AppError("Forbidden: not your property", httpStatus.FORBIDDEN);
	}
	if (application.status !== ApplicationStatus.PENDING) {
		throw new AppError(
			"Only pending applications can be rejected",
			httpStatus.CONFLICT,
		);
	}

	const rejected = await prisma.application.update({
		where: { id: applicationId },
		data: {
			status: ApplicationStatus.REJECTED,
			rejectionReason: payload.rejectionReason.trim(),
		},
		include: FRIENDLY_INCLUDES,
	});

	const user = application.tenant.user;
	if (user?.email) {
		await sendApplicationDecidedMail(
			user.name,
			user.email,
			"rejected",
			payload.rejectionReason.trim(),
		);
	}

	return rejected;
};

const sendApplicationDecidedMail = async (
	name: string,
	email: string,
	outcome: "approved" | "rejected",
	detail: string,
) => {
	try {
		const templatePath = path.join(
			process.cwd(),
			"src",
			"app",
			"templates",
			outcome === "approved"
				? "application-approved.ejs"
				: "application-rejected.ejs",
		);
		const html = await ejs.renderFile(templatePath, { name, reason: detail });
		await transporter.sendMail({
			from: config.email_sender,
			to: email,
			subject:
				outcome === "approved"
					? "Housely — Your Application Was Approved"
					: "Housely — Update on Your Application",
			html,
		});
	} catch (error) {
		console.error("Failed to send application decision email:", error);
	}
};

export const applicationService = {
	applyForFlat,
	listMyApplications,
	withdrawApplication,
	listPropertyApplications,
	getApplicationById,
	approveApplication,
	rejectApplication,
};
