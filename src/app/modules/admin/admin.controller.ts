import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/enums";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminService } from "./admin.service";

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

export const adminController = {
	makeAdmin,
	blockUser,
	unblockUser,
	deleteUser,
};
