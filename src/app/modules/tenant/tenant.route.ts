import { Router } from "express";
import { tenantController } from "./tenant.controller";
import { tenantValidation } from "./tenant.validation";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();


router.get(
    "/me",
    auth(Role.TENANT),
    tenantController.getMyProfile,
);

router.patch(
    "/me",
    auth(Role.TENANT),
    validateRequest(tenantValidation.updateTenantProfileSchema),
    tenantController.updateMyProfile,
);

export { router as tenantRoutes };
