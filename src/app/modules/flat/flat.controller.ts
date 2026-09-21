import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { flatService } from "./flat.service";

const createVariant = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { propertyId } = req.params;
  const result = await flatService.createVariant(userId, propertyId as string, req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Variant created successfully", data: result });
});

const listVariants = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const result = await flatService.listVariants(propertyId as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Variants fetched successfully", data: result });
});

const listFlats = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const result = await flatService.listFlats(propertyId as string, req.query.variantId as string | undefined);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Flats fetched successfully", data: result });
});

const getVacancy = catchAsync(async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  const count = await flatService.getVacancy(propertyId as string, req.query.variantId as string | undefined);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Vacancy fetched successfully", data: { available: count } });
});

const deleteVariant = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { id } = req.params;
  await flatService.deleteVariant(userId, id as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Variant deleted successfully", data: null });
});

export const flatController = {
  createVariant,
  listVariants,
  listFlats,
  getVacancy,
  deleteVariant,
};
