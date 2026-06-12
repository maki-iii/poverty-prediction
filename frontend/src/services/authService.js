import { login, register, logout, getMe } from "../api/authAPI";

export const authService = {
  async login({ username, password }) {
    const { data } = await login({ username, password });
    if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  },

  async register({ name, username, email, address, password }) {
    const { data } = await register({ name, username, email, address, password });
    return data;
  },

  async logout() {
    await logout();
    localStorage.removeItem("user");
  },

  async getMe() {
    const { data } = await getMe();
    return data.user;
  },

  getStoredUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isLoggedIn() {
    // since token is httpOnly we can't read it — check stored user instead
    return !!localStorage.getItem("user");
  },
};