const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const admin = require("../configs/firebaseAdmin");
const AuditLogService = require("./auditLogService");
const otpService = require("./otp/otpService");
const { randomBytes } = require("crypto");

const validatePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
  return regex.test(password);
};

const UserService = {

  socialLogin: async ({ idToken }) => {
    if (typeof idToken !== "string" || !idToken) {
      throw new Error("Please sign in with Google or Facebook again.");
    }
    let identity;
    try {
      identity = await admin.auth().verifyIdToken(idToken, true);
    } catch {
      throw new Error("Social sign-in expired or is invalid. Please sign in again.");
    }
    if (!identity.email || !identity.email_verified || !identity.uid ||
        !["google.com", "facebook.com"].includes(identity.firebase?.sign_in_provider)) {
      throw new Error("Social sign-in requires a verified Google or Facebook email.");
    }
    const email = otpService.normalizeEmail(identity.email);
    const uid = identity.uid;
    const name = identity.name || email.split("@")[0];
    let user = await User.findByEmail(email);

    // Never link an existing password account by email alone.
    if (user && user.uid !== uid) {
      throw new Error("This email already has an account. Use its original sign-in method.");
    }

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
        password: randomBytes(32).toString("hex"),
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
      details: `Created user "${username}"`,
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

    const roleMatches =
      !expectedRole ||
      (Array.isArray(expectedRole) ? expectedRole.includes(user?.role) : user?.role === expectedRole);

    if (!user || !roleMatches) {
      throw new Error("Invalid username or password");
    }

    // Older social accounts used their public Firebase UID as their password.
    if (user.uid && password === user.uid) {
      throw new Error("Please use social sign-in or reset your password.");
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

updateUser: async (id, { name, address, email }, actor = null) => {
    if (!name || !address || !email) {
      throw new Error("Please fill all the fields!");
    }

    const existingUser = await User.findById(id);

    const affectedRows = await User.update(id, { name, address, email });

    if (affectedRows === 0) {
      throw new Error("User not found or no changes made");
    }

    await AuditLogService.log({
      userId: actor?.id ?? id,
      username: actor?.username || null,
      action: AuditLogService.ACTIONS.USER_UPDATE,
      details: `Updated user "${existingUser?.username || name}"`,
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
        details: `Changed password for user "${user.username}"`,
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
  resetPassword: async (email, newPassword, resetToken) => {
    if (!validatePassword(newPassword)) {
      throw new Error(
        "Password must be at least 8 characters long, include uppercase, lowercase, and a special character"
      );
    }

    email = otpService.normalizeEmail(email);
    otpService.consumeReset(email, resetToken);
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error("No account found with that email");
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
      details: `Deleted user "${user?.username || "unknown"}"`,
    });

    return { message: "User deleted successfully" };
  }
};

module.exports = UserService;
