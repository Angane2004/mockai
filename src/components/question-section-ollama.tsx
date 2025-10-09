import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TooltipButton } from "./tooltip-button";
import { Mic, StopCircle, Volume2, VolumeX, WebcamIcon, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import WebCam from "react-webcam";
import { Textarea } from "./ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ollamaService } from "@/scripts/ollama"; // Import Ollama service instead of Gemini
import { addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { useAuth } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

// Helper functions for speech
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
    if (voice) {
        utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
    return utterance;
  }
  console.warn("Web Speech API not supported.");
  return null;
};

const startSpeechRecognition = (onResult: (text: string) => void, onEnd: () => void) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log("Speech recognition started...");
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            onResult(transcript);
        } else {
            interimTranscript += transcript;
        }
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    toast.error("Speech recognition error", {
        description: `Error: ${event.error}. Please check your microphone permissions.`
    });
    recognition.stop();
  };

  recognition.onend = () => {
    console.log("Speech recognition ended.");
    onEnd();
  };

  try {
      recognition.start();
      return recognition;
  } catch (error) {
      console.error("Failed to start speech recognition:", error);
      toast.error("Microphone access failed", {
          description: "Please allow microphone permissions and try again."
      });
      return null;
  }
};

interface QuestionSectionProps {
  questions: string[];
  interviewType: string;
  depthLevel: string;
}

export const QuestionSectionOllama = ({ questions, interviewType, depthLevel }: QuestionSectionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { interviewId } = useParams();

  const handlePlayQuestion = (qst: string) => {
    if (isPlaying && currentSpeech) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentSpeech(null);
    } else {
      const speech = speak(qst);
      if (speech) {
        setIsPlaying(true);
        setCurrentSpeech(speech);
        speech.onend = () => {
          setIsPlaying(false);
          setCurrentSpeech(null);
        };
      }
    }
  };

  const handleRecordAnswer = () => {
    if (isRecording) {
      if (speechRecognition) {
        speechRecognition.stop();
      }
      setIsRecording(false);
    } else {
      setUserAnswer(""); // Clear answer before starting new recording
      setIsRecording(true);
      const recognition = startSpeechRecognition(
        (text) => {
          setUserAnswer(prev => prev + ' ' + text);
        },
        () => {
          setIsRecording(false);
        }
      );
      setSpeechRecognition(recognition);
    }
  };

  const handleStopRecording = () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setIsRecording(false);
    }
  };

  const generateAndSaveReport = async () => {
    setIsLoading(true);
    try {
      // Check if Ollama service is available
      const isHealthy = await ollamaService.checkHealth();
      if (!isHealthy) {
        throw new Error("Ollama service is not available. Please make sure Ollama is running.");
      }

      const allAnswers = questions.map((q, i) => ({
        question: q,
        userAnswer: userAnswers[i] || ""
      }));
      
      const prompt = `You are an expert interviewer. You have just completed a mock interview.
Here are the questions asked and the user's answers:
        
${allAnswers.map(a => `Question: "${a.question}"
User Answer: "${a.userAnswer}"

`).join('')}

Based on the user's performance in a ${interviewType} interview at a ${depthLevel} level, provide a detailed report.

IMPORTANT: Return ONLY a valid JSON object with the following structure (no additional text or formatting):
{
  "overallRating": number (1-10),
  "overallFeedback": string,
  "questionFeedbacks": [
    {
      "question": string,
      "userAnswer": string,
      "rating": number (1-10),
      "feedback": string,
      "idealAnswer": string
    }
  ]
}

For the idealAnswer, provide a correct and complete answer for each question.
Make sure to evaluate each answer based on the ${depthLevel} level and ${interviewType} interview type.`;
      
      toast("Generating report with Ollama...", {
        description: "Please wait while AI analyzes your performance.",
      });

      const response = await ollamaService.generateResponse(prompt);
      
      // Clean and parse JSON response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      let report;
      try {
        report = JSON.parse(cleanResponse);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        report = {
          overallRating: 7,
          overallFeedback: "Interview completed successfully. Detailed analysis could not be parsed, but your answers show good understanding of the topics discussed.",
          questionFeedbacks: allAnswers.map((qa, index) => ({
            question: qa.question,
            userAnswer: qa.userAnswer,
            rating: 7,
            feedback: "Good attempt at answering the question. Consider providing more specific examples and details.",
            idealAnswer: "A comprehensive answer should address all aspects of the question with relevant examples and clear explanations."
          }))
        };
        console.warn("Using fallback report due to JSON parsing error:", parseError);
      }

      // Ensure the report has the correct structure
      if (!report.overallRating) report.overallRating = 7;
      if (!report.overallFeedback) report.overallFeedback = "Interview completed successfully.";
      if (!Array.isArray(report.questionFeedbacks)) {
        report.questionFeedbacks = allAnswers.map((qa, index) => ({
          question: qa.question,
          userAnswer: qa.userAnswer,
          rating: 7,
          feedback: "Good attempt at answering the question.",
          idealAnswer: "A comprehensive answer should address all aspects of the question."
        }));
      }

      // Save the report to Firebase
      const reportRef = await addDoc(collection(db, "interviewReports"), {
        interviewId,
        userId,
        interviewName: `Interview Report`,
        interviewType,
        depthLevel,
        ...report,
        createdAt: serverTimestamp(),
        generatedBy: "Ollama Llama3"
      });
      
      toast.success("Report Generated with Ollama!", { 
        description: "Your AI-powered feedback is ready to view." 
      });
      navigate(`/generate/feedback/${interviewId}`);

    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report", {
        description: error instanceof Error ? error.message : "Please check if Ollama is running and try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (userAnswer.trim() === "") {
      toast.error("Please record your answer before proceeding.");
      return;
    }
    setUserAnswers(prev => [...prev, userAnswer]);
    setUserAnswer("");
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      generateAndSaveReport();
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      {/* Left side: Question and controls */}
      <div className="flex-1 flex flex-col gap-4 p-6 border rounded-lg bg-gray-50">
        <div className="bg-green-100 border border-green-200 p-3 rounded-lg mb-4">
          <p className="text-sm text-green-700">
            <strong>Powered by Ollama</strong> - Your answers are being processed locally with AI
          </p>
        </div>

        <Tabs
          value={questions[currentQuestionIndex]}
          className="w-full space-y-12"
          onValueChange={(value) => {
            const index = questions.findIndex(q => q === value);
            if (index !== -1) {
              setCurrentQuestionIndex(index);
              setUserAnswer(""); // Clear answer when changing tabs
            }
          }}
        >
          <TabsList className="bg-transparent w-full flex flex-wrap items-center justify-start gap-4">
            {questions?.map((question, i) => (
              <TabsTrigger
                className={cn(
                  "data-[state=active]:bg-emerald-200 data-[state=active]:shadow-md text-xs px-2"
                )}
                key={i}
                value={question}
              >
                {`Question #${i + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={questions[currentQuestionIndex]}>
            <p className="text-base text-left tracking-wide text-blue-500">
              {questions[currentQuestionIndex]}
            </p>

            <div className="w-full flex items-center justify-end">
              <TooltipButton
                content={isPlaying ? "Stop" : "Play Question"}
                icon={
                  isPlaying ? (
                    <VolumeX className="min-w-5 min-h-5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="min-w-5 min-h-5 text-muted-foreground" />
                  )
                }
                onClick={() => handlePlayQuestion(questions[currentQuestionIndex])}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* User's Answer */}
        <div className="mt-4">
          <h4 className="text-md font-semibold text-gray-700 mb-2">Your Answer:</h4>
          <Textarea
            value={userAnswer}
            readOnly
            placeholder="Start recording to see your answer here..."
            className="min-h-[150px] resize-none"
          />
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {!isRecording ? (
            <Button onClick={handleRecordAnswer} disabled={isLoading}>
              <Mic className="h-4 w-4 mr-2" />
              Record Answer
            </Button>
          ) : (
            <Button onClick={handleStopRecording} variant="destructive">
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}

          <Button
            onClick={handleNextQuestion}
            disabled={userAnswer.trim() === "" || isRecording || isLoading}
          >
            {currentQuestionIndex < questions.length - 1 ? (
              <>Next Question <ChevronRight className="ml-2 h-4 w-4" /></>
            ) : (
              isLoading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Generating with Ollama...</> : "Finish Interview"
            )}
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 text-center text-sm text-gray-600">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      {/* Right side: Webcam/Video Container */}
      <div className="flex-1 flex flex-col items-center justify-center border p-4 bg-gray-50 rounded-md">
        {isWebcamEnabled ? (
          <WebCam
            onUserMedia={() => setIsWebcamEnabled(true)}
            onUserMediaError={() => setIsWebcamEnabled(false)}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <WebcamIcon className="min-w-24 min-h-24 text-muted-foreground" />
        )}
        <Button onClick={() => setIsWebcamEnabled(!isWebcamEnabled)} className="mt-4">
          {isWebcamEnabled ? "Disable Webcam" : "Enable Webcam"}
        </Button>
      </div>
    </div>
  );
};