import { Router } from "express"
import auth from "../../middleware/auth"
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest"
import { Role } from "../../../generated/prisma/enums"
import { userController } from "./user.controller"
import { userValidation } from "./user.validation"
import { upload } from "../../lib/multer"

const router = Router()

router.get("/", auth(Role.ADMIN, Role.SUPERADMIN), validateQuery(userValidation.listUsersQuerySchema), userController.listUsers);
router.patch("/profile", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), validateRequest(userValidation.updateProfileSchema), userController.updateProfile);
router.get("/:id", auth(Role.ADMIN, Role.SUPERADMIN), validateParams(userValidation.userIdParamSchema), userController.getUserById);
router.patch("/:id/block", auth(Role.ADMIN, Role.SUPERADMIN), validateParams(userValidation.userIdParamSchema), userController.blockUser);
router.patch("/:id/unblock", auth(Role.ADMIN, Role.SUPERADMIN), validateParams(userValidation.userIdParamSchema), userController.unblockUser);
router.delete("/:id", auth(Role.ADMIN, Role.SUPERADMIN), validateParams(userValidation.userIdParamSchema), userController.deleteUser);
router.patch("/profile-image", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), upload.single("profileImage"), userController.uploadProfileImage);

export const userRoutes = router