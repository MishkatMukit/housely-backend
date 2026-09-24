import httpStatus from "http-status";
import { Role, UserStatus } from "../../../generated/prisma/enums";
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

export const adminService = {
	makeAdmin,
	blockUser,
	unblockUser,
	deleteUser,
};
