
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = () =>
  genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });

exports.analyzeResume = async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({
        message: "Resume text is required.",
      });
    }

    const prompt = `
Analyze this resume for interview preparation.

Provide:
1. Key technical skills and experience.
2. Potential interview questions based on the resume.
3. Important concepts the candidate should revise.
4. Areas where the resume may need clarification.

Resume:
${resumeText}
`;

    const result = await getModel().generateContent(prompt);

    return res.json({
      analysis: result.response.text(),
    });
  } catch (error) {
    console.error("Resume analysis error:", error.message);

    return res.status(500).json({
      message: "Resume analysis failed. Please try again.",
    });
  }
};

exports.generateQuestions = async (req, res) => {
  try {
    const { resumeAnalysis } = req.body;

    if (!resumeAnalysis || !resumeAnalysis.trim()) {
      return res.status(400).json({
        message: "Resume analysis is required.",
      });
    }

    const prompt = `
Generate exactly 5 interview questions based on this resume analysis.

Return only a valid JSON object with this format:
{
  "questions": [
    {
      "id": 1,
      "type": "technical",
      "question": "Question text",
      "category": "Java"
    }
  ]
}

Use a mix of relevant technical and project-based questions.
Do not include Markdown code fences.

Resume analysis:
${resumeAnalysis}
`;

    const result = await getModel().generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("Invalid questions response from AI.");
    }

    return res.json({
      questions: parsed.questions,
    });
  } catch (error) {
    console.error("Question generation error:", error.message);

    return res.status(500).json({
      message: "Question generation failed. Please try again.",
    });
  }
};

exports.analyzeAnswers = async (req, res) => {
  try {
    const { questions, answers } = req.body;

    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "Questions and answers must be provided.",
      });
    }

    const qaText = questions
      .map(
        (question, index) => `
Question: ${question.question}
Answer: ${answers[index] || "No answer provided"}
`
      )
      .join("\n");

    const prompt = `
Evaluate this mock interview fairly.

Provide:
1. Overall score out of 100.
2. Feedback for each answer.
3. Technical correctness and missing points.
4. Communication and clarity feedback.
5. Specific improvements and model answer suggestions.
6. Areas of strength.

Do not claim to measure real-world communication skills solely from written transcripts.

Interview questions and answers:
${qaText}
`;

    const result = await getModel().generateContent(prompt);

    return res.json({
      analysis: result.response.text(),
    });
  } catch (error) {
    console.error("Interview evaluation error:", error.message);

    return res.status(500).json({
      message: "Interview evaluation failed. Please try again.",
    });
  }
};