import { login, register, logout, getMe, adminLogin } from "../api/authAPI";

export const authService = {
  async login({ username, password }) {
    const { data } = await login({ username, password });
    return data;
  },

  async adminLogin({ username, password }) {
    const { data } = await adminLogin({ username, password });
    return data;
  },

  async register({ name, username, email, address, password }) {
    const { data } = await register({ name, username, email, address, password });
    return data;
  },

  async logout() {
    await logout();
  },

  async getMe() {
    const { data } = await getMe();
    return data.user;
  },
};