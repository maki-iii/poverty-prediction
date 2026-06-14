// Dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Auth
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./routes/ProtectedRoute";

// Import Pages
import LandingPage from "./pages/LandingPage";

// User Imports
import UserDashboard from "./pages/user/UserDashboard";
import UserDataVisualization from "./pages/user/UserDataVisualization";
import UserForecasting from "./pages/user/UserForecasting";
import UserRegionalAnalysis from "./pages/user/UserRegionalAnalysis";
import UserRegionalData from "./pages/user/UserRegionalData";

// Admin Imports
import AdminLogin from "./pages/admin/AdminLogin";
import AuditLogs from "./pages/admin/AuditLogs";
import Dashboard from "./pages/admin/Dashboard";
import DataPreprocessing from "./pages/admin/DataPreprocessing";
import DatasetManagement from "./pages/admin/DatasetManagement";
import DataVisualization from "./pages/admin/DataVisualization";
import Forecasting from "./pages/admin/Forecasting";
import ModelEvaluation from "./pages/admin/ModelEvaluation";
import ModelSelection from "./pages/admin/ModelSelection";
import ModelTraining from "./pages/admin/ModelTraining";
import RegionalAnalysis from "./pages/admin/RegionalAnalysis";
import RegionalData from "./pages/admin/RegionalData";
import UserManagement from "./pages/admin/UserManagement";

// Unauthorized
import Unauthorized from "./pages/Unauthorized";

// Layout
import UserLayout from "./layout/UserLayout";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* USER ROUTES */}
          <Route element={<ProtectedRoute requiredRole="user" />}>
            <Route element={<UserLayout />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/data-visualization" element={<UserDataVisualization />} />
              <Route path="/user/forecasting" element={<UserForecasting />} />
              <Route path="/user/regional-analysis" element={<UserRegionalAnalysis />} />
              <Route path="/user/regional-data" element={<UserRegionalData />} />
            </Route>
          </Route>

          {/* ADMIN ROUTES */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />
            <Route path="/admin/data-preprocessing" element={<DataPreprocessing />} />
            <Route path="/admin/dataset-management" element={<DatasetManagement />} />
            <Route path="/admin/data-visualization" element={<DataVisualization />} />
            <Route path="/admin/forecasting" element={<Forecasting />} />
            <Route path="/admin/model-evaluation" element={<ModelEvaluation />} />
            <Route path="/admin/model-selection" element={<ModelSelection />} />
            <Route path="/admin/model-training" element={<ModelTraining />} />
            <Route path="/admin/regional-analysis" element={<RegionalAnalysis />} />
            <Route path="/admin/regional-data" element={<RegionalData />} />
            <Route path="/admin/user-management" element={<UserManagement />} />
          </Route>

          {/* FALLBACK ROUTE */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;