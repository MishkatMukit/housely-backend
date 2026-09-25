import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { analyticsService } from "./analytics.service";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await analyticsService.getAdminAnalytics();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin analytics fetched successfully",
		data: result,
	});
});

const getOwnerAnalytics = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await analyticsService.getOwnerAnalytics(user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owner analytics fetched successfully",
		data: result,
	});
});

const getTenantAnalytics = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await analyticsService.getTenantAnalytics(user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Tenant analytics fetched successfully",
		data: result,
	});
});

export const analyticsController = {
	getAdminAnalytics,
	getOwnerAnalytics,
	getTenantAnalytics,
};