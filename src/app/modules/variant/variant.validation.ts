import { z } from "zod";

const variantIdParamSchema = z.object({
  id: z.uuid("Invalid variant id"),
});

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

export const variantValidation = {
  variantIdParamSchema,
  createVariantSchema,
  updateVariantSchema,
};