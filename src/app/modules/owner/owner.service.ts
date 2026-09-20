import { ApplicationStatus, LeaseStatus, OwnerStatus, Role, TenantStatus, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { IApplyOwnerPayload } from "../../Interfaces/owner.interface";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

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

    if (existingOwner) {
        throw new AppError("Owner application already exists for this user", httpStatus.CONFLICT);
    }

    const uploadedResults: UploadApiResponse[] = [];
    try {
        for (const file of verificationFiles) {
            const result = await new Promise<UploadApiResponse>((resolve, reject) => {
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
            });
            uploadedResults.push(result);
        }

        const ownerApplication = await prisma.owner.create({
            data: {
                userId,
                status: OwnerStatus.PENDING,
                ...(payload.contactNumber && { contactNumber: payload.contactNumber.trim() }),
                ...(payload.companyName && { companyName: payload.companyName.trim() }),
                verificationDocuments: uploadedResults.map(result => ({
                    url: result.secure_url,
                    publicId: result.public_id
                })),
            },
            include: {
                user: { omit: { password: true } },
            },
        });

        return ownerApplication;
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

const approveOwner = async (ownerId: string, adminId: string, _payload: IApproveOwnerPayload) => {
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
            // TODO: persist approvalNotes after migration adds owners.approvalNotes
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
