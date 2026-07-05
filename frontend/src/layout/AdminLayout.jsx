// src/layout/UserLayout.jsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminNavbar";

export default function UserLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100 items-start">
      <AdminSidebar />

      <main className="flex-1 min-h-screen p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}