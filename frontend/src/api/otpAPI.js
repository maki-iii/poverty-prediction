import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api/users", "/api/otp")
    : "http://localhost:5000/api/otp",
  withCredentials: true,
});

export const sendOTP = (email) => API.post("/send", { email });
export const verifyOTP = (email, otp) => API.post("/verify", { email, otp });
export const resetPassword = (email, newPassword) => API.post("/reset-password", { email, newPassword });