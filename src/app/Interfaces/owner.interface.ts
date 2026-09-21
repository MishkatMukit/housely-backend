import type { OwnerStatus } from "../../generated/prisma/enums";

export interface IApplyOwnerPayload {
    contactNumber: string;
    address: string;
    nationalIdNumber: string;
}

export interface IUpdateOwnerProfilePayload {
    contactNumber?: string;
}

export interface IRejectOwnerPayload {
    rejectionReason: string;
}

export interface IListOwnersQuery {
    page?: number;
    limit?: number;
    status?: OwnerStatus;
    search?: string;
}