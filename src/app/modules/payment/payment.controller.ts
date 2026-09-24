import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IRequestUser } from "../../Interfaces/auth.interface";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { paymentService } from "./payment.service";

const initiateCheckout = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const { id } = req.params;
	const result = await paymentService.initiateCheckout(user, id as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "bKash checkout initiated successfully",
		data: result,
	});
});

const handleCallback = catchAsync(async (req: Request, res: Response) => {
	const result = await paymentService.handleCallback(
		req.query as Record<string, string>,
	);

	res.redirect(result.redirectUrl);
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
	const result = await paymentService.verifyPayment(
		req.body.paymentID,
		req.body.status,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment verified successfully",
		data: result,
	});
});

const listMyPayments = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await paymentService.listMyPayments(user, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments fetched successfully",
		data: result,
	});
});

const listOwnerPayments = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as IRequestUser;
	const result = await paymentService.listOwnerPayments(user, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments fetched successfully",
		data: result,
	});
});

export const paymentController = {
	initiateCheckout,
	handleCallback,
	verifyPayment,
	listMyPayments,
	listOwnerPayments,
};
