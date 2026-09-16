import { Router } from "express"
import auth from "../../middleware/auth"
import { Role } from "../../../generated/prisma/enums"
import { userController } from "./user.controller"
import { upload } from "../../lib/multer"

const router = Router()

router.get("/", auth(Role.ADMIN, Role.SUPERADMIN), userController.listUsers);
router.get("/profile", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), userController.getUserProfile);
router.get("/:id", auth(Role.ADMIN, Role.SUPERADMIN), userController.getUserById);
router.patch("/profile-image", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), upload.single("profileImage"), userController.uploadProfileImage);

export const userRoutes = router