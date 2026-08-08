// Dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Auth
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./routes/ProtectedRoute";

// Import Pages
import LandingPage from "./pages/LandingPage";

// User Imports
import UserDashboard from "./pages/user/UserDashboard";
import UserDataset from "./pages/user/UserDataset";
import UserDataVisualization from "./pages/user/UserDataVisualization";
import UserForecasting from "./pages/user/UserForecasting";
import UserMethods from "./pages/user/UserMethods";
import UserAnalysis from "./pages/user/UserAnalysis";
import UserData from "./pages/user/UserData";

// Admin Imports
import AdminLogin from "./pages/admin/AdminLogin";
import AuditLogs from "./pages/admin/AuditLogs";
import Dashboard from "./pages/admin/Dashboard";
import DatasetManagement from "./pages/admin/DatasetManagement";
import Forecasting from "./pages/admin/Forecasting";
import Methods from "./pages/admin/Methods";
import ModelEvaluation from "./pages/admin/ModelEvaluation";
import ModelTraining from "./pages/admin/ModelTraining";
import Analysis from "./pages/admin/Analysis";
import Data from "./pages/admin/Data";
import Visualization from "./pages/admin/Visualization";
import UserManagement from "./pages/admin/UserManagement";

// Unauthorized
import Unauthorized from "./pages/Unauthorized";

// Layout
import UserLayout from "./layout/UserLayout";
import AdminLayout from "./layout/AdminLayout";

// Context
import { ToastProvider } from "./context/ToastContext";

// Redirect if logged in
import RedirectIfAuthenticated from "./routes/RedirectIfAuthenticated"; 

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <RedirectIfAuthenticated>
                  <AdminLogin />
                </RedirectIfAuthenticated>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* USER ROUTES */}
            <Route element={<ProtectedRoute requiredRole="user" />}>
              <Route element={<UserLayout />}>
                <Route path="/user/dashboard" element={<UserDashboard />} />
                <Route path="/user/dataset" element={<UserDataset />} />
                <Route path="/user/data" element={<UserData />} />
                <Route path="/user/methods" element={<UserMethods />} />
                <Route path="/user/forecasting" element={<UserForecasting />} />
                <Route path="/user/analysis" element={<UserAnalysis />} />
                <Route path="/user/data-visualization" element={<UserDataVisualization />} />

                {/* Default User Route */}
                <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
              </Route>
            </Route>

            {/* ADMIN ROUTES */}
            <Route element={<ProtectedRoute requiredRoles={["admin", "super_admin"]} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/dataset-management" element={<DatasetManagement />} />
                <Route path="/admin/data" element={<Data />} />
                <Route path="/admin/methods" element={<Methods />} />
                <Route path="/admin/model-training" element={<ModelTraining />} />
                <Route path="/admin/forecasting" element={<Forecasting />} />
                <Route path="/admin/model-evaluation" element={<ModelEvaluation />} />
                <Route path="/admin/analysis" element={<Analysis />} />
                <Route path="/admin/visualization" element={<Visualization />} />
                <Route path="/admin/user-management" element={<UserManagement />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />

                {/* Default Admin Route */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>
            </Route>

            {/* FALLBACK ROUTE */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;