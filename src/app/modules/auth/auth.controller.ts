import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { authService } from "./auth.service";

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

export const authController = {
    registerUser,
    verifyUserEmail
};