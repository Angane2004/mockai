import { useAuth, UserButton } from "@clerk/clerk-react";
import { Loader } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export const ProfileContainer = () => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center">
        <Loader className="min-w-4 min-h-4 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
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
