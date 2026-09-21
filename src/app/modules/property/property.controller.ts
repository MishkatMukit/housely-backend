import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { propertyService } from "./property.service";

const createProperty = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const result = await propertyService.createProperty(userId, req.body);

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
