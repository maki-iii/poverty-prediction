import {
  signInWithPopup,
  getRedirectResult,
  fetchSignInMethodsForEmail
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../configs/firebase";
import axios from "axios";

async function handleSocialLogin(provider) {
  try {
    const popupPromise = signInWithPopup(auth, provider);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        const error = new Error("Login timed out. Please try again.");
        error.code = "auth/popup-timeout";
        reject(error);
      }, 15000)
    );

    const result = await Promise.race([popupPromise, timeoutPromise]);

    const user = result.user;
    const response = await axios.post("/api/users/social-login", {
      name:  user.displayName,
      email: user.email,
      uid:   user.uid,
    }, { withCredentials: true });

    return response.data;

  } catch (err) {
    if (err.code === "auth/account-exists-with-different-credential") {
      const email = err.customData?.email;
      const methods = await fetchSignInMethodsForEmail(auth, email);
      const usedProvider = methods.includes("google.com")
        ? "Google"
        : methods.includes("facebook.com")
        ? "Facebook"
        : "another login method";
      throw new Error(
        `This email is already registered with ${usedProvider}. Please login using ${usedProvider} instead.`
      );
    }
    throw err;
  }
}

// Keep this for cleaning up any old redirect sessions on app load
export async function handleRedirectResult() {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const user = result.user;
  const response = await axios.post("/api/users/social-login", {
    name:  user.displayName,
    email: user.email,
    uid:   user.uid,
  }, { withCredentials: true });

  return response.data;
}

export const socialAuthService = {
  loginWithGoogle:   () => handleSocialLogin(googleProvider),
  loginWithFacebook: () => handleSocialLogin(facebookProvider),
};