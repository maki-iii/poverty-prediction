// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  // Not logged in -> unauthorized (covers typing protected URLs directly)
  if (!user) return <Navigate to="/unauthorized" replace />;
  // Logged in but wrong role -> unauthorized
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export default ProtectedRoute;