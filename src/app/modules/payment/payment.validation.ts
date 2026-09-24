import { z } from "zod";
import { PaymentStatus, PaymentType } from "../../../generated/prisma/enums";

export const paymentIdParamSchema = z
	.object({
		id: z.string().uuid({ message: "Invalid payment id" }),
	})
	.strict();

export const callbackQuerySchema = z
	.object({
		paymentID: z.string().min(1, "paymentID is required"),
		status: z.string().min(1, "status is required"),
		signature: z.string().optional(),
		apiVersion: z.string().optional(),
	})
	.strict();

export const verifyPaymentSchema = z
	.object({
		paymentID: z.string().min(1, "paymentID is required"),
		status: z.string().min(1, "status is required"),
	})
	.strict();

export const myPaymentsQuerySchema = z
	.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
		type: z
			.enum([PaymentType.ADVANCE, PaymentType.MONTHLY_RENT])
			.optional(),
		status: z
			.enum([
				PaymentStatus.PENDING,
				PaymentStatus.COMPLETED,
				PaymentStatus.FAILED,
			])
			.optional(),
	})
	.strict();

export const ownerPaymentsQuerySchema = z
	.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
		leaseId: z.string().uuid("Invalid lease id").optional(),
		type: z
			.enum([PaymentType.ADVANCE, PaymentType.MONTHLY_RENT])
			.optional(),
		status: z
			.enum([
				PaymentStatus.PENDING,
				PaymentStatus.COMPLETED,
				PaymentStatus.FAILED,
			])
			.optional(),
	})
	.strict();

export const paymentValidation = {
	paymentIdParamSchema,
	callbackQuerySchema,
	verifyPaymentSchema,
	myPaymentsQuerySchema,
	ownerPaymentsQuerySchema,
};
