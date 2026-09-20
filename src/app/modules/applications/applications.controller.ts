import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { applicationService } from "./applications.service";

const viewOwnerApplications = catchAsync(async (req: Request, res: Response) => {
    const result = await applicationService.viewOwnerApplications(req.query as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Owner applications fetched successfully",
        data: result,
    });
});

export const applicationController = {
    viewOwnerApplications,
};
