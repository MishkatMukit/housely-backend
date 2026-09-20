import type { UploadApiResponse } from "cloudinary"
import { cloudinary } from "../../lib/cloudinary"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/appError"
import { UserStatus } from "../../../generated/prisma/enums"
import httpStatus from "http-status"
import type { IListUsersQuery, IListUsersResponse, IUpdateProfilePayload } from "../../Interfaces/user.interface"

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

const listUsers = async (query: IListUsersQuery): Promise<IListUsersResponse> => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, unknown> = {
        isDeleted: false,
    };

    if (query.status) {
        whereCondition.status = query.status;
    }

    if (query.role) {
        whereCondition.role = query.role;
    }

    if (query.search) {
        whereCondition.OR = [
            { email: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where: whereCondition,
            skip,
            take: limit,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where: whereCondition }),
    ]);

    return {
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

const getUserById = async (userId: string) => {
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

    return user;
};

const blockUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.DELETED || user.isDeleted) {
        throw new AppError("Deleted users cannot be blocked", httpStatus.CONFLICT);
    }

    if (user.status === UserStatus.BLOCKED) {
        throw new AppError("User Is Already Blocked", httpStatus.CONFLICT);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            status: UserStatus.BLOCKED,
        },
        omit: {
            password: true,
        },
    });

    return updatedUser;
};

const unblockUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    if (user.status !== UserStatus.BLOCKED) {
        throw new AppError("User Is Not Blocked", httpStatus.CONFLICT);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            status: UserStatus.ACTIVE,
        },
        omit: {
            password: true,
        },
    });

    return updatedUser;
};

const deleteUser = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if(user?.isDeleted || user?.status === UserStatus.DELETED){
        throw new AppError("User is already Deleted", httpStatus.NOT_FOUND)
    }
    
    if (!user) {
        throw new AppError("User Not Found", httpStatus.NOT_FOUND);
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            status: UserStatus.DELETED,
            isDeleted: true,
            deletedAt: new Date(),
        },
    });

    return {
        id: userId,
        message: "User Deleted Successfully",
    };
};

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
    getUserById,
    listUsers,
    blockUser,
    unblockUser,
    deleteUser,
}