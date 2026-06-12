import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../configs/firebase";
import axios from "axios";

async function handleSocialLogin(provider) {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const response = await axios.post("/api/users/social-login", {
    name:  user.displayName,
    email: user.email,
    uid:   user.uid,
  });

  // Store user so authService.isLoggedIn() and getStoredUser() work correctly
  if (response.data.user) {
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
}

export const socialAuthService = {
  loginWithGoogle:   () => handleSocialLogin(googleProvider),
  loginWithFacebook: () => handleSocialLogin(facebookProvider),
};