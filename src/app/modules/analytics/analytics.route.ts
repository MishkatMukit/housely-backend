import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import { analyticsController } from "./analytics.controller";

const router = Router();

router.get("/admin", auth(Role.ADMIN, Role.SUPERADMIN), analyticsController.getAdminAnalytics);

router.get("/owner", auth(Role.OWNER), analyticsController.getOwnerAnalytics);

router.get("/tenant", auth(Role.TENANT), analyticsController.getTenantAnalytics);

export { router as analyticsRoutes };