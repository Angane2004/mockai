import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { EnhancedAddNewButton } from "@/components/enhanced-add-new-button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LocalRecordedSessions } from "@/components/local-recorded-sessions";
import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDocs } from "firebase/firestore";

export const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    setLoading(true);
    const interviewQuery = query(
      collection(db, "interviews"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      interviewQuery,
      async (snapshot) => {
        const interviewList: Interview[] = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const id = doc.id;
            const data = doc.data();
            const feedbackQuery = query(
              collection(db, "interviewReports"),
              where("interviewId", "==", id)
            );
            const feedbackSnapshot = await getDocs(feedbackQuery);
            const feedbackGenerated = !feedbackSnapshot.empty;
            return {
              id,
              ...data,
              feedbackGenerated,
            } as Interview;
          })
        );
        setInterviews(interviewList);
        setLoading(false);
      },
      (error) => {
        console.log("Error on fetching : ", error);
        toast.error("Error..", {
          description: "Something went wrong.. Try again later..",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <Headings
          title="Dashboard"
          description="Create and start you AI Mock interview"
        />
        <EnhancedAddNewButton />
      </div>

      <Separator className="my-8" />

      {/* Interview Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Interviews</h2>
        <div className="md:grid md:grid-cols-3 gap-3 py-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 md:h-32 rounded-md" />
            ))
          ) : interviews.length > 0 ? (
            interviews.map((interview) => (
              <InterviewPin key={interview.id} interview={interview} />
            ))
          ) : (
            <div className="md:col-span-3 w-full flex flex-grow items-center justify-center h-96 flex-col">
              <img
                src="/assets/svg/not-found.svg"
                className="w-44 h-44 object-contain"
                alt=""
              />
              <h2 className="text-lg font-semibold text-muted-foreground">
                No Data Found
              </h2>
              <p className="w-full md:w-96 text-center text-sm text-neutral-400 mt-4">
                There is no available data to show. Please add some new mock
                interviews
              </p>
              <EnhancedAddNewButton />
            </div>
          )}
        </div>
      </div>

      {/* Recorded Sessions Section */}
      <Separator className="my-8" />
      <LocalRecordedSessions />
    </>
  );
};