import { FieldValue, Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  createdAt: Timestamp | FieldValue;
  updateAt: Timestamp | FieldValue;
}

export interface UserProfile {
  id: string;
  userId: string;
  collegeName: string;
  currentYear: string;
  degree: string;
  branch: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
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

export interface InterviewReport {
  id: string;
  interviewId: string;
  userId: string;
  userName: string;
  overallRating: number;
  overallFeedback: string;
  questionFeedbacks: {
    question: string;
    userAnswer: string;
    idealAnswer: string;
    feedback: string;
    rating: number;
    strengths: string[];
    improvements: string[];
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeletedUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  deletedBy: string;
  reason: string;
  deletedAt: Timestamp;
}
