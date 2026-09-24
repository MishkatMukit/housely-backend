import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import validateRequest, {
	validateParams,
	validateQuery,
} from "../../middleware/validateRequest";
import { leaseController } from "./lease.controller";
import { leaseValidation } from "./lease.validation";

const router = Router();

// NOTE: validateParams/validateQuery run BEFORE auth (400 before 401).
// Ordering: static segments (/me, /owner) MUST be registered before /:id.

// Tenant: my leases
router.get(
	"/me",
	validateQuery(leaseValidation.listLeasesQuerySchema),
	auth(Role.TENANT),
	leaseController.listMyLeases,
);

// Owner: leases on my properties
router.get(
	"/owner",
	validateQuery(leaseValidation.listLeasesQuerySchema),
	auth(Role.OWNER),
	leaseController.listOwnerLeases,
);

// Scoped detail (tenant-of-lease / property owner / admin)
router.get(
	"/:id",
	validateParams(leaseValidation.leaseIdParamSchema),
	auth(Role.TENANT, Role.OWNER, Role.ADMIN, Role.SUPERADMIN),
	leaseController.getLeaseById,
);

router.patch(
	"/:id/terminate",
	validateParams(leaseValidation.leaseIdParamSchema),
	auth(Role.OWNER, Role.ADMIN, Role.SUPERADMIN),
	validateRequest(leaseValidation.terminateLeaseSchema),
	leaseController.terminateLease,
);

export { router as leaseRoutes };
