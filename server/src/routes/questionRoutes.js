import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addQuestionsToBank,
  searchQuestionBank,
} from "../controllers/questionController.js";

const router = Router();

// Require authentication
router.use(authMiddleware);

// POST /api/questions/add
router.post("/add", addQuestionsToBank);

// GET /api/questions/search
router.get("/search", searchQuestionBank);

export default router;
