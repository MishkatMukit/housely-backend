import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { authService } from "./auth.service";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";

const registerUser = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await authService.registerUser(payload);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: `OTP has been sent to ${payload.email}. Please verify your email to complete the registration process.`,
        data: result,
    });
})
const verifyUserEmail = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await authService.verifyUserEmail(payload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email verified successfully",
        data: result,
    });
})
const loginUser = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await authService.loginUser(payload);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
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

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile fetched successfully",
        data: result,
    });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
    if (!req.cookies.refreshToken) {
        throw new AppError("Refresh Token Is Missing", httpStatus.BAD_REQUEST);
    }
    const result = await authService.refreshToken(req.cookies.refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = result;

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });
    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "New tokens generated successfully",
        data: {
            accessToken,
            refreshToken: newRefreshToken,
        },
    });
});
const googleLogin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await authService.googleLogin(payload);

    const { accessToken, refreshToken } = result;

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "New tokens generated successfully",
        data: {
            accessToken,
            refreshToken,
        },
    });
})
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await authService.forgotPassword(payload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `OTP sent to ${payload.email} successfully`,
        data: {

        },
    });
});

export const authController = {
    registerUser,
    verifyUserEmail,
    loginUser,
    getMe,
    refreshToken,
    googleLogin,
    forgotPassword
};