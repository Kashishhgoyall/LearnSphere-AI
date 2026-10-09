
import { useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const API_URL = "http://localhost:5000/api/interview";

const InterviewPractice = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewAnalysis, setInterviewAnalysis] = useState("");
  const [processingInterview, setProcessingInterview] = useState(false);

  // Extract selectable text from every page of the PDF.
  const extractPdfText = async (selectedFile) => {
    const data = await selectedFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      text +=
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ") + "\n";
    }

    return text.trim();
  };

  // Send JSON to the backend and handle errors.
  const postToBackend = async (endpoint, body) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  };

  // Step 1: Analyze the uploaded resume.
  const analyzeResume = async (event) => {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("Please upload a PDF resume first.");
      return;
    }

    setLoading(true);

    try {
      const resumeText = await extractPdfText(file);

      if (!resumeText) {
        throw new Error(
          "No selectable text found. Please use a text-based PDF resume."
        );
      }

      const data = await postToBackend("analyze-resume", {
        resumeText,
      });

      setAnalysis(data.analysis);
    } catch (err) {
      console.error("Resume analysis error:", err);
      setError(err.message || "Unable to analyze your resume.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate five questions based on the resume.
  const generateQuestions = async (resumeAnalysis) => {
    setError("");

    try {
      const data = await postToBackend("generate-questions", {
        resumeAnalysis,
      });

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("The server did not return any interview questions.");
      }

      setQuestions(data.questions);
      setAnswers([]);
      setCurrentQuestion(0);
      setInterviewAnalysis("");
      setInterviewStarted(true);
    } catch (err) {
      console.error("Question generation error:", err);
      setError(err.message || "Unable to generate interview questions.");
    }
  };

  const startInterview = async () => {
    if (!analysis) {
      setError("Analyze your resume before starting the interview.");
      return;
    }

    await generateQuestions(analysis);
  };

  // Step 3: Speech recognition.
  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported by this browser. Try Chrome."
      );
      return;
    }

    setError("");

    try {
      const speech = new SpeechRecognition();
      speech.continuous = true;
      speech.interimResults = true;
      speech.lang = "en-IN";

      speech.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");

        setAnswers((previous) => {
          const updated = [...previous];
          updated[currentQuestion] = transcript;
          return updated;
        });
      };

      speech.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setError(`Speech recognition issue: ${event.error}`);
        setIsRecording(false);
        setRecognition(null);
      };

      speech.onend = () => {
        setIsRecording(false);
        setRecognition(null);
      };

      speech.start();
      setRecognition(speech);
      setIsRecording(true);
    } catch (err) {
      console.error("Unable to start recording:", err);
      setError("Could not access speech recognition. Check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
    }

    setRecognition(null);
    setIsRecording(false);
  };

  // Step 4: Evaluate all interview answers.
  const analyzeInterview = async () => {
    setError("");
    setProcessingInterview(true);

    try {
      if (recognition) {
        recognition.stop();
        setRecognition(null);
        setIsRecording(false);
      }

      const data = await postToBackend("analyze-answers", {
        questions,
        answers,
      });

      setInterviewAnalysis(data.analysis);
    } catch (err) {
      console.error("Interview evaluation error:", err);
      setError(err.message || "Unable to evaluate your answers.");
    } finally {
      setProcessingInterview(false);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    } else {
      await analyzeInterview();
    }
  };

  const restartPractice = () => {
    stopRecording();
    setAnalysis("");
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestion(0);
    setInterviewStarted(false);
    setInterviewAnalysis("");
    setError("");
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
            AI Interview Practice
          </h1>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-600"
            >
              {error}
            </div>
          )}

          {!interviewStarted ? (
            <>
              {!analysis ? (
                <form onSubmit={analyzeResume} className="space-y-6">
                  <div className="text-center">
                    <p className="mb-4 text-lg text-gray-600">
                      Upload your resume to start a personalized interview
                      practice session.
                    </p>

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      id="resume-upload"
                      className="hidden"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        setError("");
                      }}
                    />

                    <label
                      htmlFor="resume-upload"
                      className="inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
                    >
                      Upload Resume (PDF)
                    </label>

                    {file && (
                      <p className="mt-3 break-all text-sm text-gray-600">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>

                  {file && (
                    <div className="text-center">
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-green-600 px-6 py-3 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? "Analyzing Resume..." : "Analyze Resume"}
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg bg-gray-50 p-6">
                    <h2 className="mb-4 text-xl font-semibold">
                      Resume Analysis
                    </h2>

                    <div className="whitespace-pre-wrap break-words text-gray-700">
                      {analysis}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={startInterview}
                      className="rounded-lg bg-blue-600 px-8 py-3 text-white transition hover:bg-blue-700"
                    >
                      Start Interview Practice
                    </button>

                    <button
                      onClick={restartPractice}
                      className="rounded-lg bg-gray-200 px-6 py-3 text-gray-800 transition hover:bg-gray-300"
                    >
                      Upload Another Resume
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {questions.length > 0 && !interviewAnalysis && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold">
                      Question {currentQuestion + 1} of {questions.length}
                    </h2>

                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`rounded-lg px-4 py-2 text-white transition ${
                        isRecording
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isRecording ? "Stop Recording" : "Start Recording"}
                    </button>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-6">
                    <h3 className="mb-2 text-lg font-medium">
                      {questions[currentQuestion]?.question}
                    </h3>

                    <p className="text-sm text-gray-500">
                      Type: {questions[currentQuestion]?.type || "Technical"}
                    </p>

                    {questions[currentQuestion]?.category && (
                      <p className="mt-1 text-sm text-gray-500">
                        Category: {questions[currentQuestion].category}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-6">
                    <h3 className="mb-4 text-lg font-medium">Your Answer</h3>

                    <textarea
                      value={answers[currentQuestion] || ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setAnswers((previous) => {
                          const updated = [...previous];
                          updated[currentQuestion] = value;
                          return updated;
                        });
                      }}
                      placeholder="Type your answer here or use Start Recording..."
                      rows={6}
                      className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <button
                      onClick={() =>
                        setCurrentQuestion((previous) =>
                          Math.max(0, previous - 1)
                        )
                      }
                      disabled={currentQuestion === 0 || processingInterview}
                      className="rounded-lg bg-gray-200 px-5 py-3 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      onClick={nextQuestion}
                      disabled={processingInterview}
                      className="rounded-lg bg-green-600 px-5 py-3 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {processingInterview
                        ? "Evaluating..."
                        : currentQuestion === questions.length - 1
                          ? "Submit Interview"
                          : "Next Question"}
                    </button>
                  </div>
                </>
              )}

              {interviewAnalysis && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Interview Analysis</h2>

                  <div className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-6 text-gray-700">
                    {interviewAnalysis}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={restartPractice}
                      className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
                    >
                      Practice Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPractice;