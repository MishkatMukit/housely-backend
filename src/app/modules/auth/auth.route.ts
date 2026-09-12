import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", authController.registerUser);
router.post("/verify-email", authController.verifyUserEmail);

export const authRoutes = router;