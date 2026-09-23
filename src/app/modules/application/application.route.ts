import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import validateRequest, {
	validateParams,
	validateQuery,
} from "../../middleware/validateRequest";
import { applicationController } from "./application.controller";
import { applicationValidation } from "./application.validation";

const router = Router();

// NOTE: validateParams/validateQuery run BEFORE auth (400 before 401).
// Ordering: static segments (/me, /property/:propertyId) MUST be registered
// before /:id so "me"/"property" aren't captured as an application id.

// Tenant: apply
router.post(
	"/",
	auth(Role.TENANT),
	validateRequest(applicationValidation.applyForFlatSchema),
	applicationController.applyForFlat,
);

// Tenant: my applications
router.get(
	"/me",
	validateQuery(applicationValidation.listApplicationsQuerySchema),
	auth(Role.TENANT),
	applicationController.listMyApplications,
);

// Owner: property inbox
router.get(
	"/property/:propertyId",
	validateParams(applicationValidation.applicationPropertyIdParamSchema),
	validateQuery(applicationValidation.listApplicationsQuerySchema),
	auth(Role.OWNER),
	applicationController.listPropertyApplications,
);

// Tenant: withdraw own pending application
router.delete(
	"/:id/withdraw",
	validateParams(applicationValidation.applicationIdParamSchema),
	auth(Role.TENANT),
	applicationController.withdrawApplication,
);

// Owner/Admin: single application detail
router.get(
	"/:id",
	validateParams(applicationValidation.applicationIdParamSchema),
	auth(Role.OWNER, Role.ADMIN, Role.SUPERADMIN),
	applicationController.getApplicationById,
);

// Owner: decisions
router.patch(
	"/:id/approve",
	validateParams(applicationValidation.applicationIdParamSchema),
	auth(Role.OWNER),
	applicationController.approveApplication,
);

router.patch(
	"/:id/reject",
	validateParams(applicationValidation.applicationIdParamSchema),
	auth(Role.OWNER),
	validateRequest(applicationValidation.rejectApplicationSchema),
	applicationController.rejectApplication,
);

export { router as applicationRoutes };
