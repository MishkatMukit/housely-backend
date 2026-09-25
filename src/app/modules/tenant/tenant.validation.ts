import { z } from "zod";

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

export const tenantValidation = {
  updateTenantProfileSchema,
};
