import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { leaseService } from "./lease.service";

const createLease = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await leaseService.createLease(user, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Lease created successfully",
		data: result,
	});
});

const listMyLeases = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await leaseService.listMyLeases(userId, req.query as any);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Leases fetched successfully",
		data: result,
	});
});

const listOwnerLeases = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await leaseService.listOwnerLeases(userId, req.query as any);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Leases fetched successfully",
		data: result,
	});
});

const getLeaseById = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const { id } = req.params;
	const result = await leaseService.getLeaseById(user, id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Lease fetched successfully",
		data: result,
	});
});

const terminateLease = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const { id } = req.params;
	const result = await leaseService.terminateLease(
		user,
		id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Lease terminated successfully",
		data: result,
	});
});

const completeLease = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const { id } = req.params;
	const result = await leaseService.completeLease(user, id as string, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Lease completed successfully",
		data: result,
	});
});

export const leaseController = {
	createLease,
	listMyLeases,
	listOwnerLeases,
	getLeaseById,
	terminateLease,
	completeLease,
};
