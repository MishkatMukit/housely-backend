import { OwnerStatus, UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { IApplyOwnerPayload, IUpdateOwnerProfilePayload } from "../../Interfaces/owner.interface";
import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";

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
    updateOwnerProfile,
}