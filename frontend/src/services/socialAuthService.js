import { signInWithPopup, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../configs/firebase";
import axios from "axios";

async function handleSocialLogin(provider) {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const response = await axios.post("/api/users/social-login", {
      name:  user.displayName,
      email: user.email,
      uid:   user.uid,
    });

    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  
  }catch (err) {
    if (err.code === "auth/account-exists-with-different-credential") {
      const email = err.customData?.email;
      const methods = await fetchSignInMethodsForEmail(auth, email);
      
      console.log("methods:", methods); // ← add this to see what's returned

      const usedProvider = methods.includes("google.com") 
        ? "Google" 
        : methods.includes("facebook.com") 
        ? "Facebook"
        : "another login method";

      throw new Error(`This email is already registered with ${usedProvider}. Please login using ${usedProvider} instead.`);
    }
    throw err;
  }
}

export const socialAuthService = {
  loginWithGoogle:   () => handleSocialLogin(googleProvider),
  loginWithFacebook: () => handleSocialLogin(facebookProvider),
};