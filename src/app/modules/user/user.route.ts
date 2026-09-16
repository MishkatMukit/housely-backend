import { Router } from "express"
import auth from "../../middleware/auth"
import { Role } from "../../../generated/prisma/enums"
import { userController } from "./user.controller"
import { upload } from "../../lib/multer"

const router = Router()

router.get("/profile", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), userController.getUserProfile);
router.patch("/profile-image", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), upload.single("profileImage"), userController.uploadProfileImage);

export const userRoutes = router