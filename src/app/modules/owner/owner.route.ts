import { Router } from "express";
import { ownerController } from "./owner.controller";
import { ownerValidation } from "./owner.validation";
import { upload } from "../../lib/multer";
import auth from "../../middleware/auth";
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// NOTE: validateParams/validateQuery run BEFORE auth (400 before 401).

// Tenant applies for upgrade to Owner
router.post(
    "/apply",
    auth(Role.TENANT),
    upload.fields([{ name: "verificationDocuments", maxCount: 4 }]),
    ownerController.applyAsOwner,
);

// Owner
router.get("/profile", auth(Role.OWNER), ownerController.getOwnerProfile);
router.patch("/update-profile", auth(Role.OWNER), validateRequest(ownerValidation.updateOwnerProfileSchema), ownerController.updateOwnerProfile);

// Admin / Superadmin
router.get("/", validateQuery(ownerValidation.listOwnersQuerySchema), auth(Role.ADMIN, Role.SUPERADMIN), ownerController.listOwners);
router.get("/applications", validateQuery(ownerValidation.listOwnersQuerySchema), auth(Role.ADMIN, Role.SUPERADMIN), ownerController.viewOwnerApplications);
router.patch("/approve/:id", validateParams(ownerValidation.ownerIdParamSchema), auth(Role.ADMIN, Role.SUPERADMIN), ownerController.approveOwner);
router.patch("/reject/:id", validateParams(ownerValidation.ownerIdParamSchema), auth(Role.ADMIN, Role.SUPERADMIN), validateRequest(ownerValidation.rejectOwnerSchema), ownerController.rejectOwner);

export { router as ownerRoutes };
