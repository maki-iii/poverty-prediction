// src/layout/AdminLayout.jsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminNavbar";
import OperationGuardProvider from "../context/OperationGuardContext";
import Footer from "../components/common/Footer";

export default function AdminLayout() {
  return (
    <OperationGuardProvider>
    <div className="bg-gray-100">
      <div className="flex items-start">
        <AdminSidebar />

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
    </OperationGuardProvider>
  );
}