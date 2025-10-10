import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Headings } from "@/components/headings";
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col w-full gap-8 py-8 px-4 max-w-6xl mx-auto">
          {/* Header Section with Trophy Animation */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full">
                <TrendingUp className="h-16 w-16 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎉 Interview Complete!
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your personalized AI feedback is ready! Here's your detailed performance analysis to help you ace your next interview.
            </p>
          </div>

          {/* Overall Score Card with Radial Progress */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 shadow-xl rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-10 transform translate-x-8 -translate-y-8"></div>
            <div className="relative p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full">
                  <Star className="h-8 w-8 text-white" fill="currentColor" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800">Overall Performance</h3>
              </div>
              
              {/* Large Rating Display */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {report.overallRating}
                </div>
                <div className="text-2xl text-gray-400 font-medium">/10</div>
              </div>
              
              {/* Rating Emoji */}
              <div className="text-4xl mb-4">
                {report.overallRating >= 9 ? '🏆' : 
                 report.overallRating >= 8 ? '⭐' : 
                 report.overallRating >= 7 ? '😊' : 
                 report.overallRating >= 6 ? '👍' : 
                 report.overallRating >= 5 ? '😐' : '💪'}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(report.overallRating / 10) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto">{report.overallFeedback}</p>
            </div>
          </Card>

          {/* Section Header */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-800">Question-by-Question Analysis</h2>
            <p className="text-gray-600">Detailed feedback for each interview question</p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-8">
            {report.questionFeedbacks?.map((feed: any, index: number) => (
              <AccordionItem
                key={index}
                value={`question-${index}`}
                className="border-0 bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="flex items-center gap-4 w-full">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-800 text-base leading-relaxed">{feed.question}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        feed.rating >= 8 ? 'bg-green-100 text-green-700' :
                        feed.rating >= 6 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <Star className="h-4 w-4" fill="currentColor" />
                        {feed.rating}/10
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-6 py-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Your Answer */}
                    <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-blue-600 p-2 rounded-lg">
                            <CircleCheck className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-blue-900">Your Answer</h4>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {feed.userAnswer || 'No answer provided'}
                        </p>
                      </div>
                    </Card>

                    {/* Ideal Answer */}
                    <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md">
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-green-600 p-2 rounded-lg">
                            <ThumbsUp className="h-5 w-5 text-white" />
                          </div>
                          <h4 className="font-bold text-green-900">Ideal Answer</h4>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {feed.idealAnswer}
                        </p>
                      </div>
                    </Card>
                  </div>

                  {/* Feedback */}
                  <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-600 p-2 rounded-lg">
                          <Lightbulb className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-bold text-purple-900">AI Feedback & Improvement Tips</h4>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {feed.feedback}
                      </p>
                    </div>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {/* Action Section */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold mb-2">Ready for Your Next Interview?</h3>
              <p className="mb-4 opacity-90">Keep practicing to improve your skills!</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => navigate('/generate')}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                >
                  Take Another Interview
                </button>
                <button 
                  onClick={() => window.print()}
                  className="bg-indigo-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-indigo-800 transition-colors"
                >
                  Print Report
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
