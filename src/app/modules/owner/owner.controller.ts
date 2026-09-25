import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { IListApplicationsQuery } from "../../Interfaces/application.interface";
import { AppError } from "../../utils/appError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { applicationService } from "../application/application.service";
import { ownerService } from "./owner.service";
import { ownerValidation } from "./owner.validation";

const applyAsOwner = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	let rawPayload: unknown = req.body;
	if (typeof req.body?.data === "string") {
		try {
			rawPayload = JSON.parse(req.body.data);
		} catch {
			throw new AppError(
				"Invalid JSON in 'data' field",
				httpStatus.BAD_REQUEST,
			);
		}
	}
	const payload = await ownerValidation.applyAsOwnerSchema.parseAsync(
		rawPayload ?? {},
	);
	const files = req.files as unknown as Record<string, Express.Multer.File[]>;
	const verificationFiles = files?.["verificationDocuments"] ?? [];
	if (verificationFiles.length < 1) {
		throw new AppError(
			"At least one verification document (NID and property ownership proof) is required",
			httpStatus.BAD_REQUEST,
		);
	}
	const result = await ownerService.applyAsOwner(
		userId,
		payload,
		verificationFiles,
	);

	const isReapplication =
		(result as { status?: string }).status === "PENDING" &&
		result.updatedAt.getTime() !== result.createdAt.getTime();

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: isReapplication
			? "Your owner application has been resubmitted successfully."
			: "Your application as owner has been submitted successfully.",
		data: result,
	});
});

const getOwnerProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await ownerService.getOwnerProfile(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owner profile fetched successfully",
		data: result,
	});
});

const updateOwnerProfile = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.id as string;
	const result = await ownerService.updateOwnerProfile(userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Owner profile updated successfully",
		data: result,
	});
});

const listOwnerApplications = catchAsync(
	async (req: Request, res: Response) => {
		const userId = req.user?.id as string;
		const result = await applicationService.listOwnerApplications(
			userId,
			req.query as unknown as IListApplicationsQuery,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Applications fetched successfully",
			data: result,
		});
	},
);

export const ownerController = {
	applyAsOwner,
	getOwnerProfile,
	updateOwnerProfile,
	listOwnerApplications,
};
