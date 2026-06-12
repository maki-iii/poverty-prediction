// src/api/authAPI.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/users",
  withCredentials: true,
});

// Public 
export const register = (data) => API.post("/register", data);
// data: { name, username, email, address, password }

export const login = (data) => API.post("/login", data);
// data: { username, password }

// Auth / Session
export const logout = () => API.post("/logout");

export const getMe = () => API.get("/me");

// User (protected) 
export const getProfile = (id) => API.get(`/${id}`);

export const updateUser = (id, data) => API.put(`/${id}`, data);
// data: { name, email, address, ... }

export const changePassword = (id, data) => API.put(`/${id}/change-password`, data);
// data: { currentPassword, newPassword }

// Admin only 
export const getAllUsers = () => API.get("/");

export const deleteUser = (id) => API.delete(`/${id}`);

export const createUser = (data) => API.post("/create", data);
// data: { name, username, email, address, password, role }