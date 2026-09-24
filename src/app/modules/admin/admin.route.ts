import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import { validateParams } from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

const router = Router();

// NOTE: validateParams runs BEFORE auth (400 before 401).

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
