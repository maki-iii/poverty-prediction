// src/api/authAPI.js
import axios from "axios";

const API = axios.create({
  baseURL: "/api/users",
  withCredentials: true,
});

export const register = (data) => API.post("/register", data);
export const login = (data) => API.post("/login/user", data);       
export const adminLogin = (data) => API.post("/login/admin", data); 
export const logout = () => API.post("/logout");
export const getMe = () => API.get("/me");
export const getProfile = (id) => API.get(`/${id}`);
export const updateUser = (id, data) => API.put(`/${id}`, data);
export const changePassword = (id, data) => API.put(`/${id}/change-password`, data);
export const getAllUsers = () => API.get("/");
export const deleteUser = (id) => API.delete(`/${id}`);
export const createUser = (data) => API.post("/create", data);