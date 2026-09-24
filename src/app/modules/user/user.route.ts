import { Router } from "express"
import auth from "../../middleware/auth"
import validateRequest, { validateParams, validateQuery } from "../../middleware/validateRequest"
import { Role } from "../../../generated/prisma/enums"
import { userController } from "./user.controller"
import { userValidation } from "./user.validation"
import { upload } from "../../lib/multer"

const router = Router()

// NOTE: validateParams/validateQuery run BEFORE auth (400 before 401).

router.get("/", validateQuery(userValidation.listUsersQuerySchema), auth(Role.ADMIN, Role.SUPERADMIN), userController.listUsers);
router.patch("/profile", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), validateRequest(userValidation.updateProfileSchema), userController.updateProfile);
router.get("/:id", validateParams(userValidation.userIdParamSchema), auth(Role.ADMIN, Role.SUPERADMIN), userController.getUserById);
router.patch("/profile-image", auth(Role.ADMIN, Role.SUPERADMIN, Role.OWNER, Role.TENANT), upload.single("profileImage"), userController.uploadProfileImage);

export const userRoutes = router
