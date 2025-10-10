import React, { useState, useEffect, useRef } from "react";
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
import { ContainerRecorder } from "@/components/container-recorder";
import { useAntiCheating } from "@/hooks/useAntiCheating";

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

export const QuestionSectionOllama = ({ questions, interviewType, depthLevel, duration = 0.5 }: QuestionSectionProps) => {
  // Anti-cheating monitoring with proper warnings
  const {
    violations,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getTotalViolations,
    getViolationSummary,
    resetViolations
  } = useAntiCheating({
    maxViolations: 2, // Warning at 1, terminate at 2
    enableWarnings: true,
    strictMode: false, // Balanced approach
    onViolation: (type, details) => {
      console.log('🚨 Anti-cheating violation detected:', { type, details, totalViolations: details.totalViolations });
      
      // Check the total violations from the details passed by the hook
      if (details.totalViolations === 1) {
        // First violation - show warning
        toast.warning('⚠️ Tab Switch Detected!', {
          description: 'Please stay on this tab. One more violation will end your interview session.',
          duration: 8000,
          id: 'tab-warning'
        });
      } else if (details.totalViolations >= 2) {
        // Final warning before termination
        toast.error('🚨 Final Warning!', {
          description: 'Multiple tab switches detected. Interview will end shortly.',
          duration: 5000,
          id: 'final-warning'
        });
      }
    },
    onMaxViolationsReached: () => {
      console.error('🚨 Maximum violations reached, ending interview');
      toast.error('❌ Interview Session Ended', {
        description: 'Multiple tab switches detected. Your interview has been terminated for security reasons.',
        duration: 10000,
        id: 'session-ended'
      });
      
      // Force end the interview after a short delay
      setTimeout(() => {
        generateAndSaveReport();
      }, 3000);
    }
  });

  // Start interview with anti-cheating and recording (only once)
  useEffect(() => {
    // Prevent multiple initializations using ref instead of state to avoid re-renders
    if (initializationStarted.current) {
      console.log('⚠️ Interview already initialized, skipping...');
      return;
    }
    
    console.log('🎯 Starting interview session (one-time initialization)...');
    initializationStarted.current = true;
    
    // Start anti-cheating monitoring immediately
    startMonitoring();
    
    // Small delay to ensure component is fully mounted and ask for permissions
    const startTimer = setTimeout(async () => {
      console.log('🎥 Requesting camera/microphone permissions...');
      setIsRequestingPermissions(true);
      
      try {
        // Request permissions first before starting recording
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: { 
            echoCancellation: true, 
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        // Stop the test stream immediately (we just needed permission)
        stream.getTracks().forEach(track => {
          console.log(`Stopping test ${track.kind} track:`, track.label);
          track.stop();
        });
        
        // Now start the actual recording immediately
        console.log('✅ Permissions granted! Auto-starting interview recording...');
        setIsRequestingPermissions(false);
        setIsInterviewRecording(true);
        
        // Show success toast only once
        toast.success('Interview session started!', {
          description: 'Recording started automatically. Anti-cheating monitoring active.',
          id: 'session-started' // Prevent duplicates
        });
        
      } catch (error) {
        console.error('❌ Permission denied or error:', error);
        setIsRequestingPermissions(false);
        
        // Show warning toast only once
        toast.warning('Limited interview mode', {
          description: 'Camera/microphone access denied. Interview will continue without recording.',
          id: 'permissions-denied' // Prevent duplicates
        });
        
        // Still continue the interview even without recording
        setIsInterviewRecording(false);
      }
    }, 1500); // Slightly longer delay to avoid race conditions
    
    return () => {
      console.log('🧹 Cleaning up interview session...');
      clearTimeout(startTimer);
      stopMonitoring();
      setIsInterviewRecording(false);
    };
  }, []); // Empty dependency array to run only once

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
  const [voiceToneAnalysis, setVoiceToneAnalysis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStep, setReportStep] = useState('analyzing');
  const [isInterviewRecording, setIsInterviewRecording] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<Blob | null>(null);
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { interviewId } = useParams();
  
  // Prevent multiple initializations with a ref
  const initializationStarted = useRef(false);

  // Anti-cheating monitoring (temporarily disabled)
  // const {
  //   violations,
  //   isMonitoring,
  //   startMonitoring,
  //   stopMonitoring,
  //   getTotalViolations,
  //   getViolationSummary
  // } = useAntiCheating({
  //   maxViolations: 5,
  //   enableWarnings: true,
  //   strictMode: true,
  //   onViolation: (type, details) => {
  //     // Log violation to database for review
  //     console.log('Anti-cheating violation:', type, details);
  //   }
  // });

  // Recording handlers with better error handling
  const handleRecordingStart = (stream: MediaStream) => {
    console.log('🔴 Interview recording started successfully!', {
      streamId: stream.id,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      interviewId,
      userId
    });
    
    // Show recording status update (only once)
    toast.success('Recording in progress', {
      description: 'Interview recording has started successfully',
      id: 'recording-started' // Prevent duplicates
    });
  };

  const handleRecordingStop = () => {
    console.log('⏹️ Interview recording stopped');
    toast.info('Recording stopped', {
      description: 'Processing your interview recording...',
      id: 'recording-stopped'
    });
  };
  
  // Manual recording start if auto-start fails
  const handleManualRecordingStart = () => {
    if (!isInterviewRecording) {
      console.log('📹 Starting recording manually...');
      setIsInterviewRecording(true);
      toast.success('Starting recording now!', {
        description: 'Interview recording is being initialized...',
        id: 'manual-recording-start'
      });
    } else {
      console.log('⚠️ Recording already in progress');
      toast.warning('Recording already active', {
        description: 'Interview recording is already in progress.',
        id: 'already-recording'
      });
    }
  };

  const handleRecordingReady = async (recordingBlob: Blob) => {
    console.log('📹 Recording ready! Processing...', {
      size: recordingBlob.size,
      type: recordingBlob.type,
      interviewId,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Validate recording blob
    if (!recordingBlob || recordingBlob.size === 0) {
      console.error('❌ Invalid recording blob received:', recordingBlob);
      toast.error('Recording error', {
        description: 'Recording is empty or invalid. Please try again.'
      });
      return;
    }
    
    if (recordingBlob.size < 1024) { // Less than 1KB is probably not a valid recording
      console.error('⚠️ Recording too small:', recordingBlob.size, 'bytes');
      toast.warning('Recording seems incomplete', {
        description: 'Recording file is very small. It may not contain valid video data.'
      });
    }
    
    setSessionRecording(recordingBlob);
    
    // Save recording to local storage (IndexedDB) - much better for video files
    try {
      console.log('📦 Importing local recording storage service...');
      const { localRecordingStorage } = await import('@/services/local-recording-storage');
      
      console.log('💾 Saving recording to local storage...', {
        blobSize: recordingBlob.size,
        blobType: recordingBlob.type,
        userIdPresent: !!userId,
        interviewIdPresent: !!interviewId
      });
      
      // Calculate approximate duration based on file size (rough estimate)
      const estimatedDuration = Math.max(5, Math.round(recordingBlob.size / (1024 * 100))); // More realistic estimate
      
      const recordingMetadata = {
        interviewId: interviewId || `local_${Date.now()}`,
        userId: userId || 'anonymous_user',
        duration: estimatedDuration,
        interviewName: `Interview ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        interviewType: interviewType || 'General Interview',
        depthLevel: depthLevel || 'Standard',
        recordingType: recordingBlob.type || 'video/webm'
      };
      
      console.log('📝 Recording metadata prepared:', recordingMetadata);
      
      const recordingId = await localRecordingStorage.saveRecording(recordingBlob, recordingMetadata);
      
      console.log('✅ Recording saved successfully to IndexedDB!', {
        recordingId,
        shortId: recordingId.slice(-8),
        storageType: 'IndexedDB',
        size: recordingBlob.size,
        formattedSize: `${(recordingBlob.size / (1024 * 1024)).toFixed(2)} MB`,
        userId,
        interviewId
      });
      
      // Immediate verification - try to retrieve the recording
      console.log('🔍 Verifying save by retrieving recordings...');
      const testRetrieve = await localRecordingStorage.getUserRecordings(userId || 'anonymous_user');
      const justSaved = testRetrieve.find(r => r.id === recordingId);
      
      console.log('🔍 Verification results:', {
        totalRecordings: testRetrieve.length,
        justSavedFound: !!justSaved,
        justSavedSize: justSaved?.recordingSize,
        allRecordingIds: testRetrieve.map(r => ({ id: r.id.slice(-8), size: r.recordingSize }))
      });
      
      if (justSaved) {
        toast.success('Recording saved successfully! 🎉', {
          description: `Interview recording (${(recordingBlob.size / (1024 * 1024)).toFixed(1)} MB) is now available in your Recorded Sessions.`,
          duration: 5000
        });
      } else {
        throw new Error('Recording was not found after save - verification failed');
      }
      
      // Get updated storage stats
      const stats = await localRecordingStorage.getStorageStats();
      console.log('📊 Updated storage statistics:', {
        totalRecordings: stats.totalRecordings,
        totalSize: `${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`,
        availableSpace: stats.availableSpace ? `${(stats.availableSpace / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'
      });
      
    } catch (error) {
      console.error('❌ Error saving recording to local storage:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        recordingSize: recordingBlob.size,
        recordingType: recordingBlob.type
      });
      
      toast.error('Failed to save recording locally', {
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. The interview feedback will still be generated.`,
        duration: 6000
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
          
          // Calculate confidence and voice tone analysis
          const recordingDuration = (Date.now() - recordingStartTime) / 1000;
          const finalAnswer = userAnswer + (interimAnswer || '');
          
          // Basic audio confidence
          const confidenceScore = analyzeAudioConfidence(finalAnswer, recordingDuration);
          setAudioConfidenceScores(prev => {
            const newScores = [...prev];
            newScores[currentQuestionIndex] = confidenceScore;
            return newScores;
          });
          
          // Advanced voice tone analysis
          const wordsPerSecond = finalAnswer.split(' ').length / Math.max(recordingDuration, 1);
          const toneAnalysis = ollamaService.analyzeVoiceTone(finalAnswer, {
            speakingRate: wordsPerSecond * 60, // Convert to words per minute
            pauseCount: (finalAnswer.match(/[.!?]/g) || []).length,
            averagePauseLength: recordingDuration / Math.max((finalAnswer.match(/[.!?]/g) || []).length, 1)
          });
          
          setVoiceToneAnalysis(prev => {
            const newAnalysis = [...prev];
            newAnalysis[currentQuestionIndex] = toneAnalysis;
            return newAnalysis;
          });
          
          console.log('Voice tone analysis:', toneAnalysis);
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
    console.log('🔄 Starting report generation process...');
    
    // Stop recording automatically when finishing interview
    console.log('📹 Auto-stopping recording before generating report...');
    setIsInterviewRecording(false);
    
    // Show recording stopped message
    toast.info('Recording stopped', {
      description: 'Processing your interview recording and generating feedback...',
      id: 'recording-finished'
    });
    
    setIsLoading(true);
    setReportProgress(0);
    setReportStep('analyzing');
    
    try {
      // Step 1: Health check
      console.log('⚕️ Step 1: Checking Ollama health...');
      setReportProgress(10);
      const isHealthy = await ollamaService.checkHealth();
      console.log('Health check result:', isHealthy);
      
      if (!isHealthy) {
        console.error('❌ Ollama health check failed');
        throw new Error("Ollama service is not available. Please make sure Ollama is running.");
      }

      // Step 2: Prepare data
      console.log('📊 Step 2: Preparing interview data...');
      setReportProgress(20);
      setReportStep('evaluating');
      const allAnswers = questions.map((q, i) => ({
        question: q,
        userAnswer: userAnswers[i] || "",
        confidenceLevel: audioConfidenceScores[i] || 5,
        voiceTone: voiceToneAnalysis[i] || null
      }));
      
      console.log('📝 Interview data prepared:', {
        questionsCount: questions.length,
        answersCount: userAnswers.length,
        interviewType,
        depthLevel,
        firstAnswer: allAnswers[0]?.userAnswer?.substring(0, 50) + '...'
      });
      
      // Step 3: Generate report using fast template-based method
      console.log('🚀 Step 3: Generating report (skipping prompt generation for speed)...');
      setReportProgress(50);
      setReportStep('generating');
      
      // Use the new fast report generation method with timeout
      const reportPromise = ollamaService.generateFastReport(
        allAnswers,
        interviewType,
        depthLevel
      );
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Report generation timed out after 30 seconds')), 30000)
      );
      
      const report = await Promise.race([reportPromise, timeoutPromise]) as any;
      console.log('✅ Report generated successfully:', {
        overallRating: report.overallRating,
        feedbackCount: report.questionFeedbacks?.length || 0,
        overallFeedback: report.overallFeedback?.substring(0, 100) + '...'
      });
      
      setReportProgress(80);

      // Ensure the report has the correct structure
      if (!report.overallRating) {
        console.log('⚠️ Missing overall rating, setting default');
        report.overallRating = 7;
      }
      if (!report.overallFeedback) {
        console.log('⚠️ Missing overall feedback, setting default');
        report.overallFeedback = "Interview completed successfully.";
      }
      if (!Array.isArray(report.questionFeedbacks)) {
        console.log('⚠️ Missing question feedbacks, generating defaults');
        report.questionFeedbacks = allAnswers.map((qa, index) => ({
          question: qa.question,
          userAnswer: qa.userAnswer,
          rating: 7,
          feedback: "Good attempt at answering the question.",
          idealAnswer: "A comprehensive answer should address all aspects of the question."
        }));
      }

      // Step 4: Save to Firebase
      console.log('💾 Step 4: Saving report to Firebase...');
      setReportProgress(90);
      const violationSummary = getViolationSummary();
      stopMonitoring();
      
      const reportData = {
        interviewId,
        userId,
        interviewName: `Interview Report`,
        interviewType,
        depthLevel,
        ...report,
        antiCheatingData: violationSummary,
        createdAt: serverTimestamp(),
        generatedBy: "Ollama Llama3 (Template-based)"
      };
      
      console.log('📤 Saving to Firebase with data:', {
        interviewId,
        userId,
        overallRating: reportData.overallRating,
        questionsCount: reportData.questionFeedbacks?.length
      });
      
      const reportRef = await addDoc(collection(db, "interviewReports"), reportData);
      console.log('✅ Report saved to Firebase with ID:', reportRef.id);
      
      // Final step
      setReportProgress(100);
      
      toast.success("Report Generated Successfully!", { 
        description: "Your AI-powered feedback is ready to view." 
      });
      
      console.log('🎉 Navigating to feedback page:', `/generate/feedback/${interviewId}`);
      navigate(`/generate/feedback/${interviewId}`);

    } catch (error) {
      console.error('❌ Error in report generation:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        step: 'generateAndSaveReport'
      });
      
      toast.error("Failed to generate report", {
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 Report generation process completed');
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
        
        {/* Anti-Cheating Status */}
        {isMonitoring && (
          <div className={`p-4 border rounded-lg ${
            getTotalViolations() === 0 
              ? 'bg-green-50 border-green-200' 
              : getTotalViolations() === 1 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  getTotalViolations() === 0 ? 'bg-green-500' : 
                  getTotalViolations() === 1 ? 'bg-yellow-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="font-medium text-sm">
                  🛡️ Interview Security: {getTotalViolations() === 0 ? 'Active' : getTotalViolations() === 1 ? 'Warning Issued' : 'Final Warning'}
                </span>
              </div>
              {getTotalViolations() > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    getTotalViolations() === 1 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {getTotalViolations() === 1 ? 'First Warning - Stay on this tab' : 'Final Warning - Next violation ends interview'}
                  </span>
                </div>
              )}
            </div>
            {getTotalViolations() > 0 && (
              <div className="text-xs mt-2">
                {getTotalViolations() === 1 ? (
                  <div className="text-yellow-700">
                    ⚠️ Tab switch detected. Please remain on this page during the interview.
                  </div>
                ) : (
                  <div className="text-red-700">
                    🚨 Multiple tab switches detected. One more violation will automatically end your interview.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Container Recorder - Records only camera and answer areas */}
        <ContainerRecorder
          isRecording={isInterviewRecording}
          onStartRecording={handleRecordingStart}
          onStopRecording={handleRecordingStop}
          onRecordingReady={handleRecordingReady}
        />
        
        {/* Permission Request Status */}
        {isRequestingPermissions && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium">Requesting camera/microphone permissions...</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Please allow access to camera and microphone for interview recording.
            </p>
          </div>
        )}
        
        {/* Manual recording option if auto-start fails */}
        {!isRequestingPermissions && !isInterviewRecording && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-blue-800">📹 Recording Not Started</span>
                <p className="text-sm text-blue-700 mt-1">
                  Interview recording hasn't started automatically. You can continue without recording or start it manually.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualRecordingStart}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Recording
                </Button>
              </div>
            </div>
          </div>
        )}
        
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