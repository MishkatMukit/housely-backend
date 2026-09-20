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

const listOwners = catchAsync(async (req: Request, res: Response) => {
    const query = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
    };

    const result = await ownerService.listOwners(query as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Owners fetched successfully",
        data: result,
    });
});

const approveOwner = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.id as string;
    const result = await ownerService.approveOwner(id, adminId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Owner approved successfully",
        data: result,
    });
});

const rejectOwner = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user?.id as string;
    const result = await ownerService.rejectOwner(id, adminId, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Owner rejected successfully",
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

export const ownerController = {
    applyAsOwner,
    getOwnerProfile,
    listOwners,
    approveOwner,
    rejectOwner,
    updateOwnerProfile,
};