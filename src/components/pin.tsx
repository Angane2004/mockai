import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Calendar, Eye, RotateCw, Sparkles, Trash, Download, Play } from "lucide-react";
import { Interview } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { deleteDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import jsPDF from 'jspdf';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface InterviewPinProps {
  interview: Interview;
  onMockPage?: boolean;
}

export const InterviewPin = ({ interview, onMockPage }: InterviewPinProps) => {
  const [hasRecording, setHasRecording] = useState(false);

  // Check if recording exists for this interview
  useEffect(() => {
    const checkRecording = async () => {
      if (!interview.id) return;
      
      try {
        const recordingQuery = query(
          collection(db, "interviewRecordings"),
          where("interviewId", "==", interview.id)
        );
        const recordingSnapshot = await getDocs(recordingQuery);
        setHasRecording(!recordingSnapshot.empty);
      } catch (error) {
        console.error('Error checking recording:', error);
        setHasRecording(false);
      }
    };
    
    checkRecording();
  }, [interview.id]);
  const handleDeleteInterview = async () => {
    try {
      if (interview.id) {
        // Delete the interview document
        await deleteDoc(doc(db, "interviews", interview.id));
        
        // Delete all associated interview reports
        const reportsQuery = query(
          collection(db, "interviewReports"),
          where("interviewId", "==", interview.id)
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        for (const reportDoc of reportsSnapshot.docs) {
          await deleteDoc(doc(db, "interviewReports", reportDoc.id));
        }
        
        // Delete all associated interview recordings (videos/files)
        const recordingsQuery = query(
          collection(db, "interviewRecordings"),
          where("interviewId", "==", interview.id)
        );
        const recordingsSnapshot = await getDocs(recordingsQuery);
        for (const recordingDoc of recordingsSnapshot.docs) {
          await deleteDoc(doc(db, "interviewRecordings", recordingDoc.id));
        }
        
        // Delete any other associated data (answers, feedback, etc.)
        const answersQuery = query(
          collection(db, "interviewAnswers"),
          where("interviewId", "==", interview.id)
        );
        const answersSnapshot = await getDocs(answersQuery);
        for (const answerDoc of answersSnapshot.docs) {
          await deleteDoc(doc(db, "interviewAnswers", answerDoc.id));
        }
        
        toast.success("Deleted!", { 
          description: "Interview and all associated data deleted successfully" 
        });
      }
    } catch (error) {
      console.log(error);
      toast.error("Error", {
        description: "Something went wrong.. Please try again later",
      });
    }
  };

  const handleDownloadReport = async () => {
    try {
      if (!interview.id) return;
      
      // Fetch the interview report
      const reportsQuery = query(
        collection(db, "interviewReports"),
        where("interviewId", "==", interview.id)
      );
      const reportSnapshot = await getDocs(reportsQuery);
      
      if (reportSnapshot.empty) {
        toast.error("No report found", {
          description: "No feedback report found for this interview"
        });
        return;
      }

      const reportData = reportSnapshot.docs[0].data();
      
      // Create a PDF document
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const lineHeight = 7;
      let yPosition = 30;
      
      // Helper function to add text with word wrapping
      const addTextWithWrapping = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };
      
      // Header
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setTextColor(255, 255, 255); // White text
      pdf.setFontSize(20);
      pdf.text('INTERVIEW FEEDBACK REPORT', pageWidth / 2, 17, { align: 'center' });
      
      // Reset text color for body
      pdf.setTextColor(0, 0, 0);
      
      // Interview Details Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      yPosition = addTextWithWrapping('Interview Details', margin, yPosition, pageWidth - 2 * margin, 14);
      yPosition += 5;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      yPosition = addTextWithWrapping(`Interview Name: ${interview.name || 'Unnamed Interview'}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition = addTextWithWrapping(`Date: ${format(interview.createdAt.toDate(), "MMMM dd, yyyy")}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition = addTextWithWrapping(`Type: ${interview.interviewType || 'Technical'}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition = addTextWithWrapping(`Level: ${interview.depthLevel || 'Intermediate'}`, margin, yPosition, pageWidth - 2 * margin);
      yPosition += 10;
      
      // Overall Rating Section
      pdf.setFillColor(34, 197, 94); // Green background
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`OVERALL RATING: ${reportData.overallRating}/10`, pageWidth / 2, yPosition + 7, { align: 'center' });
      yPosition += 25;
      
      // Reset colors
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Overall Feedback
      pdf.setFont('helvetica', 'bold');
      yPosition = addTextWithWrapping('Overall Feedback:', margin, yPosition, pageWidth - 2 * margin, 12);
      pdf.setFont('helvetica', 'normal');
      yPosition = addTextWithWrapping(reportData.overallFeedback || 'No overall feedback available', margin, yPosition + 3, pageWidth - 2 * margin);
      yPosition += 10;
      
      // Question-by-Question Breakdown
      pdf.setFont('helvetica', 'bold');
      yPosition = addTextWithWrapping('Question-by-Question Analysis:', margin, yPosition, pageWidth - 2 * margin, 12);
      yPosition += 5;
      
      if (reportData.questionFeedbacks && reportData.questionFeedbacks.length > 0) {
        reportData.questionFeedbacks.forEach((q: any, i: number) => {
          // Check if we need a new page
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 30;
          }
          
          // Question header with colored background
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12, 'F');
          pdf.setFont('helvetica', 'bold');
          yPosition = addTextWithWrapping(`Question ${i + 1}:`, margin + 2, yPosition + 3, pageWidth - 2 * margin, 11);
          pdf.setFont('helvetica', 'normal');
          yPosition = addTextWithWrapping(q.question, margin + 2, yPosition, pageWidth - 2 * margin - 4, 10);
          yPosition += 5;
          
          // Rating
          pdf.setFont('helvetica', 'bold');
          const ratingColor = q.rating >= 8 ? [34, 197, 94] : q.rating >= 6 ? [251, 191, 36] : [239, 68, 68];
          pdf.setTextColor(ratingColor[0], ratingColor[1], ratingColor[2]);
          yPosition = addTextWithWrapping(`Rating: ${q.rating}/10`, margin + 5, yPosition, pageWidth - 2 * margin, 10);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
          
          // Your Answer
          yPosition = addTextWithWrapping('Your Answer:', margin + 5, yPosition, pageWidth - 2 * margin, 10);
          yPosition = addTextWithWrapping(q.userAnswer || 'No answer provided', margin + 10, yPosition, pageWidth - 2 * margin - 10, 9);
          yPosition += 3;
          
          // Ideal Answer
          yPosition = addTextWithWrapping('Ideal Answer:', margin + 5, yPosition, pageWidth - 2 * margin, 10);
          yPosition = addTextWithWrapping(q.idealAnswer || 'No ideal answer available', margin + 10, yPosition, pageWidth - 2 * margin - 10, 9);
          yPosition += 3;
          
          // Feedback
          yPosition = addTextWithWrapping('AI Feedback:', margin + 5, yPosition, pageWidth - 2 * margin, 10);
          yPosition = addTextWithWrapping(q.feedback || 'No feedback available', margin + 10, yPosition, pageWidth - 2 * margin - 10, 9);
          yPosition += 8;
        });
      }
      
      // Footer
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 30;
      }
      
      pdf.setFillColor(100, 100, 100);
      pdf.rect(0, yPosition, pageWidth, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text('Generated by AI Mock Interview Assistant - Powered by Ollama (Local AI)', pageWidth / 2, yPosition + 8, { align: 'center' });
      
      // Save the PDF
      const fileName = `Interview-Report-${interview.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'Report'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF Report Downloaded!", {
        description: "Your professional interview report has been saved as a PDF file"
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Download failed", {
        description: "Failed to download the report. Please try again."
      });
    }
  };

  return (
    <Alert className="bg-gray-50 border-gray-200 shadow-sm p-4 rounded-md">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-start flex-col">
          <AlertTitle className="text-xl font-bold">{interview.name}</AlertTitle>
          <AlertDescription className="text-sm text-gray-500 mt-1">
            {interview.objective}
          </AlertDescription>
        </div>
        {!onMockPage && (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-blue-500"
                    onClick={handleDeleteInterview}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {interview.feedbackGenerated ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                        onClick={handleDownloadReport}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download Report</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={`/generate/interview/${interview.id}/start`}>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-500"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Retake Interview</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={`/generate/feedback/${interview.id}`}>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-500"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Feedback</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasRecording && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link to={`/generate/watch-session/${interview.id}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-purple-500 hover:bg-purple-50"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Watch Session</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={`/generate/interview/${interview.id}`}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-blue-500"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Start Interview</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{format(interview.createdAt.toDate(), "MMMM dd, yyyy")}</span>
        </div>
        {!onMockPage && !interview.feedbackGenerated && (
          <Link to={`/generate/interview/${interview.id}/start`}>
            <Button size="sm" className="flex items-center gap-1 bg-blue-500">
              Start
              <Sparkles className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    </Alert>
  );
};