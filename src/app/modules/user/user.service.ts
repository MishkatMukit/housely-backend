import type { UploadApiResponse } from "cloudinary"
import { cloudinary } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/appError"
import { UserStatus } from "../../../generated/prisma/enums"
import httpStatus from "http-status"
import type { IUpdateProfilePayload } from "../../Interfaces/user.interface"

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

const updateUserProfile = async (
    userId: string,
    payload: IUpdateProfilePayload
) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: payload,
        omit: {
            password: true,
        },
    });

    return updatedUser;
};

export const userService = {
    uploadProfileImage,
    updateUserProfile,
}