import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { PublicLayout } from "@/layouts/public-layout";
import AuthenticationLayout from "@/layouts/auth-layout";
import ProtectRoutes from "@/layouts/protected-routes";
import { MainLayout } from "@/layouts/main-layout";

import HomePage from "@/routes/home";
import { About } from "./routes/about";
import { SignInPage } from "./routes/sign-in";
import { SignUpPage } from "./routes/sign-up";
import { AdminSignInPage } from "./routes/admin-sign-in";
import { AdminDashboard } from "./routes/admin-dashboard";
import { Generate } from "./components/generate";
import { Dashboard } from "./routes/dashboard";
import { CreateEditPage } from "./routes/create-edit-page";
import { MockLoadPage } from "./routes/mock-load-page";
import { MockInterviewPageOllama } from "./routes/mock-interview-page-ollama";
import { Feedback } from "./routes/feedback";
import { WatchSession } from "./routes/watch-session";
import { DebugRecordings } from "./routes/debug-recordings";
import { CreateJobDescriptionInterview } from "./routes/create-job-description-interview";
import { CreateResumeBasedInterview } from "./routes/create-resume-based-interview";
import { ToastProvider } from "@/components/ui/ToastProvider";

const App = () => {
  return (
    <Router>
      <ToastProvider swipeDirection="right">
      <Routes>
        {/* public routes */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/about" element={<About />} />
        </Route>

        {/* authentication layout */}
        <Route element={<AuthenticationLayout />}>
          <Route path="/signin/*" element={<SignInPage />} />
          <Route path="/signup/*" element={<SignUpPage />} />
          <Route path="/admin-signin/*" element={<AdminSignInPage />} />
        </Route>

        {/* admin routes */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* protected routes */}
        <Route
          element={
            <ProtectRoutes>
              <MainLayout />
            </ProtectRoutes>
          }
        >
          {/* add all the protect routes */}
          <Route element={<Generate />} path="/generate">
            <Route index element={<Dashboard />} />
            <Route path=":interviewId" element={<CreateEditPage />} />
            <Route path="interview/:interviewId" element={<MockLoadPage />} />
            
            <Route
              path="interview/:interviewId/start"
              element={<MockInterviewPageOllama />}
            />
            <Route path="feedback/:interviewId" element={<Feedback />} />
            <Route path="watch-session/:interviewId" element={<WatchSession />} />
            <Route path="debug-recordings" element={<DebugRecordings />} />
            <Route path="create/job-description" element={<CreateJobDescriptionInterview />} />
            <Route path="create/resume-based" element={<CreateResumeBasedInterview />} />
          </Route>
        </Route>
      </Routes>
      </ToastProvider>
    </Router>
  );
};

export default App;
