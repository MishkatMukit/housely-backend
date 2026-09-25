import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(authValidation.registerUserSchema),
	authController.registerUser,
);
router.post(
	"/verify-email",
	validateRequest(authValidation.verifyUserEmailSchema),
	authController.verifyUserEmail,
);
router.post(
	"/login",
	validateRequest(authValidation.loginUserSchema),
	authController.loginUser,
);
router.get(
	"/me",
	checkAuth(Role.ADMIN, Role.TENANT, Role.OWNER, Role.SUPERADMIN),
	authController.getMe,
);
router.post("/refresh-token", checkAuth(), authController.refreshToken);
router.post(
	"/google",
	validateRequest(authValidation.googleLoginSchema),
	authController.googleLogin,
);
router.post(
	"/forgot-password",
	validateRequest(authValidation.forgotPasswordSchema),
	authController.forgotPassword,
);
router.post(
	"/reset-password",
	validateRequest(authValidation.resetPasswordSchema),
	authController.resetPassword,
);

export const authRoutes = router;
