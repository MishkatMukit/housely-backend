import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/enums";
import type { IListOwnersQuery } from "../../Interfaces/owner.interface";
import type { IListTenantsQuery } from "../../Interfaces/tenant.interface";
import type { IListUsersQuery } from "../../Interfaces/user.interface";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminService } from "./admin.service";

const listUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.listUsers(req.query as IListUsersQuery);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users fetched successfully",
		data: result,
	});
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await adminService.getUserById(id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User fetched successfully",
		data: result,
	});
});

const makeAdmin = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;

	const result = await adminService.makeAdmin(id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User promoted to admin successfully",
		data: result,
	});
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const actor = { id: req.user?.id as string, role: req.user?.role as Role };

	const result = await adminService.blockUser(actor, id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User blocked successfully",
		data: result,
	});
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const actor = { id: req.user?.id as string, role: req.user?.role as Role };

	const result = await adminService.unblockUser(actor, id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User unblocked successfully",
		data: result,
	});
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const actor = { id: req.user?.id as string, role: req.user?.role as Role };

	const result = await adminService.deleteUser(actor, id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User deleted successfully",
		data: result,
	});
});

const listTenants = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.listTenants(req.query as IListTenantsQuery);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Tenants fetched successfully",
		data: result,
	});
});

const listOwners = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.listOwners(req.query as IListOwnersQuery);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owners fetched successfully",
		data: result,
	});
});

const viewOwnerApplications = catchAsync(
	async (req: Request, res: Response) => {
		const result = await adminService.viewOwnerApplications(
			req.query as IListOwnersQuery,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Owner applications fetched successfully",
			data: result,
		});
	},
);

const approveOwner = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const adminId = req.user?.id as string;

	const result = await adminService.approveOwner(id as string, adminId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owner approved successfully",
		data: result,
	});
});

const rejectOwner = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const adminId = req.user?.id as string;

	const result = await adminService.rejectOwner(
		id as string,
		adminId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owner rejected successfully",
		data: result,
	});
});

export const adminController = {
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
