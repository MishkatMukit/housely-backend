import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import { propertyService } from "./property.service";
import { propertyValidation } from "./property.validation";

const createProperty = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
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
    const payload = await propertyValidation.createPropertySchema.parseAsync(rawPayload ?? {});
    const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
    const result = await propertyService.createProperty(userId, payload, files);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Property created successfully",
        data: result,
    });
});

const listProperties = catchAsync(async (req: Request, res: Response) => {
    const result = await propertyService.listProperties(req.query as any);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Properties fetched successfully",
        data: result,
    });
});

const getProperty = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await propertyService.getProperty(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Property fetched successfully",
        data: result,
    });
});

export const propertyController = {
    createProperty,
    listProperties,
    getProperty,
};
