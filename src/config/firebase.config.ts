// firebase.config.ts
// Connects to Firebase and exports the Firestore database (db) used across the app.
// All config values are pulled from .env.local to keep credentials out of the code.

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Avoid re-initializing Firebase if it's already been set up (happens with hot reload)
const app = getApps.length > 0 ? getApp() : initializeApp(firebaseConfig);

// db is the Firestore instance — import this wherever you need to read/write data
const db = getFirestore(app);

export { db };
