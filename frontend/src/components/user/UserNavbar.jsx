import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, MapPin, BarChart2,
  Menu, X, ChevronLeft, ChevronRight, LogOut, User, Settings,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ConfirmModal from "../common/ConfirmModal"; 
import Loader from "../common/Loader";             

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/user/dashboard" },
  { label: "Forecasting", icon: TrendingUp, path: "/user/forecasting" },
  { label: "Regional Analysis", icon: MapPin, path: "/user/regional-analysis" },
  { label: "Visualization", icon: BarChart2, path: "/user/data-visualization" },
];

function UserCard({ user, collapsed, onLogout, onNavigate }) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (collapsed) {
    return (
      <div className="flex justify-center relative" ref={ref}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 rounded-full bg-[#002366] flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <User className="h-4 w-4 text-white" />
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-full mb-1 ml-2 w-44 bg-white rounded-xl shadow-xl border border-indigo-100 overflow-hidden z-50">
            <div className="px-3 py-2.5 border-b border-[#002366]/10">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email || ""}</p>
            </div>
            <button
              onClick={() => { onNavigate("/user/settings"); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-[#002366]/5 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </button>
            <button
              onClick={() => { onLogout(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#002366]/5 hover:bg-[#002366]/10 transition-colors border border-[#002366]/10"
      >
        <div className="w-8 h-8 rounded-full bg-[#002366] flex items-center justify-center shrink-0 overflow-hidden">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || "User name"}</p>
          <p className="text-[10px] text-gray-400 truncate">{user?.username || user?.email || ""}</p>
        </div>
        <Settings className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </button>

      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-[#002366]/10 overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-[#002366]/10">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email || ""}</p>
          </div>
          <button
            onClick={() => { onNavigate("/user/settings"); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-[#002366]/5 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
          <button
            onClick={() => { onLogout(); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate, collapsed, onLogout, user }) {
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);

  return (
    <div className="flex flex-col h-full py-4">
      <div className={`px-4 mb-4 pb-4 border-b border-[#002366]/10 ${collapsed ? "items-center flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-9 h-9 bg-[#002366] rounded-xl flex items-center justify-center shadow">
            <span className="text-white font-black text-xs">P</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 leading-tight">PPS-PH</h2>
              <p className="text-[10px] text-gray-400">Poverty Prediction System</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          const isHovered = hoveredPath === path;
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              onMouseEnter={() => setHoveredPath(path)}
              onMouseLeave={() => setHoveredPath(null)}
              title={collapsed ? label : undefined}
              className={`relative w-full flex items-center rounded-xl text-sm font-medium
                transition-all duration-200 ease-in-out
                ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}
                ${isActive
                  ? "bg-[#002366]/10 text-[#002366] shadow-sm scale-[1.02]"
                  : isHovered
                    ? "bg-[#002366]/5 text-gray-700 scale-[1.01]"
                    : "text-gray-500"
                }`}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#002366] rounded-r-full" />
              )}
              <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200
                ${isHovered && !isActive ? "scale-110" : ""}
                ${isActive ? "text-[#002366]" : ""}`}
              />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {!collapsed && isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#002366]" />}
              {collapsed && isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#002366] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 mt-4 pt-4 border-t border-[#002366]/10">
        <UserCard
          user={user}
          collapsed={collapsed}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Step 1: open the confirm modal
  const handleLogoutRequest = () => {
    setShowLogoutModal(true);
  };

  // Step 2: user confirmed — show loader, then log out
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    navigate("/", { replace: true });
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Logout confirm modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
        title="Log out?"
        subtitle="Are you sure you want to logout?"
        warning={null}
        confirmLabel={
          isLoggingOut
            ? <span className="flex items-center justify-center gap-2"><Loader /> Logging out…</span>
            : "Log Out"
        }
        cancelLabel="Stay"
        fields={[]}
      />

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 lg:hidden bg-white text-[#002366] p-2 rounded-xl shadow-lg border border-[#002366]/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed top-0 left-0 z-50 h-full w-60 lg:hidden transform transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full m-3 bg-white rounded-2xl shadow-2xl overflow-hidden relative border border-[#002366]/10">
          <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-[#002366] z-10">
            <X className="h-4 w-4" />
          </button>
          <SidebarContent onNavigate={handleNavigate} collapsed={false} onLogout={handleLogoutRequest} user={user} />
        </div>
      </div>

      <div className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        <div className="relative m-3 bg-white rounded-2xl shadow-lg border border-[#002366]/10 flex flex-col flex-1 min-h-[calc(100vh-24px)] overflow-visible">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-10 bg-white border border-[#002366]/10 rounded-full p-1 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-[#002366]" /> : <ChevronLeft className="h-3.5 w-3.5 text-[#002366]" />}
          </button>
          <SidebarContent onNavigate={handleNavigate} collapsed={collapsed} onLogout={handleLogoutRequest} user={user} />
        </div>
      </div>
    </>
  );
}