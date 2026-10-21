import {
  signInWithPopup,
  getRedirectResult,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../configs/firebase";
import axios from "axios";

async function handleSocialLogin(provider) {
  try {
    // Open Google/Facebook popup
    const result = await signInWithPopup(auth, provider);

    const user = result.user;

    const response = await axios.post(
      "/api/users/social-login",
      {
        idToken: await user.getIdToken(),
      },
      {
        withCredentials: true,
        headers: { "ngrok-skip-browser-warning": "1" },
      }
    );

    return response.data;
  } catch (err) {
    switch (err.code) {
      case "auth/popup-closed-by-user":
        throw new Error("Login was cancelled.");

      case "auth/cancelled-popup-request":
        throw new Error(
          "Another login window is already open. Please complete or close it first."
        );

      case "auth/popup-blocked":
        throw new Error(
          "Your browser blocked the login popup. Please allow popups and try again."
        );

      case "auth/network-request-failed":
        throw new Error(
          "Network error. Please check your internet connection and try again."
        );

      case "auth/account-exists-with-different-credential": {
        const email = err.customData?.email;

        if (email) {
          const methods = await fetchSignInMethodsForEmail(auth, email);

          let usedProvider = "another login method";

          if (methods.includes("google.com")) {
            usedProvider = "Google";
          } else if (methods.includes("facebook.com")) {
            usedProvider = "Facebook";
          } else if (methods.includes("password")) {
            usedProvider = "Email & Password";
          }

          throw new Error(
            `This email is already registered with ${usedProvider}. Please login using ${usedProvider} instead.`
          );
        }

        throw new Error(
          "This account already exists with a different sign-in method."
        );
      }

      default:
        console.error(err);
        throw new Error(err.response?.data?.message || err.message || "Social login failed.");
    }
  }
}

// Handle redirect result (for mobile browsers or redirect fallback)
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);

    if (!result) return null;

    const user = result.user;

    const response = await axios.post(
      "/api/users/social-login",
      {
        idToken: await user.getIdToken(),
      },
      {
        withCredentials: true,
        headers: { "ngrok-skip-browser-warning": "1" },
      }
    );

    return response.data;
  } catch (err) {
    console.error(err);
    throw new Error(err.response?.data?.message || err.message || "Redirect login failed.");
  }
}

export const socialAuthService = {
  loginWithGoogle: () => handleSocialLogin(googleProvider),
  loginWithFacebook: () => handleSocialLogin(facebookProvider),
};
