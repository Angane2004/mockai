// auth-handler.tsx
// Runs silently on every page — checks if the logged-in Clerk user
// already has a profile in Firestore. If not, it creates one.
// This bridges Clerk (auth) and Firebase (data storage).

import { db } from "@/config/firebase.config";
import { LoaderPage } from "@/routes/loader-page";
import { User } from "@/types";
import { useAuth, useUser } from "@clerk/clerk-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AuthHanlder = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const pathname = useLocation().pathname;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storeUserData = async () => {
      if (isSignedIn && user) {
        setLoading(true);
        try {
          // Check if user already exists in Firestore
          const userSanp = await getDoc(doc(db, "users", user.id));

          if (!userSanp.exists()) {
            // First time login — save their profile to Firestore
            const userData: User = {
              id: user.id,
              name: user.fullName || user.firstName || "Anonymous",
              email: user.primaryEmailAddress?.emailAddress || "N/A",
              imageUrl: user.imageUrl,
              createdAt: serverTimestamp(),
              updateAt: serverTimestamp(),
            };

            await setDoc(doc(db, "users", user.id), userData);
          }
        } catch (error) {
          console.log("Error on storing the user data : ", error);
        } finally {
          setLoading(false);
        }
      }
    };

    storeUserData();
  }, [isSignedIn, user, pathname, navigate]);

  // Show a loader while the Firestore write is happening
  if (loading) {
    return <LoaderPage />;
  }

  // This component renders nothing — it only runs a side effect
  return null;
};

export default AuthHanlder;
