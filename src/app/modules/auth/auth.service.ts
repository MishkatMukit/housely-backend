import bcrypt from "bcryptjs";
import type { IForgotPassword, IGoogleLoginPayload, ILoginUserPayload, IRegisterUserPayload, IRequestUser, IResendOtpPayload, IResetPassword, IVerifyUserEmailPayload } from "../../Interfaces/auth.interface";
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
const reconcileDuplicateRegistrationEmail = async (email: string, originalError: unknown) => {
	// The create collided with a row that a CONCURRENT verify just committed, or with a
	// stale/preexisting row already owning this email. Retry the lookup a few times so the
	// winner's insert becomes visible before deciding how to resolve the conflict.
	for (let attempt = 0; attempt < 5; attempt++) {
		const existing = await prisma.user.findUnique({
			where: { email },
			omit: { password: true },
			include: { tenant: true },
		});
		if (existing?.emailVerified) {
			return existing;
		}
		if (existing) {
			throw new AppError(
				"This email is already registered. Please log in instead.",
				httpStatus.CONFLICT,
			);
		}
		if (attempt < 4) {
			await new Promise((resolve) => setTimeout(resolve, 150));
		}
	}
	const strayTenant = await prisma.tenant.findUnique({ where: { email } });
	if (strayTenant) {
		throw new AppError(
			"This email is already registered to another account. Please log in instead.",
			httpStatus.CONFLICT,
		);
	}
	throw originalError;
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

	const redisUserData = await redisClient.get(`user-registration-data:${email}`);

	if (!redisUserData) {
		throw new AppError("Registration data expired. Please register again.", httpStatus.BAD_REQUEST);
	}
	const parsedData = JSON.parse(redisUserData);

	const createUserPromise = prisma.user.create({
		data: {
			name: parsedData.name,
			email: parsedData.email,
			password: parsedData.password,
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
	});

	let createdUser: Awaited<typeof createUserPromise>;
	try {
		createdUser = await createUserPromise;
	} catch (error) {
		createdUser = await reconcileDuplicateRegistrationEmail(email, error);
	}
	await redisClient.del([otpKey, `user-registration-data:${email}`]);

	const { tenant, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role
	}

	const accessToken = await jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in);

	const refreshToken = await jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in);

	const templatePath = path.join(process.cwd(), "src", "app", "templates", "welcome-user.ejs")
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
			id: user.id,
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
			const templatePath = path.join(process.cwd(), "src", "app", "templates", "welcome-user.ejs");
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
	const templatePath = path.join(process.cwd(), "src", "app", "templates", "forgot-password.ejs");

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
	const templatePath = path.join(process.cwd(), "src", "app", "templates", "reset-password.ejs");

	const html = await ejs.renderFile(templatePath, { email });

	await transporter.sendMail({
		from: config.email_sender,
		to: updatedUser.email,
		subject: "Password Reset Successful",
		html,
	});
};
const resendRegisterOtp = async (payload: { email: string }) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});
	if (isUserExists?.emailVerified) {
		throw new AppError("User email is already verified", httpStatus.CONFLICT);
	}
	if (isUserExists) {
		throw new AppError("User With This Email Already Exists", httpStatus.CONFLICT);
	}

	if (!redisClient.isOpen) {
		await redisClient.connect();
	}

	const redisUserData = await redisClient.get(`user-registration-data:${email}`);
	if (!redisUserData) {
		throw new AppError("Registration data expired. Please register again.", httpStatus.BAD_REQUEST);
	}
	const parsedData = JSON.parse(redisUserData);

	const otpValue = crypto.randomInt(100000, 1000000);
	await redisClient.set(`register-user-otp:${email}`, String(otpValue), {
		EX: 5 * 60,
	});
	await redisClient.set(`user-registration-data:${email}`, redisUserData, {
		EX: 5 * 60,
	});

	const templateData = {
		name: parsedData.name,
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
const resendForgotPasswordOtp = async (payload: { email: string }) => {
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
	const templatePath = path.join(process.cwd(), "src", "app", "templates", "forgot-password.ejs");

	const html = await ejs.renderFile(templatePath, { otp, email });

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Password Reset OTP",
		html,
	});
};
const resendOtp = async (payload: IResendOtpPayload) => {
	if (payload.type === "password") {
		await resendForgotPasswordOtp({ email: payload.email });
		return;
	}
	await resendRegisterOtp({ email: payload.email });
};
export const authService = {
	registerUser,
	verifyUserEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	resendOtp
};