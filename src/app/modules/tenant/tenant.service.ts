import { TenantStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
import type { IListTenantsQuery, IUpdateTenantProfilePayload } from "../../Interfaces/tenant.interface";

const resolveTenant = async (userId: string) => {
    const tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { user: { omit: { password: true } } },
    });

    if (!tenant) {
        throw new AppError("Tenant Profile Not Found", httpStatus.NOT_FOUND);
    }

    return tenant;
};

const getMyProfile = async (userId: string) => {
    return resolveTenant(userId);
};

const updateMyProfile = async (userId: string, payload: IUpdateTenantProfilePayload) => {
    const tenant = await resolveTenant(userId);

    if (tenant.status === TenantStatus.INACTIVE) {
        throw new AppError(
            "Your tenant profile is deactivated because this account is an owner",
            httpStatus.FORBIDDEN,
        );
    }

    const { name, address, gender, nationalIdNumber, contactNumber, employmentStatus, aboutMe } = payload;

    const tenantData: Record<string, unknown> = {};
    if (contactNumber !== undefined) tenantData.contactNumber = contactNumber.trim();
    if (employmentStatus !== undefined) tenantData.employmentStatus = employmentStatus.trim();
    if (aboutMe !== undefined) tenantData.aboutMe = aboutMe.trim();
    // Tenant.name is denormalized from User — keep both in sync
    if (name !== undefined) tenantData.name = name.trim();

    const userData: Record<string, unknown> = {};
    if (name !== undefined) userData.name = name.trim();
    if (address !== undefined) userData.address = address.trim();
    if (gender !== undefined) userData.gender = gender;
    if (nationalIdNumber !== undefined) userData.nationalIdNumber = nationalIdNumber.trim();

    // Apply updates atomically so Tenant + User never drift out of sync.
    if (Object.keys(tenantData).length > 0 && Object.keys(userData).length > 0) {
        await prisma.$transaction([
            prisma.tenant.update({ where: { userId }, data: tenantData }),
            prisma.user.update({ where: { id: userId }, data: userData }),
        ]);
    } else if (Object.keys(tenantData).length > 0) {
        await prisma.tenant.update({ where: { userId }, data: tenantData });
    } else if (Object.keys(userData).length > 0) {
        await prisma.user.update({ where: { id: userId }, data: userData });
    }

    return resolveTenant(userId);
};

const listTenants = async (query: IListTenantsQuery) => {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Record<string, unknown> = {};

    if (query.status) {
        whereCondition.status = query.status;
    }

    if (query.search) {
        whereCondition.OR = [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { contactNumber: { contains: query.search, mode: "insensitive" } },
            { user: { name: { contains: query.search, mode: "insensitive" } } },
            { user: { email: { contains: query.search, mode: "insensitive" } } },
        ];
    }

    const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
            where: whereCondition,
            skip,
            take: limit,
            include: { user: { omit: { password: true } } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.tenant.count({ where: whereCondition }),
    ]);

    return {
        data: tenants,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};

export const tenantService = {
    getMyProfile,
    updateMyProfile,
    listTenants,
};
