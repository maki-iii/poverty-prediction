// src/layout/UserLayout.jsx
import { Outlet } from "react-router-dom";
import UserSidebar from "../components/user/UserNavbar";

export default function UserLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <UserSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}