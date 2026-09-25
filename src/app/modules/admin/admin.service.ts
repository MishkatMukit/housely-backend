import ejs from "ejs";
import httpStatus from "http-status";
import path from "path";
import type { Prisma } from "../../../generated/prisma/client";
import {
	OwnerStatus,
	Role,
	TenantStatus,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import type {
	IListOwnersQuery,
	IRejectOwnerPayload,
} from "../../Interfaces/owner.interface";
import type { IListTenantsQuery } from "../../Interfaces/tenant.interface";
import type {
	IListUsersQuery,
	IListUsersResponse,
} from "../../Interfaces/user.interface";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";

type IAdminActor = {
	id: string;
	role: Role;
};

const assertCanManage = async (actor: IAdminActor, targetId: string) => {
	const target = await prisma.user.findUnique({
		where: { id: targetId },
	});

	if (!target) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	if (target.isDeleted || target.status === UserStatus.DELETED) {
		throw new AppError("User is already deleted", httpStatus.CONFLICT);
	}

	if (actor.id === target.id) {
		throw new AppError(
			"You cannot perform this action on your own account",
			httpStatus.FORBIDDEN,
		);
	}

	const targetIsStaff =
		target.role === Role.ADMIN || target.role === Role.SUPERADMIN;

	if (actor.role === Role.ADMIN && targetIsStaff) {
		throw new AppError(
			"Admins cannot manage other admins",
			httpStatus.FORBIDDEN,
		);
	}

	if (actor.role === Role.SUPERADMIN && target.role === Role.SUPERADMIN) {
		throw new AppError(
			"Superadmins cannot manage another superadmin",
			httpStatus.FORBIDDEN,
		);
	}

	return target;
};

const makeAdmin = async (targetId: string) => {
	const target = await prisma.user.findUnique({
		where: { id: targetId },
	});

	if (!target) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	if (target.isDeleted || target.status === UserStatus.DELETED) {
		throw new AppError("User is already deleted", httpStatus.CONFLICT);
	}

	if (target.status === UserStatus.BLOCKED) {
		throw new AppError("Blocked users cannot be promoted", httpStatus.CONFLICT);
	}

	if (target.role === Role.ADMIN || target.role === Role.SUPERADMIN) {
		throw new AppError("User is already an admin", httpStatus.CONFLICT);
	}

	const updatedUser = await prisma.user.update({
		where: { id: targetId },
		data: {
			role: Role.ADMIN,
		},
		omit: {
			password: true,
		},
	});

	return updatedUser;
};

const listUsers = async (
	query: IListUsersQuery,
): Promise<IListUsersResponse> => {
	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		isDeleted: false,
	};

	if (query.status) {
		whereCondition.status = query.status;
	}

	if (query.role) {
		whereCondition.role = query.role;
	}

	if (query.search) {
		whereCondition.OR = [
			{ email: { contains: query.search, mode: "insensitive" } },
			{ name: { contains: query.search, mode: "insensitive" } },
		];
	}

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where: whereCondition,
			skip,
			take: limit,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				status: true,
				emailVerified: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.user.count({ where: whereCondition }),
	]);

	return {
		data: users,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	};
};

const getUserById = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		omit: {
			password: true,
		},
		include: {
			tenant: true,
			owner: true,
		},
	});

	if (!user) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	return user;
};

const blockUser = async (actor: IAdminActor, targetId: string) => {
	const target = await assertCanManage(actor, targetId);

	if (target.status === UserStatus.BLOCKED) {
		throw new AppError("User Is Already Blocked", httpStatus.CONFLICT);
	}

	const updatedUser = await prisma.user.update({
		where: { id: targetId },
		data: {
			status: UserStatus.BLOCKED,
		},
		omit: {
			password: true,
		},
	});

	return updatedUser;
};

const unblockUser = async (actor: IAdminActor, targetId: string) => {
	const target = await assertCanManage(actor, targetId);

	if (target.status !== UserStatus.BLOCKED) {
		throw new AppError("User Is Not Blocked", httpStatus.CONFLICT);
	}

	const updatedUser = await prisma.user.update({
		where: { id: targetId },
		data: {
			status: UserStatus.ACTIVE,
		},
		omit: {
			password: true,
		},
	});

	return updatedUser;
};

const deleteUser = async (actor: IAdminActor, targetId: string) => {
	await assertCanManage(actor, targetId);

	await prisma.user.update({
		where: { id: targetId },
		data: {
			status: UserStatus.DELETED,
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	return {
		id: targetId,
		message: "User Deleted Successfully",
	};
};

const listTenants = async (query: IListTenantsQuery) => {
	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {};

	if (query.status) {
		whereCondition.status = query.status;
	}

	if (query.search) {
		whereCondition.OR = [
			{ name: { contains: query.search, mode: "insensitive" } },
			{ email: { contains: query.search, mode: "insensitive" } },
			{ contactNumber: { contains: query.search, mode: "insensitive" } },
			{ user: { name: { contains: query.search, mode: "insensitive" } } },
			{ user: { email: { contains: query.search, mode: "insensitive" } } },
		];
	}

	const [tenants, total] = await Promise.all([
		prisma.tenant.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: { user: { omit: { password: true } } },
			orderBy: { createdAt: "desc" },
		}),
		prisma.tenant.count({ where: whereCondition }),
	]);

	return {
		data: tenants,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	};
};

const listOwners = async (query: IListOwnersQuery) => {
	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {};

	if (query.status) {
		whereCondition.status = query.status;
	}

	if (query.search) {
		whereCondition.OR = [
			{ user: { name: { contains: query.search, mode: "insensitive" } } },
			{ user: { email: { contains: query.search, mode: "insensitive" } } },
		];
	}

	const [owners, total] = await Promise.all([
		prisma.owner.findMany({
			where: whereCondition,
			skip,
			take: limit,
			include: { user: { omit: { password: true } } },
			orderBy: { createdAt: "desc" },
		}),
		prisma.owner.count({ where: whereCondition }),
	]);

	return {
		data: owners,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	};
};

// Admin queue of owner applications. Defaults to PENDING so the
// endpoint serves as the review inbox; pass status explicitly for
// APPROVED / REJECTED history. Shaped as applications (applicant +
// documents + review info), unlike listOwners which is a directory.
const viewOwnerApplications = async (query: IListOwnersQuery) => {
	const page = query.page || 1;
	const limit = query.limit || 10;
	const skip = (page - 1) * limit;

	const whereCondition: Record<string, unknown> = {
		status: query.status ?? OwnerStatus.PENDING,
	};

	if (query.search) {
		whereCondition.OR = [
			{ user: { name: { contains: query.search, mode: "insensitive" } } },
			{ user: { email: { contains: query.search, mode: "insensitive" } } },
			{ contactNumber: { contains: query.search, mode: "insensitive" } },
		];
	}

	const [applications, total] = await Promise.all([
		prisma.owner.findMany({
			where: whereCondition,
			skip,
			take: limit,
			select: {
				id: true,
				status: true,
				contactNumber: true,
				verificationDocuments: true,
				rejectionReason: true,
				rejectionHistory: true,
				reviewedBy: true,
				reviewedAt: true,
				createdAt: true,
				updatedAt: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						emailVerified: true,
						address: true,
						nationalIdNumber: true,
						imageUrl: true,
						createdAt: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.owner.count({ where: whereCondition }),
	]);

	return {
		data: applications,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	};
};

const approveOwner = async (ownerId: string, adminId: string) => {
	const owner = await prisma.owner.findUnique({
		where: { id: ownerId },
	});

	if (!owner) {
		throw new AppError("Owner Not Found", httpStatus.NOT_FOUND);
	}

	if (owner.status === OwnerStatus.APPROVED) {
		throw new AppError("Owner Is Already Approved", httpStatus.CONFLICT);
	}

	if (owner.status === OwnerStatus.REJECTED) {
		throw new AppError(
			"Rejected applications cannot be approved. Ask the user to resubmit.",
			httpStatus.CONFLICT,
		);
	}

	const [updatedOwner] = await prisma.$transaction([
		prisma.owner.update({
			where: { id: ownerId },
			data: {
				status: OwnerStatus.APPROVED,
				reviewedBy: adminId,
				reviewedAt: new Date(),
			},
			include: { user: { omit: { password: true } } },
		}),
		// Flip user role to OWNER
		prisma.user.update({
			where: { id: owner.userId },
			data: { role: Role.OWNER },
		}),
		// Set tenant to INACTIVE
		prisma.tenant.updateMany({
			where: { userId: owner.userId },
			data: { status: TenantStatus.INACTIVE },
		}),
	]);

	const ownerUser = updatedOwner.user;
	if (ownerUser?.email) {
		await sendOwnerWelcomeMail(ownerUser.name, ownerUser.email);
	}

	return updatedOwner;
};

const sendOwnerWelcomeMail = async (name: string, email: string) => {
	try {
		const templatePath = path.join(
			process.cwd(),
			"src",
			"app",
			"templates",
			"welcome-owner.ejs",
		);
		const dashboardUrl = config.app_url
			? `${config.app_url}/dashboard/owner`
			: undefined;
		const html = await ejs.renderFile(templatePath, {
			name,
			email,
			dashboardUrl,
		});
		await transporter.sendMail({
			from: config.email_sender,
			to: email,
			subject: "Welcome to Housely — Your Owner Account Is Approved",
			html,
		});
	} catch (error) {
		console.error("Failed to send owner welcome email:", error);
	}
};

const rejectOwner = async (
	ownerId: string,
	adminId: string,
	payload: IRejectOwnerPayload,
) => {
	const owner = await prisma.owner.findUnique({
		where: { id: ownerId },
	});

	if (!owner) {
		throw new AppError("Owner Not Found", httpStatus.NOT_FOUND);
	}

	if (owner.status === OwnerStatus.REJECTED) {
		throw new AppError("Owner Is Already Rejected", httpStatus.CONFLICT);
	}

	if (owner.status === OwnerStatus.APPROVED) {
		throw new AppError(
			"Approved owners cannot be rejected",
			httpStatus.CONFLICT,
		);
	}

	const rejectedAt = new Date();
	const history = Array.isArray(owner.rejectionHistory)
		? (JSON.parse(JSON.stringify(owner.rejectionHistory)) as Record<
				string,
				unknown
			>[])
		: ([] as Record<string, unknown>[]);
	history.push({
		reason: payload.rejectionReason,
		rejectedBy: adminId,
		rejectedAt: rejectedAt.toISOString(),
	});

	const updatedOwner = await prisma.owner.update({
		where: { id: ownerId },
		data: {
			status: OwnerStatus.REJECTED,
			rejectionReason: payload.rejectionReason,
			rejectionHistory: history as unknown as Prisma.InputJsonValue,
			reviewedBy: adminId,
			reviewedAt: rejectedAt,
		},
		include: { user: { omit: { password: true } } },
	});

	const rejectedUser = updatedOwner.user;
	if (rejectedUser?.email) {
		try {
			const templatePath = path.join(
				process.cwd(),
				"src",
				"app",
				"templates",
				"application-rejected.ejs",
			);
			const html = await ejs.renderFile(templatePath, {
				name: rejectedUser.name,
				reason: payload.rejectionReason,
			});
			await transporter.sendMail({
				from: config.email_sender,
				to: rejectedUser.email,
				subject: "Update on Your Housely Owner Application",
				html,
			});
		} catch (error) {
			console.error("Failed to send owner rejection email:", error);
		}
	}

	return updatedOwner;
};

export const adminService = {
	makeAdmin,
	listUsers,
	getUserById,
	blockUser,
	unblockUser,
	deleteUser,
	listTenants,
	listOwners,
	viewOwnerApplications,
	approveOwner,
	rejectOwner,
};
