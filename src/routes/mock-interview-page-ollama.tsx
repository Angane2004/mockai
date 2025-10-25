/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interview } from "@/types";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InteractiveLoadingPage } from "@/components/interactive-loading-page";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { QuestionSectionOllama } from "@/components/question-section-ollama";
import { toast } from "sonner";
import { aiService } from "@/scripts/ai-service"; // Import unified AI service

// AI helper function that works with both Ollama (local) and Gemini (cloud)
async function generateQuestionsFromStoredInterview(
  interview: Interview
): Promise<string[]> {
  try {
    // Extract resume text from base64 if available
    let resumeText = "";
    if (interview.resumeFile) {
      try {
        resumeText = atob(interview.resumeFile.data);
      } catch {
        resumeText = "Resume content available";
      }
    }

    // Use AI service (automatically selects Ollama or Gemini)
    const questions = await aiService.generateInterviewQuestions({
      objective: interview.objective || interview.position || 'General Interview',
      interviewType: interview.interviewType || 'Technical',
      depthLevel: interview.depthLevel || 'Intermediate',
      numQuestions: interview.numQuestions || 5,
      resumeText: resumeText || undefined,
    });

    if (questions.length === 0) {
      throw new Error("No questions were generated");
    }

    return questions;
  } catch (err) {
    console.error("AI generation error:", err);
    throw err;
  }
}

export const MockInterviewPageOllama = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterviewAndGenerateQuestions = async () => {
      if (!interviewId) {
        navigate("/generate", { replace: true });
        return;
      }
      try {
        setIsLoading(true);
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          const fetched = {
            id: interviewDoc.id,
            ...interviewDoc.data(),
          } as Interview;
          setInterview(fetched);

          // Generate questions using AI (Ollama or Gemini)
          toast("Generating questions with AI...", {
            description: "Please wait while AI generates interview questions.",
          });
          
          const newQuestions = await generateQuestionsFromStoredInterview(fetched);
          setQuestions(newQuestions);

          if (newQuestions.length === 0) {
            toast.error("Failed to generate questions.", {
              description: "Please try again.",
            });
          } else {
            const aiType = aiService.isUsingOllama() ? 'Ollama (local)' : 'Gemini API';
            toast.success("Questions generated successfully!", {
              description: `Generated ${newQuestions.length} questions using ${aiType}.`,
            });
          }
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Error loading interview";
        toast.error("Error", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewAndGenerateQuestions();
  }, [interviewId, navigate]);

  if (isLoading || !questions.length) {
    return (
      <InteractiveLoadingPage 
        loadingMessage="Generating Interview Questions"
        subtitle="Ultra-fast generation with smart caching!"
        estimatedTime={5}
        hasResume={!!interview?.resumeFile}
      />
    );
  }

  if (!interviewId || !interview) {
    navigate("/generate", { replace: true });
    return null;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <CustomBreadCrumb
        breadCrumbPage="Start"
        breadCrumpItems={[
          { label: "Mock Interviews", link: "/generate" },
          {
            label: interview?.name || "",
            link: `/generate/interview/${interview?.id}`,
          },
        ]}
      />

      <div className="w-full">
        <Alert className="bg-green-100 border border-green-200 p-4 rounded-lg flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <div>
            <AlertTitle className="text-green-800 font-semibold">
              Powered by AI
            </AlertTitle>
            <AlertDescription className="text-sm text-green-700 mt-1 leading-relaxed">
              Your interview questions and feedback are generated using AI (Ollama locally if available, or Gemini API in the cloud).
              <br />
              <br />
              <strong>How to use:</strong>{" "}
              Press "Record Answer" to begin answering each question. After completing
              all questions, you'll receive detailed AI-powered feedback.
              <br />
              <br />
              <strong>Privacy note:</strong>{" "}
              <span className="font-medium">Your video is never recorded.</span>
              You can disable the webcam anytime if preferred.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      <div className="mt-4 w-full flex flex-col items-start gap-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg w-full">
          <h3 className="text-blue-800 font-semibold mb-2">
            Generated Questions ({questions.length})
          </h3>
          <p className="text-sm text-blue-700">
            Questions tailored for {interview.interviewType} interview at {interview.depthLevel} level
          </p>
        </div>
        
        <QuestionSectionOllama
          questions={questions}
          interviewType={interview.interviewType || 'Technical'}
          depthLevel={interview.depthLevel || 'Intermediate'}
          duration={interview.duration || 30}
        />
      </div>
    </div>
  );
};