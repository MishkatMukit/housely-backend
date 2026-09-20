import { z } from "zod";
import { OwnerStatus } from "../../../generated/prisma/enums";

const viewOwnerApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(OwnerStatus).optional(),
  search: z.string().trim().min(1).optional(),
});

export const applicationValidation = {
  viewOwnerApplicationsQuerySchema,
};
