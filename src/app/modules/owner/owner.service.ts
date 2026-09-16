import { OwnerStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { IApplyOwnerPayload } from "../../Interfaces/owner.interface";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import bcrypt from "bcryptjs";
import config from "../../config";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";

const applyAsOwner = async (payload: IApplyOwnerPayload, additionalFiles: Express.Multer.File[]) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            email: payload.user.email
        }
    })
    if (isUserExist) {
        throw new AppError("User With This Email Already Exists", httpStatus.CONFLICT);
    }

    const additionalFilesUploadResults = await Promise.all(additionalFiles.map(file => {
        return new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: "auto"
                },
                async (error: any, result) => {
                    if (error) {
                        return reject(error)
                    }
                    if (!result) {
                        return reject(new AppError("File Upload Failed", httpStatus.INTERNAL_SERVER_ERROR))
                    }
                    resolve(result)
                }).end(file?.buffer)

        })
    }))

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, Number(config.bcrypt_salt_rounds));

    const ownerApplication = await prisma.user.create({
        data: {
            ...payload.user,
            password: hashedPassword,
            role: Role.OWNER,
            owner: {
                create: {
                    ...payload.owner,
                    status: OwnerStatus.PENDING,
                    verificationDocuments: additionalFilesUploadResults.map(result => ({
                        url: result.secure_url,
                        publicId: result.public_id
                    }))
                }
            }

        },
        include: {
            owner: true
        }
    })
    const expirationSeconds = 60 * 60

    const otpKey = `owner-application:otp:${payload.user.email}`
    const otpValue = crypto.randomInt(100000, 1000000).toString()

    await redisClient.set(otpKey, otpValue, {
        EX: expirationSeconds
    })

    const templatePath = path.join(
        process.cwd(), "src/app/templates/register-owner.ejs"
    )

    const html = await ejs.renderFile(templatePath, {
        name: payload.user.name,
        email: payload.user.email,
        otp: otpValue
    }).catch(async () => {
        // Fallback to register-patient.ejs if register-owner.ejs doesn't exist
        const fallbackPath = path.join(
            process.cwd(), "src/app/templates/register-patient.ejs"
        )
        return await ejs.renderFile(fallbackPath, {
            name: payload.user.name,
            email: payload.user.email,
            otp: otpValue
        })
    });

    await transporter.sendMail({
        from: config.smtp_user || config.email_sender,
        to: payload.user.email,
        subject: "Verify your email for owner application",
        html: html
    })
    return ownerApplication;
}

export const ownerService = {
    applyAsOwner
}