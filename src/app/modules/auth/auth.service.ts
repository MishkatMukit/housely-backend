import bcrypt from "bcryptjs";
import type { IRegisterUserPayload, IVerifyUserEmailPayload } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";
import { ActiveStatus } from "../../../generated/prisma/enums";

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
const verifyUserEmail = async(payload : IVerifyUserEmailPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});
	if(isUserExists?.status === ActiveStatus.SUSPENDED){
		throw new AppError("User is suspended", httpStatus.FORBIDDEN);
	}
	if(isUserExists?.emailVerified){
		throw new AppError("User email is already verified", httpStatus.BAD_REQUEST);
	}
	const otp = payload.otp.trim();
	const otpKey = `register-user-otp:${email}`;
	const storedOtp = await redisClient.get(otpKey);
	if(!storedOtp){
		throw new AppError("OTP Expired. Please Request New OTP", httpStatus.BAD_REQUEST);
	}
	if(storedOtp !== otp){
		throw new AppError("Invalid OTP", httpStatus.BAD_REQUEST);
	}
	await redisClient.del(otpKey);

	const redisUserData = await redisClient.get(`user-registration-data:${email}`);

	if(!redisUserData){
		throw new AppError("Registration data expired. Please register again.", httpStatus.BAD_REQUEST);
	}
	const parsedData = JSON.parse(redisUserData);

	const createdUser = await prisma.user.create({
		data:{
			name : parsedData.name,
			email : parsedData.email,
			password : parsedData.hashedPassword
		},
		create:{
			
		}
	})

}

export const authService = {
    registerUser
};