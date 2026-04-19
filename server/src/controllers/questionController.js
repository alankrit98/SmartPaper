import { addQuestions, searchQuestions } from "../services/aiService.js";
import logger from "../utils/logger.js";

/**
 * @desc    Add questions to the question bank vector store
 * @route   POST /api/questions/add
 * @access  Private
 */
export const addQuestionsToBank = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400);
      throw new Error("Please provide an array of questions");
    }

    // Optional: Basic validation on question objects before sending to AI service
    for (const q of questions) {
      if (!q.text || !q.subject) {
        res.status(400);
        throw new Error("Each question must have text and a subject");
      }
    }

    logger.info(`User ${req.user?._id || "unknown"} is adding ${questions.length} questions`);

    const result = await addQuestions(questions);

    res.status(200).json({
      success: true,
      message: result.message || "Questions successfully added to the bank",
      added: result.added,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search the question bank vector store
 * @route   GET /api/questions/search
 * @access  Private
 */
export const searchQuestionBank = async (req, res, next) => {
  try {
    const { query, top_k, subject } = req.query;

    if (!query) {
      res.status(400);
      throw new Error("Search query is required");
    }

    const topKNumber = top_k ? parseInt(top_k, 10) : 5;

    logger.info(`User ${req.user?._id || "unknown"} is searching for: "${query}"`);

    const result = await searchQuestions(query, topKNumber, subject);

    res.status(200).json({
      success: true,
      query: result.query,
      total: result.total,
      results: result.results || [],
    });
  } catch (error) {
    next(error);
  }
};
