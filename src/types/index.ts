import { FieldValue, Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: Timestamp | FieldValue;
  updateAt: Timestamp | FieldValue;
}

export interface Interview {
  id: string;
  position: string;
  description: string;
  experience: number;
  userId: string;
  techStack: string;
  questions: { question: string; answer: string }[];
  createdAt: Timestamp;
  updateAt: Timestamp;
  // Additional fields for enhanced interview types
  name?: string;
  objective?: string;
  interviewType?: string;
  depthLevel?: string;
  numQuestions?: number;
  duration?: number;
  company?: string;
  type?: string; // 'job-description' | 'resume-based'
  jobDescription?: string;
  companyName?: string;
  resumeFile?: {
    name: string;
    size: number;
    type: string;
    data: string;
    mimeType: string;
  };
  date?: Date | Timestamp;
  feedbackGenerated?: boolean;
}

export interface UserAnswer {
  id: string;
  mockIdRef: string;
  question: string;
  correct_ans: string;
  user_ans: string;
  feedback: string;
  rating: number;
  userId: string;
  createdAt: Timestamp;
  updateAt: Timestamp;
}
