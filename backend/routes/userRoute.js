const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyAdmin = require("../middlewares/adminMiddleware");
const verifySuperAdmin = require("../middlewares/superAdminMiddleware");

// Public routes
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/login/user", UserController.userLogin);
router.post("/login/admin", UserController.adminLogin);
router.post("/social-login", UserController.socialLogin);

// Use verify token to all routes
router.use(verifyToken);

// Protected routes (logged-in users)
router.post("/logout", UserController.logout);
router.get("/me", (req, res) => {
  res.json({
    message: "Authorized",
    user: req.user,
  });
});

// Admin and user
router.put("/:id", UserController.updateUser);
router.get("/:id", UserController.getProfile);
router.put("/:id/change-password", UserController.changePassword);

// Admin-only routes
router.get("/", verifySuperAdmin, UserController.getAllUsers);
router.delete("/:id", verifySuperAdmin, UserController.deleteUser);

// Create user with role
router.post("/create", verifySuperAdmin, UserController.createUser);

module.exports = router;