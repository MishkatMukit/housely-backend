import type { UploadApiResponse } from "cloudinary"
import { cloudinary } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/appError"
import { UserStatus } from "../../../generated/prisma/enums"
import httpStatus from "http-status"

const uploadProfileImage = async (buffer: Buffer, userId: string) => {

    const currentUser = await prisma.user.findUnique({
        where: {
            id: userId
        },
        omit: {
            password: true
        }
    })
    if (currentUser?.imagePublicId && currentUser.imagePublicId !== "") {
        await cloudinary.uploader.destroy(currentUser.imagePublicId)
    }

    const cloudinaryResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream({
            resource_type: "auto"
        }, async (error, result) => {
            if (error) {
                return reject(error)
            }
            // return result
            // console.log(result);
            if (!result) {
                return reject(new Error("Cloudinary upload failed"))
            }
            resolve(result)

        }).end(buffer)
    })
    const updatedUser = await prisma.user.update({
        where: {
            id: userId
        },
        data: {
            imageUrl: cloudinaryResult?.secure_url,
            imagePublicId: cloudinaryResult?.public_id
        },
        omit: {
            password: true,
            isDeleted: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
        }
    })

    return updatedUser;

}

const getUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        omit: {
            password: true,
        },
        include: {
            tenant: true,
            owner: true,
        },
    });

    if (!user) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.DELETED) {
        throw new AppError("User Account Deleted", httpStatus.FORBIDDEN);
    }

    return user;
};

export const userService = {
    uploadProfileImage,
    getUserProfile,
}