import { useAuth, UserButton, useUser } from "@clerk/clerk-react";
import { Loader, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/config/firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { UserProfile } from "@/types";

export const ProfileContainer = () => {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          const profileQuery = query(
            collection(db, "userProfiles"),
            where("userId", "==", userId)
          );
          const querySnapshot = await getDocs(profileQuery);
          if (!querySnapshot.empty) {
            setUserProfile(querySnapshot.docs[0].data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (!isLoaded) {
    return (
      <div className="flex items-center">
        <Loader className="min-w-4 min-h-4 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-6">
      {isSignedIn ? (
        <div className="flex items-center gap-2 sm:gap-4">
          {/* User Profile Info */}
          {userProfile && (
            <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-800">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{userProfile.collegeName}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-600">
                  <BookOpen className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-purple-600" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {userProfile.degree} - {userProfile.branch} | {userProfile.currentYear}
                  </span>
                </div>
              </div>
            </div>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      ) : (
        <Link to={"/signin"}>
          <Button size={"sm"} className="w-3/4 bg-blue-800 text-white font-medium py-4 px-8 rounded-md shadow-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out transform relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 group-hover:scale-[1.8] transition-all duration-500 ease-in-out"></div>
      <span className="relative z-10 transition-all duration-300 group-hover:text-white">
        Get Started 
      </span>
    </Button>
        </Link>
      )}
    </div>
  );
};
