/* eslint-disable @typescript-eslint/no-unused-vars */
import { useAuth } from "@clerk/clerk-react";
import {
  CircleStop,
  Loader,
  Mic,
  RefreshCw,
  Save,
  Video,
  VideoOff,
  WebcamIcon,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import useSpeechToText, { ResultType } from "react-hook-speech-to-text";
import { useParams } from "react-router-dom";
import WebCam from "react-webcam";
import { TooltipButton } from "./tooltip-button";
import { toast } from "sonner";
import { ollamaService } from "@/scripts/ollama"; // Import Ollama service instead of Gemini
import { SaveModal } from "./save-modal";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";

interface RecordAnswerProps {
  question: { question: string; answer: string };
  isWebCam: boolean;
  setIsWebCam: (value: boolean) => void;
  onAnswerSaved: () => void;
  interviewType: string;
  depthLevel: string;
}

interface AIResponse {
  ratings: number;
  feedback: string;
  correct_ans: string;
}

export const RecordAnswerOllama = ({
  question,
  isWebCam,
  setIsWebCam,
  onAnswerSaved,
  interviewType,
  depthLevel,
}: RecordAnswerProps) => {
  const {
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const [userAnswer, setUserAnswer] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { userId } = useAuth();
  const { interviewId } = useParams();

  const recordUserAnswer = async () => {
    if (isRecording) {
      stopSpeechToText();

      if (userAnswer?.length < 30) {
        toast.error("Error", {
          description: "Your answer should be more than 30 characters",
        });

        return;
      }

      const aiResult = await generateResult(
        question.question,
        question.answer,
        userAnswer
      );

      setAiResult(aiResult);
    } else {
      startSpeechToText();
    }
  };

  const generateResult = async (
    qst: string,
    qstAns: string,
    userAns: string
  ): Promise<AIResponse> => {
    setIsAiGenerating(true);

    try {
      // Check if Ollama service is available
      const isHealthy = await ollamaService.checkHealth();
      if (!isHealthy) {
        throw new Error("Ollama service is not available. Please make sure Ollama is running.");
      }

      // Use Ollama service to generate feedback
      const aiResult = await ollamaService.generateFeedback(
        qst,
        userAns,
        interviewType,
        depthLevel
      );

      return aiResult;
    } catch (error) {
      console.log(error);
      toast.error("Error", {
        description: error instanceof Error 
          ? error.message 
          : "An error occurred while generating feedback.",
      });
      return { 
        ratings: 0, 
        feedback: "Unable to generate feedback", 
        correct_ans: "" 
      };
    } finally {
      setIsAiGenerating(false);
    }
  };

  const recordNewAnswer = () => {
    setUserAnswer("");
    stopSpeechToText();
    startSpeechToText();
  };

  const saveUserAnswer = async () => {
    setLoading(true);

    if (!aiResult) {
      return;
    }

    const currentQuestion = question.question;
    try {
      const userAnswerQuery = query(
        collection(db, "userAnswers"),
        where("userId", "==", userId),
        where("question", "==", currentQuestion)
      );
      const querySnap = await getDocs(userAnswerQuery);

      if (!querySnap.empty) {
        toast.info("Already Answered", {
          description: "You have already answered this question",
        });
        return;
      } else {
        await addDoc(collection(db, "userAnswers"), {
          mockIdRef: interviewId,
          question: question.question,
          correct_ans: aiResult.correct_ans,
          user_ans: userAnswer,
          feedback: aiResult.feedback,
          rating: aiResult.ratings,
          userId,
          createdAt: serverTimestamp(),
        });

        toast.success("Saved", { 
          description: "Your answer has been saved and analyzed by Ollama!" 
        });
        onAnswerSaved(); // Call the callback to advance to the next question
      }

      setUserAnswer("");
      stopSpeechToText();
    } catch (error) {
      toast.error("Error", {
        description: "An error occurred while saving the answer.",
      });
      console.log(error);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  useEffect(() => {
    const combineTranscripts = results
      .filter((result): result is ResultType => typeof result !== "string")
      .map((result) => result.transcript)
      .join(" ");

    setUserAnswer(combineTranscripts);
  }, [results]);

  const webCamRef = React.useRef<WebCam>(null);

  return (
    <div className="flex items-center justify-center flex-col">
      <div className="flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5">
        {isWebCam ? (
          <WebCam
            ref={webCamRef}
            style={{
              height: 300,
              width: "100%",
              zIndex: 10,
            }}
            mirrored={true}
          />
        ) : (
          <WebcamIcon className="h-72 w-full my-7 p-20 bg-secondary rounded-lg border" />
        )}
      </div>

      <div className="flex gap-2 md:gap-4 mt-2">
        <TooltipButton
          icon={isRecording ? <CircleStop /> : <Mic />}
          onClick={recordUserAnswer}
          disabled={isAiGenerating}
          className={`${
            isRecording ? "bg-red-500 text-white" : "bg-primary text-white"
          } ${isAiGenerating ? "opacity-50" : ""}`}
          tooltip={isRecording ? "Stop Recording" : "Start Recording"}
        />

        <TooltipButton
          icon={isWebCam ? <VideoOff /> : <Video />}
          onClick={() => setIsWebCam(!isWebCam)}
          disabled={isAiGenerating}
          tooltip={isWebCam ? "Turn Off Camera" : "Turn On Camera"}
        />

        {userAnswer && !isRecording && (
          <TooltipButton
            icon={<RefreshCw />}
            onClick={recordNewAnswer}
            disabled={isAiGenerating}
            tooltip="Record New Answer"
          />
        )}
      </div>

      {userAnswer && !isRecording && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md w-full max-w-2xl">
          <h3 className="text-sm font-semibold mb-2">Your Answer:</h3>
          <p className="text-sm">{userAnswer}</p>
          
          {isAiGenerating ? (
            <div className="flex items-center gap-2 mt-4 text-blue-600">
              <Loader className="animate-spin h-4 w-4" />
              <span>Ollama is analyzing your answer...</span>
            </div>
          ) : (
            aiResult && (
              <div className="mt-4 space-y-3">
                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-green-600">
                    Rating: {aiResult.ratings}/10
                  </h4>
                </div>
                
                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-blue-600">Feedback:</h4>
                  <p className="text-sm mt-1">{aiResult.feedback}</p>
                </div>
                
                <div className="bg-white p-3 rounded-md border">
                  <h4 className="font-semibold text-purple-600">Ideal Answer:</h4>
                  <p className="text-sm mt-1">{aiResult.correct_ans}</p>
                </div>
                
                <TooltipButton
                  icon={loading ? <Loader className="animate-spin" /> : <Save />}
                  onClick={() => setOpen(true)}
                  disabled={loading}
                  className="bg-green-600 text-white hover:bg-green-700"
                  tooltip="Save Answer & Feedback"
                />
              </div>
            )
          )}
        </div>
      )}

      <SaveModal
        open={open}
        setOpen={setOpen}
        loading={loading}
        onSave={saveUserAnswer}
        aiResult={aiResult}
      />
    </div>
  );
};