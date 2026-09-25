import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import validateRequest, {
	validateParams,
	validateQuery,
} from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

const router = Router();

// NOTE: validateParams/validateQuery run BEFORE auth (400 before 401).

router.get(
	"/users",
	validateQuery(adminValidation.listUsersQuerySchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.listUsers,
);
router.get(
	"/users/:id",
	validateParams(adminValidation.userIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.getUserById,
);

router.get(
	"/tenants",
	validateQuery(adminValidation.listTenantsQuerySchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.listTenants,
);

router.get(
	"/owners",
	validateQuery(adminValidation.listOwnersQuerySchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.listOwners,
);
router.get(
	"/owners/applications",
	validateQuery(adminValidation.listOwnersQuerySchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.viewOwnerApplications,
);
router.patch(
	"/owners/:id/approve",
	validateParams(adminValidation.ownerIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.approveOwner,
);
router.patch(
	"/owners/:id/reject",
	validateParams(adminValidation.ownerIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	validateRequest(adminValidation.rejectOwnerSchema),
	adminController.rejectOwner,
);

router.patch(
	"/users/:id/make-admin",
	validateParams(adminValidation.userIdParamSchema),
	auth(Role.SUPERADMIN),
	adminController.makeAdmin,
);
router.patch(
	"/users/:id/block",
	validateParams(adminValidation.userIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.blockUser,
);
router.patch(
	"/users/:id/unblock",
	validateParams(adminValidation.userIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.unblockUser,
);
router.delete(
	"/users/:id",
	validateParams(adminValidation.userIdParamSchema),
	auth(Role.ADMIN, Role.SUPERADMIN),
	adminController.deleteUser,
);

export const adminRoutes = router;
