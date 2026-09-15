import { Router } from "express";
import { authController } from "./auth.controller";
import checkAuth from "../../middleware/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/register", authController.registerUser);
router.post("/verify-email", authController.verifyUserEmail);
router.post("/login", authController.loginUser);
router.get("/me", checkAuth(Role.ADMIN, Role.TENANT, Role.OWNER, Role.SUPERADMIN), authController.getMe);
router.post("/refresh-token", checkAuth(), authController.refreshToken)
router.post("/google", authController.googleLogin);
router.post("/forgot-password", authController.forgotPassword);

export const authRoutes = router;