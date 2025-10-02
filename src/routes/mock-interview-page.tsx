/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interview } from "@/types";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { QuestionSection } from "@/components/question-section";
import { toast } from "sonner";
import { chatSession } from "@/scripts";

// 🔹 Gemini AI helper
async function generateQuestionsFromStoredInterview(
  interview: Interview
): Promise<string[]> {
  try {
    let parts: any[] = [];

    // If resume was uploaded and stored as base64
    if (interview.resumeFile) {
      parts.push({
        inlineData: {
          mimeType: interview.resumeFile.mimeType,
          data: interview.resumeFile.data,
        },
      });
    }

    // Add instruction
    parts.push({
      text: `You are an AI interview assistant. 
Based on this candidate's resume and the objective "${interview.objective}", and their selected interview type "${interview.interviewType}" and depth level "${interview.depthLevel}",
generate ${interview.numQuestions || 5} highly relevant interview questions. 
Return them only as a numbered list, no answers.`,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${
        import.meta.env.VITE_GEMINI_API_KEY
      }`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return text
      .split("\n")
      .map((q: string) => q.replace(/^\d+\.\s*/, "").trim())
      .filter((q: string) => q.length > 0);
  } catch (err) {
    console.error("Gemini error:", err);
    return [];
  }
}

export const MockInterviewPage = () => {
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

          // Always generate new questions on load, do not rely on Firestore
          toast("Generating questions...", {
            description: "Please wait while AI generates interview questions.",
          });
          const newQuestions = await generateQuestionsFromStoredInterview(
            fetched
          );
          setQuestions(newQuestions);

          if (newQuestions.length === 0) {
            toast.error("Failed to generate questions.", {
              description: "Please check your Gemini API key and try again.",
            });
          }
        } else {
          navigate("/generate", { replace: true });
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading interview");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewAndGenerateQuestions();
  }, [interviewId, navigate]);

  if (isLoading || !questions.length) {
    return <LoaderPage className="w-full h-[70vh]" />;
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
        <Alert className="bg-sky-100 border border-sky-200 p-4 rounded-lg flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-sky-600" />
          <div>
            <AlertTitle className="text-sky-800 font-semibold">
              Important Note
            </AlertTitle>
            <AlertDescription className="text-sm text-sky-700 mt-1 leading-relaxed">
              Press "Record Answer" to begin answering the question. Once you
              finish the interview, you’ll receive feedback comparing your
              responses with ideal answers.
              <br />
              <br />
              <strong>Note:</strong>{" "}
              <span className="font-medium">Your video is never recorded.</span>
              You can disable the webcam anytime if preferred.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      <div className="mt-4 w-full flex flex-col items-start gap-4">
        <QuestionSection
          questions={questions}
          interviewType={interview.interviewType}
          depthLevel={interview.depthLevel}
        />
      </div>
    </div>
  );
};