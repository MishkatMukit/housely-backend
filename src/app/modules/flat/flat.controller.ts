import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { flatService } from "./flat.service";

const addFlats = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id as string;
    const { id } = req.params;
    const result = await flatService.addFlats(userId, id as string, req.body);
    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Flats added successfully", data: result });
});
const getAllFlats = catchAsync(async (req: Request, res: Response) => {
  const result = await flatService.getAllFlats(req.query as any);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Flats fetched successfully", data: result });
});
const getFlatsByPropertyId = catchAsync(async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const result = await flatService.getAllFlatsByPropertyId(propertyId as string, req.query.variantId as string | undefined);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Flats fetched successfully", data: result });
});

const updateFlat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { id } = req.params;
  const result = await flatService.updateFlat(userId, id as string, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Flat updated successfully", data: result });
});

const deleteFlat = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const { id } = req.params;
  await flatService.deleteFlat(userId, id as string);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Flat deleted successfully", data: null });
});

export const flatController = {
  addFlats,
  getAllFlats,
  getFlatsByPropertyId,
  updateFlat,
  deleteFlat
};
