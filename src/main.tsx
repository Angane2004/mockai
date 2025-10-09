import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ClerkProvider } from "@clerk/clerk-react";

import "./index.css";
import App from "./App.tsx";
import { ToasterProvider } from "./provider/toast-provider.tsx";
import { testOllamaIntegration } from "./test-integration.ts";

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// Make test function available globally in development
if (import.meta.env.DEV) {
  (window as any).testOllamaIntegration = testOllamaIntegration;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
      <ToasterProvider />
    </ClerkProvider>
  </StrictMode>
);
