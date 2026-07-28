import axios from "axios";
import envConfig from "../configs/env.config";

// Central axios instance -- every service imports THIS instead of
// creating its own axios calls. Makes it easy to add auth headers,
// interceptors, or change the base URL in one place later.
const axiosInstance = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 15000, // 15s -- pipeline trigger calls (train/forecast) can take a few seconds
  withCredentials: true, // sends cookies (e.g. your JWT auth cookie) with requests
});

// Optional: centralize error logging/handling here later
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;