// Only the account owner or a super administrator may access an account by ID.
module.exports = (req, res, next) => {
  if (req.user?.role === "super_admin" || String(req.user?.id) === req.params.id) return next();
  return res.status(403).json({ message: "You cannot access another user's account." });
};
