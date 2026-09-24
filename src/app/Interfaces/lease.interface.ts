import type { LeaseStatus } from "../../generated/prisma/enums";

export interface ICreateLeasePayload {
  flatId: string;
  tenantId: string;
  amount?: number;
  startDate: Date;
  endDate: Date;
}

export interface ITerminateLeasePayload {
  rejectionReason?: string;
}

export interface IListLeasesQuery {
  page?: number;
  limit?: number;
  status?: LeaseStatus;
  propertyId?: string;
}