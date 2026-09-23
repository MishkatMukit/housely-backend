import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { applicationService } from "./application.service";

const applyForFlat = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await applicationService.applyForFlat(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Application submitted successfully",
		data: result,
	});
});

const listMyApplications = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await applicationService.listMyApplications(
		userId,
		req.query as any,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Applications fetched successfully",
		data: result,
	});
});

const withdrawApplication = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const { id } = req.params;
	const result = await applicationService.withdrawApplication(
		userId,
		id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application withdrawn successfully",
		data: result,
	});
});

const listPropertyApplications = catchAsync(
	async (req: Request, res: Response) => {
		const userId = req.user?.id as string;
		const { propertyId } = req.params;
		const result = await applicationService.listPropertyApplications(
			userId,
			propertyId as string,
			req.query as any,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Property applications fetched successfully",
			data: result,
		});
	},
);

const getApplicationById = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const { id } = req.params;
	const result = await applicationService.getApplicationById(
		user,
		id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application fetched successfully",
		data: result,
	});
});

const approveApplication = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const { id } = req.params;
	const result = await applicationService.approveApplication(
		userId,
		id as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application approved successfully",
		data: result,
	});
});

const rejectApplication = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const { id } = req.params;
	const result = await applicationService.rejectApplication(
		userId,
		id as string,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Application rejected successfully",
		data: result,
	});
});

export const applicationController = {
	applyForFlat,
	listMyApplications,
	withdrawApplication,
	listPropertyApplications,
	getApplicationById,
	approveApplication,
	rejectApplication,
};
