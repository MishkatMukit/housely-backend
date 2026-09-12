import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", authController.registerUser);
router.post("/verify-email", authController.verifyUserEmail);
router.post("/login", authController.loginUser);

export const authRoutes = router;