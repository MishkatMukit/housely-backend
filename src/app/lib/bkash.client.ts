import httpStatus from "http-status";
import config from "../config";
import type { PaymentModel } from "../../generated/prisma/models";
import { getBkashIdToken } from "./bkash";
import { AppError } from "../utils/appError";

interface IBkashCreatePaymentResponse {
	paymentID: string;
	createTime: string;
	organizationName: string;
	status: string;
	transactionStatus: string;
	amount: string;
	currency: string;
	intent: string;
	merchantInvoiceNumber: string;
	bkashURL: string;
	callbackURL: string;
	successCallbackURL: string;
	failureCallbackURL: string;
	cancelCallbackURL: string;
}

interface IBkashExecutePaymentResponse {
	paymentID: string;
	transactionStatus: string;
	merchantInvoiceNumber: string;
	amount: string;
	currency: string;
	intent: string;
	paymentCreateTime: string;
	paymentExecuteTime: string;
	trxID: string;
	transactionId: string;
	verificationStatus: string;
	customerMsisdn: string;
}

interface IBkashQueryPaymentResponse {
	paymentID: string;
	trxID: string;
	transactionStatus: string;
	transactionRef?: string;
	paymentExecuteTime?: string;
	customerMsisdn?: string;
	errorMessage?: string;
}

const bkashRequest = async <T>(
	path: string,
	body: Record<string, unknown>,
): Promise<T> => {
	const token = await getBkashIdToken();
	const response = await fetch(`${config.bkash_base_url}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			...((token && { authorization: token }) as Record<string, string>),
			"X-App-Key": config.bkash_app_key,
		},
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new AppError(
			"bKash Checkout API request failed",
			httpStatus.BAD_GATEWAY,
		);
	}
	return (await response.json()) as T;
};

const createPayment = async (payload: {
	invoice: string;
	amount: string;
	callbackURL: string;
	payerReference: string;
}) => {
	return bkashRequest<IBkashCreatePaymentResponse>(
		"/tokenized/checkout/create",
		{
			mode: "0011",
			payerReference: payload.payerReference,
			callbackURL: payload.callbackURL,
			amount: payload.amount,
			currency: "BDT",
			intent: "sale",
			merchantInvoiceNumber: payload.invoice,
		},
	);
};

const executePayment = async (paymentID: string) => {
	return bkashRequest<IBkashExecutePaymentResponse>(
		"/tokenized/checkout/execute",
		{ paymentID },
	);
};

const queryPayment = async (paymentID: string) => {
	return await bkashRequest<IBkashQueryPaymentResponse>(
		"/tokenized/checkout/payment/status",
		{
			paymentID,
		},
	);
};

const formatPaymentId = (payment: PaymentModel) =>
	`${payment.tenantId.slice(0, 6)}-${payment.type}-${payment.amount.toFixed(2)}-${payment.id.slice(0, 8)}`;

export const bkashPaymentClient = {
	createPayment,
	executePayment,
	queryPayment,
	formatPaymentId,
};
