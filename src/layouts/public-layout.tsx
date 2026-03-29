import { Footer } from "@/components/footer";
import Header from "@/components/header";
import AuthHanlder from "@/handlers/auth-handler";
import { PageTransition } from "@/components/page-transition";
import { Outlet } from "react-router-dom";

export const PublicLayout = () => {
  return (
    <div className="w-full">
      {/* handler to store the user data */}
      <AuthHanlder />
      <Header />

      <PageTransition>
        <Outlet />
      </PageTransition>

      <Footer />
    </div>
  );
};
