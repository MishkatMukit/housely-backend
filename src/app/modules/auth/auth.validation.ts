import { z } from "zod";

const otpSchema = z
	.string()
	.trim()
	.regex(/^\d{6}$/, "OTP must be a 6-digit number");

const registerUserSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Name must be at least 2 characters")
			.max(100),
		email: z.email("Please provide a valid email"),
		password: z
			.string()
			.min(6, "Password must be at least 6 characters")
			.max(72, "Password must be at most 72 characters"),
	})
	.strict();

const verifyUserEmailSchema = z
	.object({
		email: z.email("Please provide a valid email"),
		otp: otpSchema,
	})
	.strict();

const loginUserSchema = z
	.object({
		email: z.email("Please provide a valid email"),
		password: z.string().min(1, "Password is required"),
	})
	.strict();

const googleLoginSchema = z
	.object({
		idToken: z.string().trim().min(1, "Google ID token is required"),
	})
	.strict();

const forgotPasswordSchema = z
	.object({
		email: z.email("Please provide a valid email"),
	})
	.strict();

const resetPasswordSchema = z
	.object({
		email: z.email("Please provide a valid email"),
		otp: otpSchema,
		newPassword: z
			.string()
			.min(6, "Password must be at least 6 characters")
			.max(72, "Password must be at most 72 characters"),
	})
	.strict();

export const authValidation = {
	registerUserSchema,
	verifyUserEmailSchema,
	loginUserSchema,
	googleLoginSchema,
	forgotPasswordSchema,
	resetPasswordSchema,
};
