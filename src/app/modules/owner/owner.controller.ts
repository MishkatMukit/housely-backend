import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { ownerService } from "./owner.service";
import type { Request, Response } from "express";

const applyAsOwner = catchAsync(async (req: Request, res: Response) => {
    let payload = req.body;
    if (typeof req.body.data === 'string') {
        payload = JSON.parse(req.body.data);
    }
    const additionalFiles = (req.files as Express.Multer.File[]) || [];
    const result = await ownerService.applyAsOwner(payload, additionalFiles);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your application as owner has been submitted successfully.",
        data: result,
    });
});

export const ownerController = {
    applyAsOwner,
};