import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAKPNHGfP9YtT8Z9I-1tKXzt7QCoMRtRD0",
  authDomain: "klinik-almiftah.firebaseapp.com",
  projectId: "klinik-almiftah",
  storageBucket: "klinik-almiftah.firebasestorage.app",
  messagingSenderId: "664022797316",
  appId: "1:664022797316:web:eb378574e2469f8b6c7951",
  measurementId: "G-VX7WG5S3M6"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
