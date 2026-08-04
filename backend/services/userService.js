const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const admin = require("../configs/firebaseAdmin");
const AuditLogService = require("./auditLogService");

const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
  return regex.test(password);
};

const UserService = {

  socialLogin: async ({ name, email, uid }) => {
    let user = await User.findByEmail(email);

    if (!user) {
      const generateUsername = async (name) => {
        const firstName = name.split(" ")[0].toLowerCase();
        let username;
        let exists = true;

        while (exists) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          username = `${firstName}${randomNum}`;
          exists = await User.findByUsername(username);
        }

        return username;
      };

      const insertId = await User.create({
        name,
        email,
        username: await generateUsername(name),
        password: uid,
        uid: uid,
        address: "N/A",
        role: "user",
      });

      user = await User.findById(insertId);

      await AuditLogService.log({
        userId: user.id,
        username: user.username,
        action: AuditLogService.ACTIONS.USER_CREATION,
        details: `Account created via social login (${email})`,
      });
    }

    return {
      id:       user.id,
      name:     user.name,
      username: user.username,
      email:    user.email,
      address:  user.address,
      role:     user.role,
    };
  },

  // Register user without role
  register: async ({ name, username, password, email, address }) => {
    if (!name || !username || !password || !email || !address) {
      throw new Error("Please fill all the fields!");
    }

    if (!validatePassword(password)) {
      throw new Error(
        "Password must be at least 8 characters long, include uppercase, lowercase, and a special character"
      );
    }

    const emailExists = await User.checkEmail(email);
    if (emailExists) {
      throw new Error("Email already exists");
    }

    const usernameExist = await User.findByUsername(username);
    if (usernameExist) {
      throw new Error(`Username ${username} is not available`);
    }

    const userId = await User.create({
      name,
      username,
      password,
      email,
      address,
      role: "user"
    });

    await AuditLogService.log({
      userId,
      username,
      action: AuditLogService.ACTIONS.USER_CREATION,
      details: "Self-registered account",
    });

    return {
      message: "User registered successfully",
      userId
    };
  },

  // Create user with role (admin action)
  createUser: async ({ name, username, password, email, address, role }, actor = null) => {
    if (!name || !username || !password || !email || !address || !role) {
      throw new Error("Please fill all the fields!");
    }

    if (!validatePassword(password)) {
      throw new Error(
        "Password must be at least 8 characters long, include uppercase, lowercase, and a special character"
      );
    }

    const emailExists = await User.checkEmail(email);
    if (emailExists) {
      throw new Error("Email already exists");
    }

    const userId = await User.create({
      name,
      username,
      password,
      email,
      address,
      role
    });

    await AuditLogService.log({
      userId: actor?.id ?? null,
      username: actor?.username || username,
      action: AuditLogService.ACTIONS.USER_CREATION,
      details: `Created user "${username}" (role: ${role})`,
    });

    return {
      message: "User created successfully",
      userId
    };
  },


  login: async ({ username, password, expectedRole }) => {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }

    const user = await User.findByUsername(username);
    if (!user || expectedRole && user.role !== expectedRole) {
      throw new Error("Invalid username or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid username or password");
    }

    return {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     user.role,
      username: user.username
    };
  },

  getProfile: async (id) => {
    const user = await User.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },

  getAllUsers: async () => {
    return await User.getAll();
  },

  // Update user info
  updateUser: async (id, { name, address, email }, actor = null) => {
    if (!name || !address || !email) {
      throw new Error("Please fill all the fields!");
    }

    const affectedRows = await User.update(id, { name, address, email });

    if (affectedRows === 0) {
      throw new Error("User not found or no changes made");
    }

    await AuditLogService.log({
      userId: actor?.id ?? id,
      username: actor?.username || null,
      action: AuditLogService.ACTIONS.USER_UPDATE,
      details: `Updated user id=${id}`,
    });

    return {
      message: "User updated successfully"
    };
  },

  // Change password (authenticated user or admin)
  changePassword: async (id, oldPassword, newPassword, isAdmin = false, actor = null) => {
    if (!newPassword) {
      throw new Error("New password is required");
    }

    const user = await User.findByIdWithPassword(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (isAdmin) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.updatePassword(id, hashedPassword);

      await AuditLogService.log({
        userId: actor?.id ?? null,
        username: actor?.username || null,
        action: AuditLogService.ACTIONS.USER_CHANGE_PASSWORD,
        details: `Admin changed password for user id=${id}`,
      });

      return { message: "Password changed successfully" };
    }

    if (!oldPassword) {
      throw new Error("Old password and new password are required");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error("Old password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(id, hashedPassword);

    await AuditLogService.log({
      userId: user.id,
      username: user.username,
      action: AuditLogService.ACTIONS.USER_CHANGE_PASSWORD,
      details: "Self-service password change",
    });

    return { message: "Password changed successfully" };
  },

  // Reset password via OTP (forgot password)
  resetPassword: async (email, newPassword) => {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error("No account found with that email");
    }

    if (!validatePassword(newPassword)) {
      throw new Error(
        "Password must be at least 8 characters long, include uppercase, lowercase, and a special character"
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashedPassword);

    await AuditLogService.log({
      userId: user.id,
      username: user.username,
      action: AuditLogService.ACTIONS.USER_CHANGE_PASSWORD,
      details: "Password reset via forgot-password flow",
    });

    return { message: "Password reset successfully" };
  },

  // Delete user
  deleteUser: async (id, actor = null) => {
    const user = await User.findById(id);

    if (user && user.uid) {
      await admin.auth().deleteUser(user.uid);
    }

    const affectedRows = await User.delete(id);

    if (affectedRows === 0) {
      throw new Error("User not found");
    }

    await AuditLogService.log({
      userId: actor?.id ?? null,
      username: actor?.username || null,
      action: AuditLogService.ACTIONS.USER_DELETION,
      details: `Deleted user "${user?.username || id}" (id=${id})`,
    });

    return { message: "User deleted successfully" };
  }
};

module.exports = UserService;