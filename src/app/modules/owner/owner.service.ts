import { ApplicationStatus, LeaseStatus, OwnerStatus, Role, TenantStatus } from "../../../generated/prisma/enums";
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

interface IUpdateOwnerProfilePayload {
    contactNumber?: string;
    companyName?: string;
}

interface IApproveOwnerPayload {
    approvalNotes?: string;
}

interface IRejectOwnerPayload {
    rejectionReason: string;
}

interface IListOwnersQuery {
    page?: number;
    limit?: number;
    status?: OwnerStatus;
    search?: string;
}

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

const getOwnerProfile = async (userId: string) => {
    const owner = await prisma.owner.findUnique({
        where: { userId },
        include: { user: { omit: { password: true } } },
    });

    if (!owner) {
        throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);
    }

    return owner;
};

const listOwners = async (query: IListOwnersQuery) => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, unknown> = {};

    if (query.status) {
        whereCondition.status = query.status;
    }

    if (query.search) {
        whereCondition.OR = [
            { user: { email: { contains: query.search, mode: "insensitive" } } },
            { user: { name: { contains: query.search, mode: "insensitive" } } },
            { companyName: { contains: query.search, mode: "insensitive" } },
        ];
    }

    const [owners, total] = await Promise.all([
        prisma.owner.findMany({
            where: whereCondition,
            skip,
            take: limit,
            include: { user: { omit: { password: true } } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.owner.count({ where: whereCondition }),
    ]);

    return {
        data: owners,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

const approveOwner = async (ownerId: string, adminId: string, payload: IApproveOwnerPayload) => {
    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
    });

    if (!owner) {
        throw new AppError("Owner Not Found", httpStatus.NOT_FOUND);
    }

    if (owner.status === OwnerStatus.APPROVED) {
        throw new AppError("Owner Is Already Approved", httpStatus.CONFLICT);
    }

    const updatedOwner = await prisma.owner.update({
        where: { id: ownerId },
        data: {
            status: OwnerStatus.APPROVED,
            reviewedBy: adminId,
            reviewedAt: new Date(),
        },
    });

    // Flip user role to OWNER
    await prisma.user.update({
        where: { id: owner.userId },
        data: { role: Role.OWNER },
    });

    // Set tenant to INACTIVE
    await prisma.tenant.updateMany({
        where: { userId: owner.userId },
        data: { status: TenantStatus.INACTIVE },
    });

    return updatedOwner;
};

const rejectOwner = async (ownerId: string, adminId: string, payload: IRejectOwnerPayload) => {
    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
    });

    if (!owner) {
        throw new AppError("Owner Not Found", httpStatus.NOT_FOUND);
    }

    if (owner.status === OwnerStatus.REJECTED) {
        throw new AppError("Owner Is Already Rejected", httpStatus.CONFLICT);
    }

    const updatedOwner = await prisma.owner.update({
        where: { id: ownerId },
        data: {
            status: OwnerStatus.REJECTED,
            rejectionReason: payload.rejectionReason,
            reviewedBy: adminId,
            reviewedAt: new Date(),
        },
    });

    return updatedOwner;
};

const updateOwnerProfile = async (userId: string, payload: IUpdateOwnerProfilePayload) => {
    const owner = await prisma.owner.findUnique({
        where: { userId },
    });

    if (!owner) {
        throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);
    }

    const updatedOwner = await prisma.owner.update({
        where: { userId },
        data: {
            ...(payload.contactNumber && { contactNumber: payload.contactNumber }),
            ...(payload.companyName && { companyName: payload.companyName }),
        },
    });

    return updatedOwner;
};

export const ownerService = {
    applyAsOwner,
    getOwnerProfile,
    listOwners,
    approveOwner,
    rejectOwner,
    updateOwnerProfile,
}