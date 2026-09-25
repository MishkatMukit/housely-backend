import { z } from "zod";
import { ApplicationStatus } from "../../../generated/prisma/enums";

const applyAsOwnerSchema = z
	.object({
		contactNumber: z.string().trim().min(6).max(20),
		address: z.string().trim().min(5).max(255),
		nationalIdNumber: z.string().trim().min(4).max(50),
	})
	.strict();

const updateOwnerProfileSchema = z
	.object({
		contactNumber: z.string().trim().min(6).max(20).optional(),
		name: z
			.string()
			.trim()
			.min(2, "Name must be at least 2 characters")
			.max(100)
			.optional(),
		address: z.string().trim().min(1).optional(),
		gender: z.enum(["MALE", "FEMALE"]).optional(),
		nationalIdNumber: z.string().trim().min(1).max(50).optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

const listOwnerApplicationsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(ApplicationStatus).optional(),
	propertyId: z.uuid("Invalid property id").optional(),
	flatId: z.uuid("Invalid flat id").optional(),
});

export const ownerValidation = {
	applyAsOwnerSchema,
	updateOwnerProfileSchema,
	listOwnerApplicationsQuerySchema,
};
