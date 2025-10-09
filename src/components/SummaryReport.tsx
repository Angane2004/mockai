import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { getDocs, query, collection, where } from "firebase/firestore";
import { useAuth } from "@clerk/clerk-react";

interface SummaryReportProps {
  finalRating: number;
}

export const SummaryReport = ({ finalRating }: SummaryReportProps) => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!interviewId) return;

      try {
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          setInterview({ id: interviewDoc.id, ...interviewDoc.data() } as Interview);
        }

        const feedbacksQuery = query(
          collection(db, "userAnswers"),
          where("mockIdRef", "==", interviewId),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(feedbacksQuery);
        const fetchedFeedbacks = querySnapshot.docs.map((doc) => doc.data());
        setFeedbacks(fetchedFeedbacks);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast.error("Failed to load report data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeedback();
  }, [interviewId, userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-blue-500 animate-pulse">Generating Report...</h2>
        <p className="text-lg text-gray-700 mt-2">This may take a moment.</p>
      </div>
    );
  }

  const overallRating = (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1);

  return (
    <div className="flex flex-col gap-6 w-full p-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-600 mb-2">Interview Report</h2>
        <p className="text-gray-600">A detailed breakdown of your performance.</p>
      </div>

      <div className="flex flex-col items-center gap-4 p-4 rounded-lg bg-yellow-50">
        <div className="flex items-center gap-2 text-3xl font-bold text-yellow-600">
          <Star size={30} className="text-yellow-500" />
          <span>{overallRating} / 10</span>
        </div>
        <p className="text-lg text-gray-700">Overall Rating</p>
      </div>

      {/* Accordion for individual question feedback */}
      <Accordion type="single" collapsible className="space-y-4">
        {feedbacks.map((feed, index) => (
          <AccordionItem
            key={index}
            value={`question-${index}`}
            className="border rounded-md overflow-hidden transition-all duration-300 ease-in-out"
          >
            <AccordionTrigger className="p-4 bg-gray-100 hover:bg-gray-200 transition-colors">
              <span className="font-semibold text-lg">Question {index + 1}: {feed.question}</span>
            </AccordionTrigger>
            <AccordionContent className="p-4 bg-white space-y-4">
              <Card className="p-3 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Your Answer</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  {feed.user_ans}
                </CardContent>
              </Card>

              <Card className="p-3 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Ideal Answer</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  {feed.correct_ans}
                </CardContent>
              </Card>

              <Card className="p-3 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800">AI Feedback</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-700">
                  {feed.feedback}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Rating:</span>
                <span className="text-yellow-600">{feed.rating} / 10</span>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};