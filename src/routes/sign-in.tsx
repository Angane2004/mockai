import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const SignInPage = () => {
  return (
    <>
      <SignIn path="/signin" />
      <Link 
        to="/admin-signin" 
        style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '20px',
          zIndex: 1000
        }}
      >
        <Button variant="outline" className="shadow-lg">
          🔒 Admin Login
        </Button>
      </Link>
    </>
  );
};
