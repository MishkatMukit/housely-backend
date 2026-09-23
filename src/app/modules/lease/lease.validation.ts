import { z } from "zod";
import { LeaseStatus } from "../../../generated/prisma/enums";

const createLeaseSchema = z
	.object({
		flatId: z.uuid("Invalid flat id"),
		tenantId: z.uuid("Invalid tenant id"),
		amount: z.coerce.number().positive().max(100_000_000).optional(),
		startDate: z.coerce.date("Invalid start date"),
		endDate: z.coerce.date("Invalid end date"),
		skipApplicationCheck: z.boolean().optional(),
	})
	.strict()
	.refine((data) => data.endDate > data.startDate, {
		message: "endDate must be after startDate",
	})
	.refine((data) => data.startDate.getUTCDate() === 1, {
		message: "startDate must be the first day of the month",
		path: ["startDate"],
	});

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

const completeLeaseSchema = z
	.object({
		rejectionReason: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const leaseValidation = {
	createLeaseSchema,
	leaseIdParamSchema,
	leasePropertyIdParamSchema,
	listLeasesQuerySchema,
	terminateLeaseSchema,
	completeLeaseSchema,
};
