import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/common/Loader";

// Wraps public-only pages (like the login page). If a valid session
// already exists, redirect straight to the correct dashboard instead
// of showing the login form again.
export default function RedirectIfAuthenticated({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (user) {
    const destination = user.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
    return <Navigate to={destination} replace />;
  }

  return children;
}