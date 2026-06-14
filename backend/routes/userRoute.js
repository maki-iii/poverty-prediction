const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyAdmin = require("../middlewares/adminMiddleware");

// Public routes
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/login/user", UserController.userLogin);
router.post("/login/admin", UserController.adminLogin);
router.post("/social-login", UserController.socialLogin);

// Protected routes (logged-in users)
router.post("/logout", verifyToken, UserController.logout);
router.get("/me", verifyToken, (req, res) => {
  res.json({
    message: "Authorized",
    user: req.user,
  });
});

// Admin and user
router.put("/:id", verifyToken, UserController.updateUser);
router.get("/:id", verifyToken, UserController.getProfile);
router.put("/:id/change-password", verifyToken, UserController.changePassword);

// Admin-only routes
router.get("/", verifyToken, verifyAdmin, UserController.getAllUsers);
router.delete("/:id", verifyToken, verifyAdmin, UserController.deleteUser);

// Create user with role
router.post("/create", verifyToken, verifyAdmin, UserController.createUser);

module.exports = router;