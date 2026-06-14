import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, MapPin, BarChart2, Database,
  Menu, X, ChevronLeft, ChevronRight, LogOut, User, Settings,
  ClipboardList, FlaskConical, Sliders, Brain, ShieldCheck, ChevronDown,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ConfirmModal from "../common/ConfirmModal";
import Loader from "../common/Loader";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  {
    label: "Data",
    icon: Database,
    children: [
      { label: "Preprocessing",  icon: Sliders,   path: "/admin/data-preprocessing" },
      { label: "Dataset Mgmt",   icon: Database,  path: "/admin/dataset-management" },
      { label: "Visualization",  icon: BarChart2, path: "/admin/data-visualization" },
    ],
  },
  {
    label: "Models",
    icon: Brain,
    children: [
      { label: "Training",   icon: Brain,        path: "/admin/model-training" },
      { label: "Evaluation", icon: FlaskConical, path: "/admin/model-evaluation" },
      { label: "Selection",  icon: Sliders,      path: "/admin/model-selection" },
    ],
  },
  {
    label: "Regional",
    icon: MapPin,
    children: [
      { label: "Analysis", icon: MapPin,    path: "/admin/regional-analysis" },
      { label: "Data",     icon: BarChart2, path: "/admin/regional-data" },
    ],
  },
  { label: "Forecasting", icon: TrendingUp, path: "/admin/forecasting" },
  { label: "Audit Logs", icon: ClipboardList, path: "/admin/audit-logs" },
  { label: "User Management", icon: User, path: "/admin/user-management" },
];

function NavGroup({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const isAnyChildActive = item.children?.some((c) => location.pathname === c.path);
  const [open, setOpen] = useState(isAnyChildActive);

  // Auto-open if a child is active
  useEffect(() => {
    if (isAnyChildActive) setOpen(true);
  }, [isAnyChildActive]);

  const Icon = item.icon;

  if (collapsed) {
    return (
      <div className="relative group">
        <button
          title={item.label}
          className={`relative w-full flex justify-center p-2.5 rounded-xl text-sm font-medium transition-all duration-200
            ${isAnyChildActive ? "bg-[#002366]/10 text-[#002366]" : "text-gray-500 hover:bg-[#002366]/5 hover:text-gray-700"}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${isAnyChildActive ? "text-[#002366]" : ""}`} />
          {isAnyChildActive && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#002366] rounded-full" />
          )}
        </button>

        {/* Hover flyout for collapsed */}
        <div className="absolute left-full top-0 ml-2 w-44 bg-white rounded-xl shadow-xl border border-[#002366]/10 overflow-hidden z-50 hidden group-hover:block">
          <p className="px-3 py-2 text-[10px] font-bold text-[#002366] uppercase tracking-wide border-b border-[#002366]/10">
            {item.label}
          </p>
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const isActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => onNavigate(child.path)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors
                  ${isActive ? "bg-[#002366]/10 text-[#002366] font-semibold" : "text-gray-600 hover:bg-[#002366]/5"}`}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                {child.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
          ${isAnyChildActive ? "text-[#002366]" : "text-gray-500 hover:bg-[#002366]/5 hover:text-gray-700"}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isAnyChildActive ? "text-[#002366]" : ""}`} />
        <span className="flex-1 text-left text-xs">{item.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Children */}
      {open && (
        <div className="ml-4 mt-0.5 pl-3 border-l border-[#002366]/10 space-y-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const isActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => onNavigate(child.path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                  ${isActive
                    ? "bg-[#002366]/10 text-[#002366] font-semibold"
                    : "text-gray-500 hover:bg-[#002366]/5 hover:text-gray-700"
                  }`}
              >
                <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#002366]" : ""}`} />
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const isActive = location.pathname === item.path;
  const Icon = item.icon;

  return (
    <button
      onClick={() => onNavigate(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      className={`relative w-full flex items-center rounded-xl text-sm font-medium
        transition-all duration-200 ease-in-out
        ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"}
        ${isActive
          ? "bg-[#002366]/10 text-[#002366] shadow-sm scale-[1.02]"
          : hovered
            ? "bg-[#002366]/5 text-gray-700 scale-[1.01]"
            : "text-gray-500"
        }`}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#002366] rounded-r-full" />
      )}
      <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200
        ${hovered && !isActive ? "scale-110" : ""}
        ${isActive ? "text-[#002366]" : ""}`}
      />
      {!collapsed && <span className="flex-1 text-left text-xs">{item.label}</span>}
      {!collapsed && isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#002366]" />}
      {collapsed && isActive && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#002366] rounded-full" />
      )}
    </button>
  );
}

function AdminCard({ user, collapsed, onLogout, onNavigate }) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const MenuItems = () => (
    <>
      <div className="px-3 py-2.5 border-b border-[#002366]/10">
        <div className="flex items-center gap-1 mb-0.5">
          <ShieldCheck className="h-3 w-3 text-[#002366]" />
          <span className="text-[10px] font-bold text-[#002366] uppercase tracking-wide">Admin</span>
        </div>
        <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || "Admin"}</p>
        <p className="text-[10px] text-gray-400 truncate">{user?.email || ""}</p>
      </div>
      <button
        onClick={() => { onNavigate("/admin/settings"); setShowMenu(false); }}
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
    </>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center relative" ref={ref}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 rounded-full bg-[#002366] flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <ShieldCheck className="h-4 w-4 text-white" />
        </button>
        {showMenu && (
          <div className="absolute bottom-full left-full mb-1 ml-2 w-48 bg-white rounded-xl shadow-xl border border-indigo-100 overflow-hidden z-50">
            <MenuItems />
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
        <div className="w-8 h-8 rounded-full bg-[#002366] flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name || "Admin"}</p>
            <span className="text-[9px] font-bold text-[#002366] bg-[#002366]/10 px-1.5 py-0.5 rounded-full shrink-0">ADMIN</span>
          </div>
          <p className="text-[10px] text-gray-400 truncate">{user?.username || user?.email || ""}</p>
        </div>
        <Settings className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-[#002366]/10 overflow-hidden z-50">
          <MenuItems />
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate, collapsed, onLogout, user }) {
  return (
    <div className="flex flex-col h-full py-4 bg-white">

      {/* Logo */}
      <div className={`px-4 mb-4 pb-4 border-b border-[#002366]/10 ${collapsed ? "items-center flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-9 h-9 bg-[#002366] rounded-xl flex items-center justify-center shadow">
            <span className="text-white font-black text-xs">P</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold leading-tight text-gray-800">PPS-PH</h2>
              <p className="text-[10px] text-gray-400">Poverty Prediction System</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) =>
          item.children ? (
            <NavGroup key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ) : (
            <NavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          )
        )}
      </nav>

      {/* Admin card */}
      <div className="px-2 mt-4 pt-4 border-t border-[#002366]/10">
        <AdminCard user={user} collapsed={collapsed} onLogout={onLogout} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function AdminSidebar() {
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

  const handleLogoutRequest = () => setShowLogoutModal(true);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    navigate("/admin/login", { replace: true });
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <>
      <ConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
        title="Log out?"
        subtitle="You'll be returned to the admin login screen."
        warning={null}
        confirmLabel={
          isLoggingOut
            ? <span className="flex items-center justify-center gap-2"><Loader /> Logging out…</span>
            : "Log Out"
        }
        cancelLabel="Stay"
        fields={[]}
      />

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 lg:hidden bg-white text-[#002366] p-2 rounded-xl shadow-lg border border-[#002366]/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed top-0 left-0 z-50 h-full w-60 lg:hidden transform transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full m-3 bg-white rounded-2xl shadow-2xl overflow-hidden relative border border-[#002366]/10">
          <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-[#002366] z-10">
            <X className="h-4 w-4" />
          </button>
          <SidebarContent onNavigate={handleNavigate} collapsed={false} onLogout={handleLogoutRequest} user={user} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        <div className="relative m-3 bg-white rounded-2xl shadow-lg border border-[#002366]/10 flex flex-col flex-1 min-h-[calc(100vh-24px)] overflow-visible">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 z-10 bg-white border border-[#002366]/10 rounded-full p-1 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
          >
            {collapsed
              ? <ChevronRight className="h-3.5 w-3.5 text-[#002366]" />
              : <ChevronLeft className="h-3.5 w-3.5 text-[#002366]" />
            }
          </button>
          <SidebarContent onNavigate={handleNavigate} collapsed={collapsed} onLogout={handleLogoutRequest} user={user} />
        </div>
      </div>
    </>
  );
}