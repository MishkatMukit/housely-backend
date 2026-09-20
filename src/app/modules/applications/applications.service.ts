import { OwnerStatus } from "../../../generated/prisma/enums";
import type { IViewOwnerApplicationsQuery } from "../../Interfaces/applications.interface";
import { prisma } from "../../lib/prisma";



// Admin queue of owner applications. Defaults to PENDING so the
// endpoint serves as the review inbox; pass status explicitly for
// APPROVED / REJECTED history. Shaped as applications (applicant +
// documents + review info), unlike listOwners which is a directory.
const viewOwnerApplications = async (query: IViewOwnerApplicationsQuery) => {
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

export const applicationService = {
    viewOwnerApplications,
};
