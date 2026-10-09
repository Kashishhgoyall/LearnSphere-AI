# LearnSphere AI 🌐

### AI-Powered Learning and Interview Preparation Platform

LearnSphere AI is a full-stack web application that combines personalized course generation with AI-driven interview preparation. It helps learners explore new topics, learn through structured chapters and video resources, and prepare for technical interviews using their resumes and practice answers.

The platform integrates generative AI with a React frontend and a Node.js/Express backend to provide an interactive learning and interview practice experience.

## ✨ Features

### 📚 AI-Powered Course Generation

* Generate personalized courses based on user-provided topics and learning goals.
* Create structured chapters and learning content using the Gemini API.
* Discover relevant educational videos through the YouTube Data API.
* Present generated learning content through an interactive web interface.

### 🎯 AI-Powered Interview Preparation

* **Resume Upload:** Upload a resume in PDF format for interview preparation.
* **PDF Text Extraction:** Extract selectable text from resume pages using PDF.js.
* **Resume Analysis:** Analyze resume content to identify skills, projects, and potential interview topics.
* **AI-Generated Questions:** Generate interview questions based on the candidate's resume and technical background.
* **Answer Evaluation:** Submit answers and receive AI-generated feedback to identify strengths and areas for improvement.
* **Voice-Based Practice:** Use browser speech recognition, where supported, to provide spoken answers.
* **Text-Based Practice:** Type answers when voice recognition is unavailable or not preferred.

### 🔐 User Authentication

* User registration and login.
* Password hashing using bcryptjs.
* Token-based authentication using JSON Web Tokens (JWT).

### 🖥️ Full-Stack Architecture

* React-based frontend for an interactive user experience.
* Express.js REST APIs for backend operations.
* MongoDB for application data storage.
* Backend-managed AI requests to keep API credentials out of frontend source code.

## 🛠️ Tech Stack

| Category          | Technologies                 |
| ----------------- | ---------------------------- |
| Frontend          | React, JavaScript, HTML, CSS |
| Backend           | Node.js, Express.js          |
| Database          | MongoDB, Mongoose            |
| Generative AI     | Google Gemini API            |
| Video Resources   | YouTube Data API             |
| PDF Processing    | PDF.js                       |
| Authentication    | JWT, bcryptjs                |
| Development Tools | Git, GitHub, npm             |

## 🏗️ Application Architecture

```text
                    User
                     |
                     v
              React Frontend
                     |
           HTTP Requests / REST APIs
                     |
                     v
             Node.js + Express
               /           \
              /             \
             v               v
        MongoDB          Gemini API
             |
             v
      Application Data

React Frontend ------> YouTube Data API
       |
       +-------------> PDF.js
                       Resume text extraction
```

**Course generation workflow**

1. The user provides a topic or learning goal.
2. The frontend sends the request to the backend.
3. The backend communicates with the Gemini API to generate structured learning content.
4. The application presents the generated course and relevant video resources.

**Interview preparation workflow**

1. The user uploads a resume in PDF format.
2. PDF.js extracts selectable text from the document in the browser.
3. The frontend sends the extracted text to the interview-preparation REST API.
4. The backend requests resume analysis and personalized questions from Gemini.
5. The user answers questions through text or supported speech recognition.
6. The backend evaluates the answers and returns feedback to the frontend.

## 📂 Project Structure

```text
LearnSphere-AI/
├── backend/
│   ├── controllers/
│   │   └── interviewController.js
│   ├── routes/
│   │   └── interviewRoutes.js
│   ├── models/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── client/
│   ├── src/
│   │   └── components/
│   │       └── InterviewPractice.jsx
│   ├── index.html
│   └── package.json
│
├── .gitignore
└── README.md
```

*Note: The structure above highlights important application files. My actual project contains additional components, models, routes, and configuration files.*


## 🚀 Future Improvements

* Save generated courses, learning progress, and interview history to the database.
* Add difficulty-based questions and topic-wise practice sessions.
* Provide a dashboard for tracking interview preparation progress.
* Add automated tests for REST endpoints and core workflows.
* Improve rate-limit handling, loading states, and user-facing error messages.
* Deploy the frontend and backend with production-ready configuration.

---

**LearnSphere AI — Learn smarter. Practice better. Prepare with confidence.**
