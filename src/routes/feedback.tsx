import { db } from "@/config/firebase.config";
import { Interview, UserAnswer } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CircleCheck, Star, ThumbsUp, Lightbulb, TrendingUp } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

export const Feedback = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const [isConfettiActive, setIsConfettiActive] = useState(true);

  if (!interviewId) {
    navigate("/generate", { replace: true });
  }

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const reportQuery = query(
          collection(db, "interviewReports"),
          where("interviewId", "==", interviewId),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(reportQuery);
        if (!querySnapshot.empty) {
          setReport(querySnapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error fetching report:", error);
        toast.error("Failed to load interview report.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReport();
  }, [interviewId, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConfettiActive(false);
    }, 10000); // Stop confetti after 10 seconds
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !report) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen">
        <LoaderPage className="w-full h-[70vh]" />
        <p className="text-xl text-gray-700 mt-4 animate-pulse">
          Generating your report...
        </p>
      </div>
    );
  }

  return (
    <>
      {isConfettiActive && <Confetti width={width} height={height} recycle={false} />}
      <div className="flex flex-col w-full gap-8 py-5">
        <div className="flex items-center justify-between w-full gap-2">
          <CustomBreadCrumb
            breadCrumbPage={"Feedback"}
            breadCrumpItems={[
              { label: "Mock Interviews", link: "/generate" },
              {
                label: `${report.interviewName || "Interview"}`,
                link: `/generate/interview/${interviewId}`,
              },
            ]}
          />
        </div>

        <Headings
          title="Congratulations!"
          description="Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview."
        />

        <Card className="flex flex-col items-center justify-center p-6 bg-blue-50 border-blue-200 shadow-md rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600 h-6 w-6" />
            <h3 className="text-2xl font-bold text-blue-700">Overall Rating</h3>
          </div>
          <div className="flex items-center gap-2 text-4xl font-bold text-blue-800">
            <Star className="text-yellow-400 h-8 w-8" fill="currentColor" />
            <span>{report.overallRating} / 10</span>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{report.overallFeedback}</p>
        </Card>

        <Headings title="Detailed Breakdown" isSubHeading />
        
        <Accordion type="single" collapsible className="space-y-6">
          {report.questionFeedbacks?.map((feed, index) => (
            <AccordionItem
              key={index}
              value={`question-${index}`}
              className="border rounded-lg shadow-md"
            >
              <AccordionTrigger
                className={cn(
                  "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                  `hover:bg-gray-50`
                )}
              >
                <span>{feed.question}</span>
              </AccordionTrigger>

              <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-5 shadow-inner">
                <div className="flex items-center text-lg font-semibold to-gray-700">
                  <Star className="inline mr-2 text-yellow-400" />
                  <span>Rating: {feed.rating} / 10</span>
                </div>

                <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <ThumbsUp className="mr-2 text-green-600" />
                    Ideal Answer
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-700">
                    {feed.idealAnswer}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <CircleCheck className="mr-2 text-yellow-600" />
                    Your Answer
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-700">
                    {feed.userAnswer}
                  </CardDescription>
                </Card>

                <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                  <CardTitle className="flex items-center text-lg">
                    <Lightbulb className="mr-2 text-red-600" />
                    Feedback
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-700">
                    {feed.feedback}
                  </CardDescription>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
};