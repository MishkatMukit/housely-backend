import bcrypt from "bcryptjs";
import type { IRegisterUserPayload } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";

const registerUser = async (payload: IRegisterUserPayload) => {
	const { name, password } = payload;

	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError("User With This Email Already Exists", httpStatus.CONFLICT);
	}

	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	const hashedPassword = await bcrypt.hash(password, 8);



	const otpValue = crypto.randomInt(100000, 1000000);
	const otpKey = `register-user-otp:${email}`;

	await redisClient.set(otpKey, String(otpValue), {
		EX: 5 * 60,
	});

	const userRegistrationData = `user-registration-data:${email}`;
	const redisUserDataPayload = {
		name,
		email,
		password: hashedPassword
	}

	await redisClient.set(userRegistrationData, JSON.stringify(redisUserDataPayload), {
		EX: 5 * 60,
	});

	const templateData = {
		name,
		email,
		otpValue,
		expirationTime: "5 minutes"
	}
	const templatePath = path.join(process.cwd(), "src", "app", "templates", "register-user.ejs");
	const html = await ejs.renderFile(templatePath, templateData);
	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "User Registration OTP",
		html,
	});
};

export const authService = {
    registerUser
};