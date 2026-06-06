import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ClerkProvider } from "@clerk/clerk-react";

import "./index.css";
import App from "./App.tsx";
import { ToasterProvider } from "./provider/toast-provider.tsx";

// Clerk needs this key to handle login/signup — loaded from .env.local
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Stop the app from loading if the key is missing
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// Mount the app into the <div id="root"> in index.html
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* ClerkProvider gives the whole app access to auth state (user, session, etc.) */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
      {/* ToasterProvider shows toast notifications anywhere in the app */}
      <ToasterProvider />
    </ClerkProvider>
  </StrictMode>
);
