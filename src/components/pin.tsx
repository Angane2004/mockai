import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Calendar, Eye, RotateCw, Sparkles, Trash } from "lucide-react";
import { Interview } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
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
  const handleDeleteInterview = async () => {
    try {
      if (interview.id) {
        await deleteDoc(doc(db, "interviews", interview.id));
        toast.success("Deleted!", { description: "Interview deleted successfully" });
      }
    } catch (error) {
      console.log(error);
      toast.error("Error", {
        description: "Something went wrong.. Please try again later",
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