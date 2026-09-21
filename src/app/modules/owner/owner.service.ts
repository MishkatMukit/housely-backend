import { ApplicationStatus, LeaseStatus, OwnerStatus, Role, TenantStatus, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { IApplyOwnerPayload, IListOwnersQuery, IRejectOwnerPayload, IUpdateOwnerProfilePayload } from "../../Interfaces/owner.interface";
import type { UploadApiResponse } from "cloudinary";
import type { Prisma } from "../../../generated/prisma/client";
import ejs from "ejs";
import path from "path";
import { cloudinary } from "../../lib/cloudinary";
import config from "../../config";
import { transporter } from "../../lib/nodemailer";

const applyAsOwner = async (userId: string, payload: IApplyOwnerPayload, verificationFiles: Express.Multer.File[]) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.BLOCKED) {
        throw new AppError("Blocked users cannot apply as owner", httpStatus.FORBIDDEN);
    }

    const existingOwner = await prisma.owner.findUnique({
        where: { userId },
    });

    if (existingOwner?.status === OwnerStatus.PENDING) {
        throw new AppError("Your owner application is already under review", httpStatus.CONFLICT);
    }

    if (existingOwner?.status === OwnerStatus.APPROVED) {
        throw new AppError("You are already an approved owner", httpStatus.CONFLICT);
    }

    const oldPublicIds: string[] =
        existingOwner?.status === OwnerStatus.REJECTED
            ? (((existingOwner.verificationDocuments as unknown as { publicId?: string }[] | null) ?? [])
                .map((d) => d?.publicId)
                .filter((id): id is string => typeof id === "string" && id.length > 0))
            : [];

    const uploadedResults: UploadApiResponse[] = [];
    try {
        const uploadOne = (file: Express.Multer.File) =>
            new Promise<UploadApiResponse>((resolve, reject) => {
                cloudinary.uploader
                    .upload_stream(
                        {
                            resource_type: "auto",
                            folder: `housely/owner-verifications/${userId}`,
                        },
                        (error, result) => {
                            if (error) return reject(error);
                            if (!result) {
                                return reject(
                                    new AppError("File Upload Failed", httpStatus.INTERNAL_SERVER_ERROR),
                                );
                            }
                            resolve(result);
                        },
                    )
                    .end(file?.buffer);
            });
        uploadedResults.push(...(await Promise.all(verificationFiles.map(uploadOne))));

        const documents = uploadedResults.map(result => ({
            url: result.secure_url,
            publicId: result.public_id
        }));

        const [ownerApplication] = existingOwner
            ? await prisma.$transaction([
                prisma.owner.update({
                    where: { userId },
                    data: {
                        status: OwnerStatus.PENDING,
                        contactNumber: payload.contactNumber.trim(),
                        verificationDocuments: documents,
                        rejectionReason: null,
                        reviewedBy: null,
                        reviewedAt: null,
                    },
                    include: {
                        user: { omit: { password: true } },
                    },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: {
                        address: payload.address.trim(),
                        nationalIdNumber: payload.nationalIdNumber.trim(),
                    },
                }),
            ])
            : await prisma.$transaction([
                prisma.owner.create({
                    data: {
                        userId,
                        status: OwnerStatus.PENDING,
                        contactNumber: payload.contactNumber.trim(),
                        verificationDocuments: documents,
                    },
                    include: {
                        user: { omit: { password: true } },
                    },
                }),
                prisma.user.update({
                    where: { id: userId },
                    data: {
                        address: payload.address.trim(),
                        nationalIdNumber: payload.nationalIdNumber.trim(),
                    },
                }),
            ]);

        // Re-application replaces old docs — delete the superseded files (best-effort)
        if (oldPublicIds.length > 0) {
            await Promise.all(
                oldPublicIds.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => null)),
            );
        }

        // Re-read so the nested user reflects the synced address / NID
        // (the include inside the transaction snapshots the user before its update)
        const freshApplication = await prisma.owner.findUnique({
            where: { userId },
            include: { user: { omit: { password: true } } },
        });

        return freshApplication ?? ownerApplication;
    } catch (error) {
        // Roll back uploaded files so a failed application leaves no orphans
        await Promise.all(
            uploadedResults.map(result => cloudinary.uploader.destroy(result.public_id).catch(() => null))
        );
        throw error;
    }
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
            { user: { name: { contains: query.search, mode: "insensitive" } } },
            { user: { email: { contains: query.search, mode: "insensitive" } } },
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

// Admin queue of owner applications. Defaults to PENDING so the
// endpoint serves as the review inbox; pass status explicitly for
// APPROVED / REJECTED history. Shaped as applications (applicant +
// documents + review info), unlike listOwners which is a directory.
const viewOwnerApplications = async (query: IListOwnersQuery) => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, unknown> = {
        status: query.status ?? OwnerStatus.PENDING,
    };

    if (query.search) {
        whereCondition.OR = [
            { user: { name: { contains: query.search, mode: "insensitive" } } },
            { user: { email: { contains: query.search, mode: "insensitive" } } },
            { contactNumber: { contains: query.search, mode: "insensitive" } },
        ];
    }

    const [applications, total] = await Promise.all([
        prisma.owner.findMany({
            where: whereCondition,
            skip,
            take: limit,
            select: {
                id: true,
                status: true,
                contactNumber: true,
                verificationDocuments: true,
                rejectionReason: true,
                rejectionHistory: true,
                reviewedBy: true,
                reviewedAt: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        emailVerified: true,
                        address: true,
                        nationalIdNumber: true,
                        imageUrl: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.owner.count({ where: whereCondition }),
    ]);

    return {
        data: applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

const approveOwner = async (ownerId: string, adminId: string) => {
    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
    });

    if (!owner) {
        throw new AppError("Owner Not Found", httpStatus.NOT_FOUND);
    }

    if (owner.status === OwnerStatus.APPROVED) {
        throw new AppError("Owner Is Already Approved", httpStatus.CONFLICT);
    }

    if (owner.status === OwnerStatus.REJECTED) {
        throw new AppError("Rejected applications cannot be approved. Ask the user to resubmit.", httpStatus.CONFLICT);
    }

    const [updatedOwner] = await prisma.$transaction([
        prisma.owner.update({
            where: { id: ownerId },
            data: {
                status: OwnerStatus.APPROVED,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
            include: { user: { omit: { password: true } } },
        }),
        // Flip user role to OWNER
        prisma.user.update({
            where: { id: owner.userId },
            data: { role: Role.OWNER },
        }),
        // Set tenant to INACTIVE
        prisma.tenant.updateMany({
            where: { userId: owner.userId },
            data: { status: TenantStatus.INACTIVE },
        }),
    ]);

    const ownerUser = updatedOwner.user;
    if (ownerUser?.email) {
        await sendOwnerWelcomeMail(ownerUser.name, ownerUser.email);
    }

    return updatedOwner;
};

const sendOwnerWelcomeMail = async (name: string, email: string) => {
    try {
        const templatePath = path.join(process.cwd(), "src", "app", "templates", "welcome-owner.ejs");
        const dashboardUrl = config.app_url ? `${config.app_url}/dashboard/owner` : undefined;
        const html = await ejs.renderFile(templatePath, { name, email, dashboardUrl });
        await transporter.sendMail({
            from: config.email_sender,
            to: email,
            subject: "Welcome to Housely — Your Owner Account Is Approved",
            html,
        });
    } catch (error) {
        console.error("Failed to send owner welcome email:", error);
    }
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

    if (owner.status === OwnerStatus.APPROVED) {
        throw new AppError("Approved owners cannot be rejected", httpStatus.CONFLICT);
    }

    const rejectedAt = new Date();
    const history = Array.isArray(owner.rejectionHistory)
        ? JSON.parse(JSON.stringify(owner.rejectionHistory)) as Record<string, unknown>[]
        : [] as Record<string, unknown>[];
    history.push({
        reason: payload.rejectionReason,
        rejectedBy: adminId,
        rejectedAt: rejectedAt.toISOString(),
    });

    const updatedOwner = await prisma.owner.update({
        where: { id: ownerId },
        data: {
            status: OwnerStatus.REJECTED,
            rejectionReason: payload.rejectionReason,
            rejectionHistory: history as unknown as Prisma.InputJsonValue,
            reviewedBy: adminId,
            reviewedAt: rejectedAt,
        },
        include: { user: { omit: { password: true } } },
    });

    const rejectedUser = updatedOwner.user;
    if (rejectedUser?.email) {
        try {
            const templatePath = path.join(process.cwd(), "src", "app", "templates", "application-rejected.ejs");
            const html = await ejs.renderFile(templatePath, { name: rejectedUser.name, reason: payload.rejectionReason });
            await transporter.sendMail({
                from: config.email_sender,
                to: rejectedUser.email,
                subject: "Update on Your Housely Owner Application",
                html,
            });
        } catch (error) {
            console.error("Failed to send owner rejection email:", error);
        }
    }

    return updatedOwner;
};

const updateOwnerProfile = async (userId: string, payload: IUpdateOwnerProfilePayload) => {
    const owner = await prisma.owner.findUnique({
        where: { userId },
    });

    if (!owner) {
        throw new AppError("Owner Profile Not Found", httpStatus.NOT_FOUND);
    }

    const { contactNumber, name, address, gender, nationalIdNumber } = payload;

    const ownerData: Record<string, unknown> = {};
    if (contactNumber !== undefined) {
        ownerData.contactNumber = contactNumber.trim();
    }

    const userData: Record<string, unknown> = {};
    if (name !== undefined) userData.name = name.trim();
    if (address !== undefined) userData.address = address.trim();
    if (gender !== undefined) userData.gender = gender;
    if (nationalIdNumber !== undefined) userData.nationalIdNumber = nationalIdNumber.trim();

    // Apply updates atomically so Owner + User never drift out of sync.
    if (Object.keys(ownerData).length > 0 && Object.keys(userData).length > 0) {
        await prisma.$transaction([
            prisma.owner.update({ where: { userId }, data: ownerData }),
            prisma.user.update({ where: { id: userId }, data: userData }),
        ]);
    } else if (Object.keys(ownerData).length > 0) {
        await prisma.owner.update({ where: { userId }, data: ownerData });
    } else {
        await prisma.user.update({ where: { id: userId }, data: userData });
    }

    const freshOwner = await prisma.owner.findUnique({
        where: { userId },
        include: { user: { omit: { password: true } } },
    });

    return freshOwner;
};

export const ownerService = {
    applyAsOwner,
    getOwnerProfile,
    listOwners,
    viewOwnerApplications,
    approveOwner,
    rejectOwner,
    updateOwnerProfile,
}
