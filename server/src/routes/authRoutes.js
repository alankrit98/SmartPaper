import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/register — create a new user account
router.post("/register", register);

// POST /api/auth/login — authenticate and receive JWT
router.post("/login", login);

export default router;
