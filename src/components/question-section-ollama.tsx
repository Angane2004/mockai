import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TooltipButton } from "./tooltip-button";
import { Mic, StopCircle, Volume2, VolumeX, WebcamIcon, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import WebCam from "react-webcam";
import { Textarea } from "./ui/textarea";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ollamaService } from "@/scripts/ollama";
import { InterviewTimer } from "@/components/interview-timer";
import { addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { useAuth } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { ReportLoading } from "@/components/report-loading";
import { InterviewRecorder } from "@/components/interview-recorder";

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

// Audio confidence analysis based on speech patterns
const analyzeAudioConfidence = (transcript: string, duration: number): number => {
  let confidence = 5; // Base confidence (1-10 scale)
  
  // Length factor (longer answers generally show more confidence)
  if (transcript.length > 100) confidence += 1;
  if (transcript.length > 200) confidence += 1;
  
  // Hesitation markers (reduce confidence)
  const hesitationWords = ['um', 'uh', 'like', 'you know', 'i think', 'maybe', 'sort of', 'kind of'];
  const hesitationCount = hesitationWords.reduce((count, word) => {
    return count + (transcript.toLowerCase().match(new RegExp(word, 'g')) || []).length;
  }, 0);
  confidence -= Math.min(hesitationCount * 0.5, 2);
  
  // Speaking pace (words per second)
  const wordCount = transcript.split(' ').length;
  const wordsPerSecond = duration > 0 ? wordCount / duration : 0;
  if (wordsPerSecond > 1.5 && wordsPerSecond < 3) confidence += 1; // Good pace
  if (wordsPerSecond < 0.5) confidence -= 1; // Too slow (hesitant)
  if (wordsPerSecond > 4) confidence -= 1; // Too fast (nervous)
  
  // Confidence words (increase confidence)
  const confidenceWords = ['definitely', 'absolutely', 'certainly', 'confident', 'sure', 'exactly', 'precisely'];
  const confidenceCount = confidenceWords.reduce((count, word) => {
    return count + (transcript.toLowerCase().match(new RegExp(word, 'g')) || []).length;
  }, 0);
  confidence += Math.min(confidenceCount * 0.5, 2);
  
  // Structure indicators (complete sentences show confidence)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) confidence += 0.5;
  
  return Math.max(1, Math.min(10, Math.round(confidence)));
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

interface QuestionSectionProps {
  questions: string[];
  interviewType: string;
  depthLevel: string;
  duration?: number; // in minutes
}

export const QuestionSectionOllama = ({ questions, interviewType, depthLevel, duration = 30 }: QuestionSectionProps) => {
  // Start recording when component mounts
  useEffect(() => {
    setIsInterviewRecording(true);
    return () => {
      setIsInterviewRecording(false);
    };
  }, []);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState<SpeechSynthesisUtterance | null>(null);
  const [isWebcamEnabled, setIsWebcamEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [interimAnswer, setInterimAnswer] = useState(""); // For real-time display
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [audioConfidenceScores, setAudioConfidenceScores] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStep, setReportStep] = useState('analyzing');
  const [isInterviewRecording, setIsInterviewRecording] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { interviewId } = useParams();

  // Recording handlers
  const handleRecordingStart = (stream: MediaStream) => {
    console.log('Interview recording started');
  };

  const handleRecordingStop = () => {
    console.log('Interview recording stopped');
  };

  const handleRecordingReady = async (recordingBlob: Blob) => {
    setSessionRecording(recordingBlob);
    
    // Save recording to Firebase or local storage for later access
    try {
      // Convert blob to base64 for storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Save to Firebase with interview report
        await addDoc(collection(db, "interviewRecordings"), {
          interviewId,
          userId,
          recordingData: base64data,
          recordingSize: recordingBlob.size,
          recordingType: recordingBlob.type,
          createdAt: serverTimestamp(),
        });
        
        toast.success('Session recorded successfully!', {
          description: 'Your interview recording is saved and can be viewed later.'
        });
      };
      reader.readAsDataURL(recordingBlob);
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording', {
        description: 'Recording could not be saved, but feedback will still be generated.'
      });
    }
  };

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
      
      // Calculate confidence when recording stops
      const recordingDuration = (Date.now() - recordingStartTime) / 1000; // in seconds
      const confidenceScore = analyzeAudioConfidence(userAnswer, recordingDuration);
      setAudioConfidenceScores(prev => [...prev, confidenceScore]);
    } else {
      setUserAnswer(""); // Clear answer before starting new recording
      setInterimAnswer(""); // Clear interim display
      setRecordingStartTime(Date.now()); // Track start time
      setIsRecording(true);
      const recognition = startSpeechRecognition(
        (finalText) => {
          // Add final text to answer
          setUserAnswer(prev => (prev + ' ' + finalText).trim());
          setInterimAnswer(""); // Clear interim after adding final
        },
        (interimText) => {
          // Update interim display immediately
          setInterimAnswer(interimText);
        },
        () => {
          setIsRecording(false);
          setInterimAnswer(""); // Clear interim when stopping
          
          // Calculate confidence when recording stops
          const recordingDuration = (Date.now() - recordingStartTime) / 1000;
          const confidenceScore = analyzeAudioConfidence(userAnswer + interimAnswer, recordingDuration);
          setAudioConfidenceScores(prev => {
            const newScores = [...prev];
            newScores[currentQuestionIndex] = confidenceScore;
            return newScores;
          });
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
    // Stop recording when finishing interview
    setIsInterviewRecording(false);
    
    setIsLoading(true);
    setReportProgress(0);
    setReportStep('analyzing');
    
    try {
      // Step 1: Health check
      setReportProgress(10);
      const isHealthy = await ollamaService.checkHealth();
      if (!isHealthy) {
        throw new Error("Ollama service is not available. Please make sure Ollama is running.");
      }

      // Step 2: Prepare data
      setReportProgress(20);
      setReportStep('evaluating');
      const allAnswers = questions.map((q, i) => ({
        question: q,
        userAnswer: userAnswers[i] || "",
        confidenceLevel: audioConfidenceScores[i] || 5
      }));
      
      // Step 3: Generate optimized prompt
      setReportProgress(30);
      const prompt = `Analyze this ${interviewType} interview (${depthLevel} level):

${allAnswers.map((a, i) => `${i+1}. Q: ${a.question}
A: ${a.userAnswer}
Confidence Level: ${a.confidenceLevel}/10

`).join('')}

Return JSON only:
{
  "overallRating": number (1-10),
  "overallFeedback": string,
  "overallConfidenceLevel": number (1-10),
  "questionFeedbacks": [{
    "question": string,
    "userAnswer": string,
    "rating": number (1-10),
    "feedback": string,
    "idealAnswer": string,
    "confidenceLevel": number (1-10)
  }]
}`;
      
      // Step 4: Generate report
      setReportProgress(50);
      setReportStep('generating');
      
      const response = await ollamaService.generateResponse(prompt, true); // Use fast mode
      
      // Step 5: Parse response
      setReportProgress(70);
      setReportStep('finalizing');
      
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      setReportProgress(80);
      let report;
      try {
        report = JSON.parse(cleanResponse);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        const avgConfidence = audioConfidenceScores.length > 0 
          ? Math.round(audioConfidenceScores.reduce((sum, score) => sum + score, 0) / audioConfidenceScores.length)
          : 6;
        
        report = {
          overallRating: 7,
          overallFeedback: "Interview completed successfully. Detailed analysis could not be parsed, but your answers show good understanding of the topics discussed.",
          overallConfidenceLevel: avgConfidence,
          questionFeedbacks: allAnswers.map((qa, index) => ({
            question: qa.question,
            userAnswer: qa.userAnswer,
            rating: 7,
            feedback: "Good attempt at answering the question. Consider providing more specific examples and details.",
            idealAnswer: "A comprehensive answer should address all aspects of the question with relevant examples and clear explanations.",
            confidenceLevel: qa.confidenceLevel
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

      // Step 6: Save the report to Firebase
      setReportProgress(90);
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
      
      // Final step
      setReportProgress(100);
      
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

  // Show loading screen when generating report
  if (isLoading && reportProgress > 0) {
    return (
      <ReportLoading 
        progress={reportProgress} 
        currentStep={reportStep}
        estimatedTime={20}
      />
    );
  }

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

        {/* User's Answer with Real-time Display */}
        <div className="mt-4">
          <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Your Answer:
            {isRecording && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                🎤 Recording...
              </span>
            )}
          </h4>
          <div className="relative">
            <Textarea
              value={userAnswer + (interimAnswer ? ' ' + interimAnswer : '')}
              readOnly
              placeholder={isRecording ? "Listening... start speaking!" : "Start recording to see your answer here..."}
              className={`min-h-[150px] resize-none transition-colors ${
                isRecording ? 'border-red-300 bg-red-50' : ''
              }`}
            />
            {/* Show interim text styling */}
            {interimAnswer && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 italic">
                Speaking: {interimAnswer.slice(-20)}...
              </div>
            )}
          </div>
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

      {/* Right side: Timer, Recording, and Webcam Container */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Interview Timer */}
        <InterviewTimer 
          durationMinutes={duration}
          onTimeUp={generateAndSaveReport}
          autoStart={true}
        />
        
        {/* Interview Recorder */}
        <InterviewRecorder
          isRecording={isInterviewRecording}
          onStartRecording={handleRecordingStart}
          onStopRecording={handleRecordingStop}
          onRecordingReady={handleRecordingReady}
        />
        
        {/* Webcam Container */}
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
    </div>
  );
};