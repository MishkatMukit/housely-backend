import { Router } from "express";
import auth from "../../middleware/auth";
import { validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";
import { applicationController } from "./applications.controller";
import { applicationValidation } from "./applications.validation";

const router = Router();

router.get(
    "/owner-applications",
    auth(Role.ADMIN, Role.SUPERADMIN),
    validateQuery(applicationValidation.viewOwnerApplicationsQuerySchema),
    applicationController.viewOwnerApplications,
);

export const applicationRoutes = router;
