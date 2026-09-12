import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { authService } from "./auth.service";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";

const registerUser = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await authService.registerUser(payload);

    res.status(201).json({
        status: "success",
        message: `OTP has been sent to ${payload.email}. Please verify your email to complete the registration process.`,
        data: result,
    });
})
const verifyUserEmail = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await authService.verifyUserEmail(payload);
    res.status(200).json({
        status: "success",
        message: "Email verified successfully",
        data: result,
    });
})
const loginUser = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await authService.loginUser(payload);
    res.status(200).json({
        status: "success",
        message: "User logged in successfully",
        data: result,
    });
})
const getMe = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as unknown as IRequestUser;

    if (!user) {
        throw new AppError("User Information Is Missing In The Request", httpStatus.BAD_REQUEST);
    }
    const result = await authService.getMe(user);

    res.status(200).json({
        status: "success",
        message: "User profile fetched successfully",
        data: result,
    });
});

export const authController = {
    registerUser,
    verifyUserEmail,
    loginUser,
    getMe
};