import { Router } from "express";
import { ownerController } from "./owner.controller";
import { ownerValidation } from "./owner.validation";
import { upload } from "../../lib/multer";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

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

export { router as ownerRoutes };
