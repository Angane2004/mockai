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
import { chatSession } from "@/scripts";
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

const startSpeechRecognition = (
  onFinalResult: (text: string) => void, 
  onInterimResult: (text: string) => void,
  onEnd: () => void
) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return null;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log("Speech recognition started...");
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }
    
    // Call callbacks immediately for real-time display
    if (finalTranscript) {
      onFinalResult(finalTranscript);
    }
    if (interimTranscript) {
      onInterimResult(interimTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    
    let errorMessage = "";
    let errorDescription = "";
    
    switch(event.error) {
      case 'no-speech':
        errorMessage = "No speech detected";
        errorDescription = "Please make sure your microphone is working and try speaking clearly.";
        break;
      case 'audio-capture':
        errorMessage = "Microphone access failed";
        errorDescription = "Please allow microphone access in your browser settings and refresh the page.";
        break;
      case 'not-allowed':
        errorMessage = "Microphone permission denied";
        errorDescription = "Please click the microphone icon in your browser's address bar and allow access.";
        break;
      case 'network':
        errorMessage = "Network error";
        errorDescription = "Please check your internet connection and try again.";
        break;
      case 'aborted':
        errorMessage = "Speech recognition stopped";
        errorDescription = "Speech recognition was interrupted. You can try again.";
        break;
      case 'service-not-allowed':
        errorMessage = "Speech service unavailable";
        errorDescription = "Speech recognition service is not available. Try using text input instead.";
        break;
      default:
        errorMessage = "Speech recognition error";
        errorDescription = `Error: ${event.error}. Please try again or use text input.`;
    }
    
    toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000
    });
    
    recognition.stop();
    onEnd(); // Ensure the recording state is properly reset
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

const cleanJsonResponse = (responseText: string) => {
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7); // Remove '```json'
    }
    if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3); // Remove '```'
    }
    return cleanText.trim();
};

interface QuestionSectionProps {
  questions: string[];
  interviewType: string;
  depthLevel: string;
}

export const QuestionSection = ({ questions, interviewType, depthLevel }: QuestionSectionProps) => {
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
      const allAnswers = questions.map((q, i) => ({
        question: q,
        userAnswer: userAnswers[i] || ""
      }));
      
      const prompt = `
        You are an expert interviewer. You have just completed a mock interview.
        Here are the questions asked and the user's answers:
        
        ${allAnswers.map(a => `Question: "${a.question}"\nUser Answer: "${a.userAnswer}"\n\n`).join('')}

        Based on the user's performance in a ${interviewType} interview at a ${depthLevel} level, provide a detailed report.
        The report should contain a single JSON object with the following structure:
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
            },
            ...
          ]
        }
        For the idealAnswer, provide a correct and complete answer for each question.
      `;
      
      const response = await chatSession.sendMessage(prompt);
      const cleanedText = cleanJsonResponse(response.response.text());
      const report = JSON.parse(cleanedText);

      // Save the report to a new collection or within the interview document
      // For simplicity, let's save it to a new collection
      const reportRef = await addDoc(collection(db, "interviewReports"), {
        interviewId,
        userId,
        ...report,
        createdAt: serverTimestamp(),
      });
      
      toast.success("Report Generated!", { description: "Your feedback is ready." });
      navigate(`/generate/feedback/${interviewId}`);

    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report.");
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
              isLoading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Generating...</> : "Finish Interview"
            )}
          </Button>
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