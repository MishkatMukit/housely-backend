import { z } from "zod";
import { LeaseStatus } from "../../../generated/prisma/enums";

const leaseIdParamSchema = z.object({
	id: z.uuid("Invalid lease id"),
});

const leasePropertyIdParamSchema = z.object({
	propertyId: z.uuid("Invalid property id"),
});

const listLeasesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(LeaseStatus).optional(),
	propertyId: z.uuid("Invalid property id").optional(),
});

const terminateLeaseSchema = z
	.object({
		rejectionReason: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const leaseValidation = {
	leaseIdParamSchema,
	leasePropertyIdParamSchema,
	listLeasesQuerySchema,
	terminateLeaseSchema,
};
