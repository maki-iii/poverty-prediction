import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api/users", "/api/otp")
    : "/api/otp",
  withCredentials: true,
  headers: { "ngrok-skip-browser-warning": "1" },
});

export const sendOTP = (email) => API.post("/send", { email });
export const verifyOTP = (email, otp) => API.post("/verify", { email, otp });
export const resetPassword = (email, newPassword, resetToken) => API.post("/reset-password", { email, newPassword, resetToken });
