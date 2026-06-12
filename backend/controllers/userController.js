const UserService = require("../services/userService");
const jwt = require("jsonwebtoken");

const UserController = {

  // Social login (Google / Facebook)
  socialLogin: async (req, res) => {
    try {
      const { name, email, uid } = req.body;

      const user = await UserService.socialLogin({ name, email, uid });

      const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Login successful",
        user,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // Register user without role
  register: async (req, res) => {
    try {
      const { name, username, password, email, address } = req.body;
      const result = await UserService.register({
        name,
        username,
        password,
        email,
        address
      });
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // Create user with role
  createUser: async (req, res) => {
    try {
      const { name, username, password, email, address, role } = req.body;
      const result = await UserService.createUser({
        name,
        username,
        password,
        email,
        address,
        role
      });
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("Login attempt:", username);

      const user = await UserService.login({ username, password });
      console.log("UserService.login success:", user?.username);

      const token = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Login successful",
        user,
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      const isConnectionError =
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED");

      return res.status(isConnectionError ? 500 : 401).json({
        message: error.message,
      });
    }
  },

  // Logout user
  logout: async (req, res) => {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out successfully" });
  },

  // Get user by ID
  getProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await UserService.getProfile(id);
      return res.status(200).json(user);
    } catch (error) {
      return res.status(404).json({ message: error.message });
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await UserService.getAllUsers();
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, email } = req.body;
      const result = await UserService.updateUser(id, { name, address, email });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { oldPassword, newPassword } = req.body;
      const isAdmin = req.user?.role === "admin";

      const result = await UserService.changePassword(
        id,
        oldPassword,
        newPassword,
        isAdmin
      );
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await UserService.deleteUser(id);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(404).json({ message: error.message });
    }
  }
};

module.exports = UserController;