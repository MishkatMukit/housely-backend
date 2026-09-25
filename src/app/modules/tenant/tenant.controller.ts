import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { tenantService } from "./tenant.service";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const result = await tenantService.getMyProfile(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tenant profile fetched successfully",
        data: result,
    });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const result = await tenantService.updateMyProfile(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tenant profile updated successfully",
        data: result,
    });
});

export const tenantController = {
    getMyProfile,
    updateMyProfile,
};
