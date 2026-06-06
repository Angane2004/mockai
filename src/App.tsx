// App.tsx — Sets up all the routes for the application

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
        {/* Public pages — anyone can visit these */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/about" element={<About />} />
        </Route>

        {/* Auth pages — sign in, sign up, admin login */}
        <Route element={<AuthenticationLayout />}>
          <Route path="/signin/*" element={<SignInPage />} />
          <Route path="/signup/*" element={<SignUpPage />} />
          <Route path="/admin-signin/*" element={<AdminSignInPage />} />
        </Route>

        {/* Admin dashboard — uses its own PIN-based auth, not Clerk */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Protected pages — user must be logged in to access these */}
        <Route
          element={
            <ProtectRoutes>
              <MainLayout />
            </ProtectRoutes>
          }
        >
          <Route element={<Generate />} path="/generate">
            <Route index element={<Dashboard />} />                        {/* user's interview list */}
            <Route path=":interviewId" element={<CreateEditPage />} />     {/* create / edit interview */}
            <Route path="interview/:interviewId" element={<MockLoadPage />} />            {/* pre-interview setup */}
            <Route path="interview/:interviewId/start" element={<MockInterviewPageOllama />} /> {/* live interview */}
            <Route path="feedback/:interviewId" element={<Feedback />} />              {/* results & AI feedback */}
            <Route path="watch-session/:interviewId" element={<WatchSession />} />     {/* replay a recording */}
            <Route path="debug-recordings" element={<DebugRecordings />} />            {/* view stored recordings */}
            <Route path="create/job-description" element={<CreateJobDescriptionInterview />} />  {/* from JD */}
            <Route path="create/resume-based" element={<CreateResumeBasedInterview />} />        {/* from resume */}
          </Route>
        </Route>
      </Routes>
      </ToastProvider>
    </Router>
  );
};

export default App;
