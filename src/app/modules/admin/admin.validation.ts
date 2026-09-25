import { z } from "zod";
import {
	OwnerStatus,
	Role,
	TenantStatus,
	UserStatus,
} from "../../../generated/prisma/enums";

const userIdParamSchema = z.object({
	id: z.uuid("Invalid user id"),
});

const ownerIdParamSchema = z.object({
	id: z.uuid("Invalid owner id"),
});

const listUsersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(UserStatus).optional(),
	role: z.enum(Role).optional(),
	search: z.string().trim().min(1).optional(),
});

const listTenantsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(TenantStatus).optional(),
	search: z.string().trim().min(1).optional(),
});

const listOwnersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	status: z.enum(OwnerStatus).optional(),
	search: z.string().trim().min(1).optional(),
});

const rejectOwnerSchema = z
	.object({
		rejectionReason: z
			.string()
			.trim()
			.min(1, "Rejection reason is required")
			.max(500),
	})
	.strict();

export const adminValidation = {
	userIdParamSchema,
	ownerIdParamSchema,
	listUsersQuerySchema,
	listTenantsQuerySchema,
	listOwnersQuerySchema,
	rejectOwnerSchema,
};
