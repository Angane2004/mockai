<div align="center">

<!-- Place banner.png in /public and commit it for this to render -->
![AI Mock Interview](./public/banner.png)

<br/>

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white)

</div>

<br/>

A browser-based mock interview platform that generates interview questions, evaluates your spoken answers, and delivers a detailed performance report. It runs on two AI backends — **Ollama (local LLM)** when available on your machine, and **Google Gemini** as the cloud fallback. No human interviewer needed.

---

## How it works

```mermaid
flowchart TD
    A([User signs in via Clerk]) --> B{Choose interview type}
    B --> C[Job Description]
    B --> D[Resume-based]
    B --> E[Aptitude round]

    C --> F{AI Backend check}
    D --> F
    E --> F

    F -->|Ollama running locally| G[Llama3 / Llama2 via localhost:11434]
    F -->|Ollama unavailable| H[Google Gemini API]

    G --> I[Questions generated]
    H --> I

    I --> J[Live Interview Session]
    J --> J1[Webcam + Screen recording]
    J --> J2[Speech-to-text transcription]
    J --> J3[AI scores answers in real time]

    J1 & J2 & J3 --> K[Session saved to Firebase]

    K --> L[Feedback Report]
    L --> L1[Score per question]
    L --> L2[Improvement suggestions]
    L --> L3[Download as PDF]

    L1 & L2 & L3 --> M([Watch session replay])
```

---

## Features

- Create interviews from a **job description** or your **resume**
- **Dual AI backend** — uses Ollama (local LLM) when running, falls back to Gemini automatically
- **Speech-to-text** captures verbal responses in real time
- **Webcam + screen recording** for full session replay
- Detailed **feedback report** with per-question scores and suggestions
- Export your feedback as a **PDF**
- **Admin dashboard** to monitor candidates and sessions
- Secure auth with **Clerk** — protected routes out of the box
- Dark / light mode

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI, Framer Motion |
| AI (local) | Ollama — Llama3 / Llama2 via `localhost:11434` |
| AI (cloud) | Google Gemini (`@google/generative-ai`) |
| Auth | Clerk |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting / Docker |
| Forms | React Hook Form + Zod |
| Code Editor | Monaco Editor |
| PDF Export | jsPDF |

---

## Project structure

```
src/
├── api/                    # API layer
├── components/             # All UI components
│   ├── ui/                 # Base design system (buttons, modals, etc.)
│   ├── question-section-ollama.tsx
│   ├── enhanced-feedback-report.tsx
│   ├── container-recorder.tsx
│   ├── screen-interview-recorder.tsx
│   └── ...
├── routes/                 # Page-level components
│   ├── home.tsx
│   ├── dashboard.tsx
│   ├── mock-interview-page-ollama.tsx
│   ├── feedback.tsx
│   └── ...
├── layouts/                # Public, Auth, Protected layout wrappers
├── hooks/                  # Custom React hooks
├── services/               # Firebase service logic
├── types/                  # TypeScript types
└── config/                 # App-level configuration
```

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A [Firebase](https://firebase.google.com) project
- A [Clerk](https://clerk.com) application
- A [Google Gemini](https://aistudio.google.com) API key
- A [Ollama](https://ollama.com) installed locally for offline AI

### Setup

```bash
# 1. Clone
git clone https://github.com/your-username/aimock.git
cd aimock

# 2. Install dependencies
pnpm install

# 3. Add environment variables
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...

VITE_GEMINI_API_KEY=...

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Set to "true" to skip Ollama and always use Gemini
VITE_DISABLE_OLLAMA=false
```

> **Ollama setup (optional):** Install [Ollama](https://ollama.com), then run `ollama pull llama3` or `ollama pull llama2`. The app auto-detects whichever model is available at `http://localhost:11434` and uses it. If Ollama is not running or times out, it silently falls back to Gemini.

```bash
# 4. Start dev server
pnpm dev
```

Open `http://localhost:5173`

---

## Deployment

### Firebase Hosting

```bash
pnpm build
firebase deploy
```

### Docker

```bash
docker build -t aimock .
docker run -p 80:80 aimock
```

---

## Routes

| Path | Access | Page |
|---|---|---|
| `/` | Public | Landing page |
| `/about` | Public | About |
| `/signin` | Public | Sign in |
| `/signup` | Public | Sign up |
| `/admin-signin` | Public | Admin login |
| `/admin-dashboard` | Admin | Admin panel |
| `/generate` | Protected | Interview dashboard |
| `/generate/:id` | Protected | Edit interview |
| `/generate/interview/:id/start` | Protected | Live interview |
| `/generate/feedback/:id` | Protected | Feedback report |
| `/generate/watch-session/:id` | Protected | Session replay |
| `/generate/create/job-description` | Protected | Create from JD |
| `/generate/create/resume-based` | Protected | Create from resume |

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "add your feature"`
4. Push and open a pull request

---

<div align="center">
Built with React, TypeScript, and Google Gemini AI
</div>
