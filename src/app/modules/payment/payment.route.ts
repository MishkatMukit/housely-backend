import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { paymentController } from "./payment.controller";
import { paymentValidation } from "./payment.validation";

const router = Router();

// bKash callback redirect (no auth - inbound redirect from bKash gateway)
router.get(
	"/callback",
	validateQuery(paymentValidation.callbackQuerySchema),
	paymentController.handleCallback,
);

// Tenant: initiate bKash checkout for one of their payments
router.post(
	"/:id/checkout",
	validateParams(paymentValidation.paymentIdParamSchema),
	auth(Role.TENANT),
	paymentController.initiateCheckout,
);

// Tenant/Owner: verify a payment (reconcile after bKash redirect)
router.post(
	"/verify",
	auth(Role.TENANT, Role.OWNER),
	validateRequest(paymentValidation.verifyPaymentSchema),
	paymentController.verifyPayment,
);

// Tenant: my payments
router.get(
	"/me",
	auth(Role.TENANT),
	paymentController.listMyPayments,
);

// Owner: payments across my leases
router.get(
	"/owner",
	auth(Role.OWNER, Role.ADMIN, Role.SUPERADMIN),
	paymentController.listOwnerPayments,
);

export { router as paymentRoutes };
