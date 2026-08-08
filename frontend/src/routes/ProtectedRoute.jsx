// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ requiredRole, requiredRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Not logged in -> unauthorized (covers typing protected URLs directly)
  if (!user) return <Navigate to="/unauthorized" replace />;

  // Support both a single role (requiredRole) and multiple accepted roles (requiredRoles)
  const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : null);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;