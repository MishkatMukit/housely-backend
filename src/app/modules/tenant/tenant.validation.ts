import { z } from "zod";
import { TenantStatus } from "../../../generated/prisma/enums";

const updateTenantProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    address: z.string().trim().min(1).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    nationalIdNumber: z.string().trim().min(1).max(50).optional(),
    contactNumber: z.string().trim().min(6).max(20).optional(),
    employmentStatus: z.string().trim().min(2).max(100).optional(),
    aboutMe: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(TenantStatus).optional(),
  search: z.string().trim().min(1).optional(),
});

export const tenantValidation = {
  updateTenantProfileSchema,
  listTenantsQuerySchema,
};
