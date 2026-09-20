import { Router } from "express";
import { ownerController } from "./owner.controller";
import { upload } from "../../lib/multer";
import auth from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// Public / Tenant
router.post(
    "/apply",
    upload.fields([{ name: "verificationDocuments", maxCount: 2 }]),
    ownerController.applyAsOwner,
);

// Owner
router.get("/profile", auth(Role.OWNER), ownerController.getOwnerProfile);
router.patch("/profile", auth(Role.OWNER), ownerController.updateOwnerProfile);

// Admin / Superadmin
router.get("/", auth(Role.ADMIN, Role.SUPERADMIN), ownerController.listOwners);
router.patch("/:id/approve", auth(Role.ADMIN, Role.SUPERADMIN), ownerController.approveOwner);
router.patch("/:id/reject", auth(Role.ADMIN, Role.SUPERADMIN), ownerController.rejectOwner);

export { router as ownerRoutes };