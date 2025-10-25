import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import { EnhancedAddNewButton } from "@/components/enhanced-add-new-button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LocalRecordedSessions } from "@/components/local-recorded-sessions";
import { db } from "@/config/firebase.config";
import { Interview, UserProfile } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Calendar } from "lucide-react";

export const Dashboard = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const { userId } = useAuth();

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      try {
        setProfileLoading(true);
        const profileQuery = query(
          collection(db, "userProfiles"),
          where("userId", "==", userId)
        );
        const profileSnapshot = await getDocs(profileQuery);
        
        if (!profileSnapshot.empty) {
          const profileData = profileSnapshot.docs[0].data() as UserProfile;
          setUserProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

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
      <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-4 mb-4 sm:mb-0">
        <Headings
          title="Dashboard"
          description="Create and start you AI Mock interview"
        />
        <EnhancedAddNewButton />
      </div>

      <Separator className="my-4 sm:my-8" />

      {/* Interview Section */}
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Your Interviews</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 md:h-32 rounded-md" />
            ))
          ) : interviews.length > 0 ? (
            interviews.map((interview) => (
              <InterviewPin key={interview.id} interview={interview} />
            ))
          ) : (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 w-full flex flex-grow items-center justify-center min-h-[300px] sm:h-96 flex-col px-4">
              <img
                src="/assets/svg/not-found.svg"
                className="w-32 h-32 sm:w-44 sm:h-44 object-contain"
                alt=""
              />
              <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mt-4">
                No Data Found
              </h2>
              <p className="w-full max-w-md text-center text-xs sm:text-sm text-neutral-400 mt-2 sm:mt-4 px-4">
                There is no available data to show. Please add some new mock
                interviews
              </p>
              <div className="mt-4">
                <EnhancedAddNewButton />
              </div>
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