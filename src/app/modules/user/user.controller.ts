import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import { userService } from "./user.service";
import sendResponse from "../../utils/sendResponse";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {

    const file = req.file;
    const userId = req.user?.id as string
    if (!file) {
        throw new AppError("No File Uploaded", httpStatus.BAD_REQUEST);
    }

    // console.log(req.file, "req.file");
    const result = await userService.uploadProfileImage(file?.buffer, userId)

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "profile photo uploaded successfully",
        data: result
    });
})

const updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;

    const result = await userService.updateUserProfile(userId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile updated successfully",
        data: result,
    });
})

export const userController = {
    uploadProfileImage,
    updateProfile,
}