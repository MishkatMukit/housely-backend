import bcrypt from "bcryptjs";
import type { ILoginUserPayload, IRegisterUserPayload, IVerifyUserEmailPayload } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";
import { UserStatus, Role } from "../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";

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
const verifyUserEmail = async (payload: IVerifyUserEmailPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});
	if (isUserExists?.status === UserStatus.BLOCKED) {
		throw new AppError("User is blocked", httpStatus.FORBIDDEN);
	}
	if (isUserExists?.emailVerified) {
		throw new AppError("User email is already verified", httpStatus.BAD_REQUEST);
	}
	const otp = payload.otp.trim();
	const otpKey = `register-user-otp:${email}`;
	const storedOtp = await redisClient.get(otpKey);
	if (!storedOtp) {
		throw new AppError("OTP Expired. Please Request New OTP", httpStatus.BAD_REQUEST);
	}
	if (storedOtp !== otp) {
		throw new AppError("Invalid OTP", httpStatus.BAD_REQUEST);
	}
	await redisClient.del(otpKey);

	const redisUserData = await redisClient.get(`user-registration-data:${email}`);

	if (!redisUserData) {
		throw new AppError("Registration data expired. Please register again.", httpStatus.BAD_REQUEST);
	}
	const parsedData = JSON.parse(redisUserData);

	const createdUser = await prisma.user.create({
		data: {
			name: parsedData.name,
			email: parsedData.email,
			password: parsedData.hashedPassword,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			role: Role.TENANT,
			tenant: {
				create: {
					email: parsedData.email,
					name: parsedData.name,
					contactNumber: parsedData.tenant?.contactNumber || null,
				}
			}
		},
		omit: {
			password: true,

		},
		include: {
			tenant: true
		}
	})
	await redisClient.del(`user-registration-data:${email}`);

	const { tenant, ...user } = createdUser;
	const JwtPayload = {
		userid: user.id,
		name: user.name,
		email: user.email,
		role: user.role
	}

	const accessToken = await jwtUtils.createToken(JwtPayload, config.jwt_access_secret, config.jwt_access_expires_in);

	const refreshToken = await jwtUtils.createToken(JwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in);

	const templatePath = path.join(process.cwd(), "../src/app/templates/login-success.ejs")
	const html = await ejs.renderFile(templatePath, { name: user.name, email: user.email })

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Registration Successful",
		html,
	});
	return {
		user,
		tenant,
		accessToken,
		refreshToken,
	};
}
const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError("User Is Blocked", httpStatus.FORBIDDEN);
	}

	if (user.status === UserStatus.DELETED) {
		throw new AppError("User Is Deleted", httpStatus.FORBIDDEN);
	}

	if (user.password === null && user.googleId !== null) {
		throw new AppError(
			"Account Already Registered With Google",
			httpStatus.BAD_REQUEST,
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new AppError("Invalid Credentials", httpStatus.UNAUTHORIZED);
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in,
	);

	return {
		accessToken,
		refreshToken,
	};
};


export const authService = {
	registerUser,
	verifyUserEmail,
	loginUser
};