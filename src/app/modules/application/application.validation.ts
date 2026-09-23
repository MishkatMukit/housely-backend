import { z } from "zod";
import { ApplicationStatus } from "../../../generated/prisma/enums";

const applyForFlatSchema = z
	.object({
		flatId: z.uuid("Invalid flat id"),
		monthlyIncome: z.coerce.number().positive().max(100_000_000).optional(),
		employment: z.string().trim().min(2).max(100).optional(),
		message: z.string().trim().min(1).max(2000).optional(),
	})
	.strict();

const applicationIdParamSchema = z.object({
	id: z.uuid("Invalid application id"),
});

const applicationPropertyIdParamSchema = z.object({
	propertyId: z.uuid("Invalid property id"),
});

const listApplicationsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(ApplicationStatus).optional(),
	flatId: z.uuid("Invalid flat id").optional(),
});

const rejectApplicationSchema = z
	.object({
		rejectionReason: z
			.string()
			.trim()
			.min(1, "Rejection reason is required")
			.max(500),
	})
	.strict();

export const applicationValidation = {
	applyForFlatSchema,
	applicationIdParamSchema,
	applicationPropertyIdParamSchema,
	listApplicationsQuerySchema,
	rejectApplicationSchema,
};
