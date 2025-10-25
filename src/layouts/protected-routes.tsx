import { LoaderPage } from "@/routes/loader-page";
import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/config/firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ProfileOnboardingModal } from "@/components/profile-onboarding-modal";

const ProtectRoutes = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (userId) {
        try {
          const profileQuery = query(
            collection(db, "userProfiles"),
            where("userId", "==", userId)
          );
          const querySnapshot = await getDocs(profileQuery);
          
          // Show modal only if profile doesn't exist
          if (querySnapshot.empty) {
            setShowProfileModal(true);
          }
        } catch (error) {
          console.error("Error checking user profile:", error);
        } finally {
          setCheckingProfile(false);
        }
      }
    };

    if (isSignedIn) {
      checkUserProfile();
    }
  }, [userId, isSignedIn]);

  if (!isLoaded || checkingProfile) {
    return <LoaderPage />;
  }

  if (!isSignedIn) {
    return <Navigate to={"/signin"} replace />;
  }

  return (
    <>
      {children}
      <ProfileOnboardingModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </>
  );
};

export default ProtectRoutes;
