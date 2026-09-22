import { z } from "zod";

const createPropertySchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(2000).optional(),
    address: z.string().trim().min(5).max(255),
    city: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().max(20).optional(),
    companyName: z.string().trim().max(150).optional(),
  })
  .strict();

const listPropertiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  district: z.string().trim().min(1).optional(),
  ownerId: z.uuid("Invalid owner id").optional(),
});

const propertyIdParamSchema = z.object({
  id: z.uuid("Invalid property id"),
});

// Scope param for nested routes: /:propertyId/...
const propertyScopedParamSchema = z.object({
  propertyId: z.uuid("Invalid property id"),
});

export const propertyValidation = {
  createPropertySchema,
  listPropertiesQuerySchema,
  propertyIdParamSchema,
  propertyScopedParamSchema,
};
