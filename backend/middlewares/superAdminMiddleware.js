const verifySuperAdmin = (req, res, next) => {
    if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Super Admin only" });
  }

  next()
}

module.exports = verifySuperAdmin