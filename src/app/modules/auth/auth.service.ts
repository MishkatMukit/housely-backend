import bcrypt from "bcryptjs";
import type { IForgotPassword, IGoogleLoginPayload, ILoginUserPayload, IRegisterUserPayload, IRequestUser, IResetPassword, IVerifyUserEmailPayload } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";
import { UserStatus, Role, AuthProvider } from "../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import type { JwtPayload } from "jsonwebtoken";
import type { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";

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

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			tenant: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	return isUserExists;
};
const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
			httpStatus.UNAUTHORIZED,
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError("User Is Inactive Or Not Found", httpStatus.UNAUTHORIZED);
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
const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google ID Token Verification Failed", error);
		throw new AppError("Invalid Or Expired Google ID Token", httpStatus.UNAUTHORIZED);
	}

	if (!googleIdTokenPayload) {
		throw new AppError("Invalid Or Expired Google ID Token", httpStatus.UNAUTHORIZED);
	}

	if (!googleIdTokenPayload.email) {
		throw new AppError("Google Email Not Found", httpStatus.BAD_REQUEST);
	}
	if (!googleIdTokenPayload.name) {
		throw new AppError("Google User Name Not Found", httpStatus.BAD_REQUEST);
	}

	const ifTenantExistWithGoogleAuth = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: Role.TENANT,
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = ifTenantExistWithGoogleAuth;

	if (!ifTenantExistWithGoogleAuth) {
		const ifTenantExistWithCredentials = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: Role.TENANT,
				authProvider: AuthProvider.CREDENTIAL,
			},
		});

		if (ifTenantExistWithCredentials) {
			if (!ifTenantExistWithCredentials.emailVerified) {
				throw new AppError("Email Not Verified", httpStatus.FORBIDDEN);
			}

			if (ifTenantExistWithCredentials.status === UserStatus.BLOCKED) {
				throw new AppError("User Is Blocked", httpStatus.FORBIDDEN);
			}

			if (
				ifTenantExistWithCredentials.isDeleted ||
				ifTenantExistWithCredentials.status === UserStatus.DELETED
			) {
				throw new AppError("User Is Deleted", httpStatus.FORBIDDEN);
			}

			user = await prisma.user.update({
				where: {
					id: ifTenantExistWithCredentials.id,
				},

				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			// Google Register
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					role: Role.TENANT,
					googleId: googleIdTokenPayload.sub,
					authProvider: AuthProvider.GOOGLE,
					emailVerified: true,
					tenant: {
						create: {
							name: googleIdTokenPayload.name,
							email: googleIdTokenPayload.email,
						},
					},
				},
			});
			const templatePath = path.join(process.cwd(), "../src/app/templates/welcome-user.ejs");
			const html = await ejs.renderFile(templatePath, { name: user.name, email: user.email });
			await transporter.sendMail({
				from: config.email_sender,
				to: user.email,
				subject: "Welcome to Housely",
				html
			});
		}
	}

	if (!user) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError("User Is Blocked", httpStatus.FORBIDDEN);
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError("User Is Deleted", httpStatus.FORBIDDEN);
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
const forgotPassword = async (payload: IForgotPassword) => {
	const { email } = payload;
	const isUserExist = await prisma.user.findUnique({
		where: {
			email
		}
	})
	if (!isUserExist) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND)
	}
	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new AppError("User Is Blocked", httpStatus.FORBIDDEN)
	}
	if (isUserExist.emailVerified === false) {
		throw new AppError("Email Not Verified", httpStatus.FORBIDDEN)
	}
	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new AppError("User Is Deleted", httpStatus.FORBIDDEN)
	}
	if (isUserExist.googleId && isUserExist.authProvider === AuthProvider.GOOGLE) {
		throw new AppError("Account Already Registered With Google", httpStatus.BAD_REQUEST)
	}
	const otp = crypto.randomInt(100000, 1000000)

	await redisClient.set(`forgot-password-otp:${email}`, otp.toString(), {
		expiration: {
			type: "EX",
			value: 5 * 60
		}
	})
	const templatePath = path.join(process.cwd(), "../src/app/templates/forgot-password.ejs");

	const html = await ejs.renderFile(templatePath, { otp, email });

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Password Reset OTP",
		html,
	});
}
const resetPassword = async (payload: IResetPassword) => {
	const { email, newPassword } = payload;
	const otp = String(payload.otp || "").trim();

	const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});
	if (!isUserExist) {
		throw new AppError("User Not Found", httpStatus.NOT_FOUND);
	}
	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new AppError("User Is Blocked", httpStatus.FORBIDDEN);
	}
	if (isUserExist.emailVerified === false) {
		throw new AppError("Email Not Verified", httpStatus.FORBIDDEN);
	}
	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new AppError("User Is Deleted", httpStatus.FORBIDDEN);
	}
	if (isUserExist.googleId && isUserExist.authProvider === AuthProvider.GOOGLE) {
		throw new AppError("Account Already Registered With Google", httpStatus.BAD_REQUEST);
	}

	const storedOtp = await redisClient.get(`forgot-password-otp:${email}`);
	if (!storedOtp) {
		throw new AppError("OTP Expired. Please Request New OTP", httpStatus.BAD_REQUEST);
	}
	if (storedOtp !== otp) {
		throw new AppError("Invalid OTP", httpStatus.BAD_REQUEST);
	}
	const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

	const updatedUser = await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			password: hashedPassword,
		},
	});
	await redisClient.del([`forgot-password-otp:${email}`]);
	const templatePath = path.join(process.cwd(), "../src/app/templates/reset-password.ejs");

	const html = await ejs.renderFile(templatePath, { email });

	await transporter.sendMail({
		from: config.email_sender,
		to: updatedUser.email,
		subject: "Password Reset Successful",
		html,
	});
};
export const authService = {
	registerUser,
	verifyUserEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword
};