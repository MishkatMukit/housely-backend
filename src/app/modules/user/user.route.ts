import { Router } from "express"
import auth from "../../middleware/auth"
import { Role } from "../../../generated/prisma/enums"
import { userController } from "./user.controller"
import { upload } from "../../lib/multer"

const router = Router()

router.get("/", auth(Role.ADMIN, Role.SUPERADMIN), userController.listUsers);
router.get("/:id", auth(Role.ADMIN, Role.SUPERADMIN), userController.getUserById);
router.patch("/:id/block", auth(Role.ADMIN, Role.SUPERADMIN), userController.blockUser);
router.patch("/:id/unblock", auth(Role.ADMIN, Role.SUPERADMIN), userController.unblockUser);
router.delete("/:id", auth(Role.ADMIN, Role.SUPERADMIN), userController.deleteUser);
router.patch("/profile-image", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), upload.single("profileImage"), userController.uploadProfileImage);

export const userRoutes = router