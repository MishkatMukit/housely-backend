import { z } from "zod";
import { Role, UserStatus } from "../../../generated/prisma/enums";

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(UserStatus).optional(),
  role: z.enum(Role).optional(),
  search: z.string().trim().min(1).optional(),
});

const userIdParamSchema = z.object({
  id: z.uuid("Invalid user id"),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    address: z.string().trim().min(1).optional(),
    gender: z.enum(["MALE", "FEMALE"]).optional(),
    nationalIdNumber: z.string().trim().min(1).max(50).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const userValidation = {
  listUsersQuerySchema,
  userIdParamSchema,
  updateProfileSchema,
};
