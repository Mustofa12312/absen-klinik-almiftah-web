import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAKPNHGfP9YtT8Z9I-1tKXzt7QCoMRtRD0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "klinik-almiftah.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "klinik-almiftah",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "klinik-almiftah.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "664022797316",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:664022797316:web:eb378574e2469f8b6c7951",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-VX7WG5S3M6"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
