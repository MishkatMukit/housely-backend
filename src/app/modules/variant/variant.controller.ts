import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { variantService } from "./variant.service";
import { AppError } from "../../utils/appError";
import { propertyValidation } from "../property/property.validation";
import { variantValidation } from "./variant.validation";
const createVariant = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const { propertyId } = req.params;
    let rawPayload: unknown = req.body;
    if (typeof req.body?.data === "string") {
        try {
            rawPayload = JSON.parse(req.body.data);
        } catch {
            throw new AppError("Invalid JSON in 'data' field", httpStatus.BAD_REQUEST);
        }
    } else if (Array.isArray(req.files) || req.body?.images !== undefined) {
        const { images: _omit, ...rest } = req.body ?? {};
        rawPayload = rest;
    }
    const payload = await variantValidation.createVariantSchema.parseAsync(rawPayload ?? {});
    const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
    const result = await variantService.createVariant(userId, propertyId as string, payload, files);
    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Variant created successfully", data: result });
});
const listVariants = catchAsync(async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const result = await variantService.listVariants(propertyId as string);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Variants fetched successfully", data: result });
});
const deleteVariant = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const { id } = req.params;
    await variantService.deleteVariant(userId, id as string);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Variant deleted successfully", data: null });
});
const updateVariant = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const { id } = req.params;
    const result = await variantService.updateVariant(userId, id as string, req.body);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Variant updated successfully. New pricing applies to future leases only.", data: result });
});

export const variantController = {
    createVariant,
    deleteVariant,
    updateVariant,
    listVariants
}