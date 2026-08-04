import axiosInstance from "../configs/axiosInstance";

const BASE = "/api/users";

export const getAllUsers = () =>
  axiosInstance.get(BASE);

export const getUser = (id) =>
  axiosInstance.get(`${BASE}/${id}`);

export const createUser = (payload) =>
  axiosInstance.post(`${BASE}/create`, payload);

export const updateUser = (id, payload) =>
  axiosInstance.put(`${BASE}/${id}`, payload);

export const changePassword = (id, newPassword) =>
  axiosInstance.put(`${BASE}/${id}/change-password`, { newPassword });

export const deleteUser = (id) =>
  axiosInstance.delete(`${BASE}/${id}`);