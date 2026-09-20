import type { OwnerStatus } from "../../generated/prisma/enums";

export interface IApplyOwnerPayload {
    contactNumber?: string | undefined;
    companyName?: string | undefined;
}

export interface IUpdateOwnerProfilePayload {
    contactNumber?: string;
    companyName?: string;
}

export interface IApproveOwnerPayload {
    approvalNotes?: string;
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