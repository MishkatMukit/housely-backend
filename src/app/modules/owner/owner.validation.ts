import { z } from "zod";
import { OwnerStatus } from "../../../generated/prisma/enums";

const applyAsOwnerSchema = z
  .object({
    contactNumber: z.string().trim().min(6).max(20),
    address: z.string().trim().min(5).max(255),
    nationalIdNumber: z.string().trim().min(4).max(50),
  })
  .strict();

const listOwnersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(OwnerStatus).optional(),
  search: z.string().trim().min(1).optional(),
});

const ownerIdParamSchema = z.object({
  id: z.uuid("Invalid owner id"),
});

const approveOwnerSchema = z
  .object({
    approvalNotes: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .optional();

const rejectOwnerSchema = z
  .object({
    rejectionReason: z.string().trim().min(1, "Rejection reason is required").max(500),
  })
  .strict();

const updateOwnerProfileSchema = z
  .object({
    contactNumber: z.string().trim().min(6).max(20).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const ownerValidation = {
  applyAsOwnerSchema,
  listOwnersQuerySchema,
  ownerIdParamSchema,
  approveOwnerSchema,
  rejectOwnerSchema,
  updateOwnerProfileSchema,
};
