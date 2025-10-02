import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/config/firebase.config";
import { Interview } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
        <Link to={"/generate/create"}>
          <Button size="sm" className="bg-transparent text-blue-500 border border-blue-500 hover:text-white hover:border-transparent transition-all duration-300 relative overflow-hidden group py-2 px-4 rounded-full hover:bg-blue-500">
            <span className="absolute inset-0 block bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></span>
            <span className="relative z-10 flex items-center justify-center transition-transform duration-300">
              <Plus className="mr-2 transition-transform duration-300 group-hover:rotate-90" />
              Add New
            </span>
          </Button>
        </Link>
      </div>

      <Separator className="my-8" />

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
            <Link to={"/generate/create"}>
              <Button size="sm" className="bg-transparent text-blue-500 border border-blue-500 hover:text-white hover:border-transparent transition-all duration-300 relative overflow-hidden group py-2 px-4 rounded-full hover:bg-blue-500">
                <span className="absolute inset-0 block bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"></span>
                <span className="relative z-10 flex items-center justify-center transition-transform duration-300">
                  <Plus className="mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  Add New
                </span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};