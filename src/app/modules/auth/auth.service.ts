import type { IRegisterUserPayload } from "../../Interfaces/auth.interface";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";

const registerUser = async (payload: IRegisterUserPayload) => {
	const { name, password} = payload;

	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError("User With This Email Already Exists", httpStatus.CONFLICT);
	}

	const hashedPassword = await bcrypt.hash(password, 8);



	const otpValue = crypto.randomInt(100000, 1000000);
	const otpKey = `register-patient-otp:${email}`;

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: 5 * 60
		}
	})

	const patientRegistrationData = `petient-registration-data:${email}`;
	const redisUserDataPayload = {
		name,
		email,
		password: hashedPassword,
		patient: patientData
	}

	await redisClient.set(patientRegistrationData, JSON.stringify(redisUserDataPayload), {
		expiration: {
			type: "EX",
			value: 5 * 60
		}
	})

	const templateData = {
		name,
		email,
		otpValue,
		expirationTime: "5 minutes"
	}
	const templatePath = path.join(process.cwd(), "src", "app", "templates", "register-patient.ejs");
	const html = await ejs.renderFile(templatePath, templateData);
	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Patient Registration OTP",
		html
	});
};