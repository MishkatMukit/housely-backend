import { z } from "zod";

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    address: z.string().trim().min(1).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(), // TODO: switch to z.enum(Gender) after Gender migration
    nationalIdNumber: z.string().trim().min(1).max(50).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const userValidation = {
  updateProfileSchema,
};
