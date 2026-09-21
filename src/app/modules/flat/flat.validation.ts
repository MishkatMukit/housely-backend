import { z } from "zod";
import { FlatStatus } from "../../../generated/prisma/enums";

const createVariantSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    bedrooms: z.coerce.number().int().min(0).max(20),
    bathrooms: z.coerce.number().int().min(0).max(20),
    sizeSqft: z.coerce.number().int().min(50).max(20000).optional(),
    rentAmount: z.coerce.number().positive().max(10_000_000),
    advanceAmount: z.coerce.number().nonnegative().max(10_000_000),
    totalUnits: z.coerce.number().int().min(1).max(100),
    flatNumberPrefix: z.string().trim().regex(/^[A-Za-z0-9]+$/, "Alphanumeric only").max(10).optional(),
  })
  .strict();

const propertyIdParamSchema = z.object({
  propertyId: z.uuid("Invalid property id"),
});

const variantIdParamSchema = z.object({
  id: z.uuid("Invalid variant id"),
});

const updateVariantSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    bedrooms: z.coerce.number().int().min(0).max(20).optional(),
    bathrooms: z.coerce.number().int().min(0).max(20).optional(),
    sizeSqft: z.coerce.number().int().min(50).max(20000).optional(),
    rentAmount: z.coerce.number().positive().max(10_000_000).optional(),
    advanceAmount: z.coerce.number().nonnegative().max(10_000_000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const listAllFlatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(FlatStatus).optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().min(1).optional(),
  minBedrooms: z.coerce.number().int().min(0).optional(),
  maxRent: z.coerce.number().positive().optional(),
});

const addFlatsSchema = z
  .object({
    count: z.coerce.number().int().min(1).max(100),
    flatNumberPrefix: z.string().trim().regex(/^[A-Za-z0-9]+$/, "Alphanumeric only").max(10).optional(),
  })
  .strict();

const updateFlatSchema = z
  .object({
    flatNumber: z.string().trim().regex(/^[A-Za-z0-9-]+$/, "Alphanumeric and hyphens only").min(1).max(20).optional(),
    status: z.enum(["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"]).optional(),
    rentOverride: z.coerce.number().positive().max(10_000_000).nullable().optional(),
    advanceOverride: z.coerce.number().nonnegative().max(10_000_000).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const flatValidation = {
  createVariantSchema,
  propertyIdParamSchema,
  variantIdParamSchema,
  updateVariantSchema,
  listAllFlatsQuerySchema,
  addFlatsSchema,
  updateFlatSchema,
};
