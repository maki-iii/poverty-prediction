import * as UserApi from "../api/userApi";

const UserManagementService = {
  getAllUsers: async () => {
    const { data } = await UserApi.getAllUsers();
    return data;
  },

  getUser: async (id) => {
    const { data } = await UserApi.getUser(id);
    return data;
  },

  createUser: async ({ name, username, password, email, address, role }) => {
    const { data } = await UserApi.createUser({ name, username, password, email, address, role });
    return data;
  },

  updateUser: async (id, { name, address, email }) => {
    const { data } = await UserApi.updateUser(id, { name, address, email });
    return data;
  },

  changePassword: async (id, newPassword) => {
    const { data } = await UserApi.changePassword(id, newPassword);
    return data;
  },

  deleteUser: async (id) => {
    const { data } = await UserApi.deleteUser(id);
    return data;
  },
};

export default UserManagementService;