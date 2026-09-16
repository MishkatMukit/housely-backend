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

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;

    const result = await userService.getUserProfile(userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile fetched successfully",
        data: result,
    });
})

const listUsers = catchAsync(async (req: Request, res: Response) => {
    const query = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        status: req.query.status as string | undefined,
        role: req.query.role as string | undefined,
        search: req.query.search as string | undefined,
    };

    const result = await userService.listUsers(query as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Users fetched successfully",
        data: result,
    });
})

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await userService.getUserById(id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User fetched successfully",
        data: result,
    });
})

export const userController = {
    uploadProfileImage,
    getUserProfile,
    getUserById,
    listUsers,
}