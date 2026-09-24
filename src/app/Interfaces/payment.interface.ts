import type { PaymentStatus, PaymentType } from "../../generated/prisma/enums";

export interface IRequestUser {
	id: string;
	email: string;
	role: string;
}

export interface ICreateBkashPaymentPayload {
	invoice: string;
	amount: string;
	callbackURL: string;
	payerReference: string;
}

export interface IPaymentListItem {
	id: string;
	amount: number;
	type: PaymentType;
	status: PaymentStatus;
	leaseId: string;
	tenantId: string;
	ownerId: string;
	periodStart?: Date | null;
	periodEnd?: Date | null;
	bkashTransactionId?: string | null;
	paidAt?: Date | null;
	paymentMethod?: string | null;
	createURL?: string | null;
	createdAt: Date;
}

export interface IInitiatePaymentResult {
	createURL: string;
	paymentID: string;
}

export interface IListMyPaymentsQuery {
	page?: number;
	limit?: number;
	status?: PaymentStatus;
	type?: PaymentType;
}

export interface IListPaymentsQuery {
	page?: number;
	limit?: number;
	status?: PaymentStatus;
	type?: PaymentType;
	leaseId?: string;
}
