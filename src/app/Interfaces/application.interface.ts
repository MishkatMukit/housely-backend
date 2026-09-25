import type { ApplicationStatus } from "../../generated/prisma/enums";

export interface IApplyForFlatPayload {
	flatId: string;
	monthlyIncome?: number;
	employment?: string;
	message?: string;
}

export interface IRejectApplicationPayload {
	rejectionReason: string;
}

export interface IListApplicationsQuery {
	page?: number;
	limit?: number;
	status?: ApplicationStatus;
	flatId?: string;
	propertyId?: string;
}
