
const express = require("express");
const router = express.Router();

const {
  analyzeResume,
  generateQuestions,
  analyzeAnswers,
} = require("../controllers/interviewController");

router.post("/analyze-resume", analyzeResume);
router.post("/generate-questions", generateQuestions);
router.post("/analyze-answers", analyzeAnswers);

module.exports = router;