import type { TenantStatus } from "../../generated/prisma/enums";

export interface IUpdateTenantProfilePayload {
    name?: string;
    address?: string;
    gender?: "MALE" | "FEMALE";
    nationalIdNumber?: string;
    contactNumber?: string;
    employmentStatus?: string;
    aboutMe?: string;
}

export interface IListTenantsQuery {
    page?: number;
    limit?: number;
    status?: TenantStatus;
    search?: string;
}
