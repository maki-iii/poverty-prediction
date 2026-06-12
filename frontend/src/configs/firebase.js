import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRUe72bK3pVlbNZJuwOQ2iKNy0DrgVQl0",
  authDomain: "pps-ph.firebaseapp.com",
  projectId: "pps-ph",
  storageBucket: "pps-ph.firebasestorage.app",
  messagingSenderId: "502113594437",
  appId: "1:502113594437:web:98f46caf5087174e3ac72c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();