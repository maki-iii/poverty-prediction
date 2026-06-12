import { BarChart3, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar({ scrollToSection, onLoginClick, onSignUpClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [scrolled, setScrolled] = useState(false);

  const navItems = [
    { label: "Home",     id: "home" },
    { label: "About",    id: "about" },
    { label: "Features", id: "features" },
    { label: "Insights", id: "insights" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (id) => {
    setActiveId(id);
    scrollToSection(id);
    setMenuOpen(false);
  };

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md transition-all duration-300",
        scrolled
          ? "border-slate-200 shadow-sm py-0"
          : "border-transparent py-0",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 transition-all duration-300",
          scrolled ? "py-2" : "py-4",
        ].join(" ")}
      >

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex items-center justify-center rounded-lg bg-[#002366] text-white transition-all duration-300",
              scrolled ? "h-7 w-7" : "h-9 w-9",
            ].join(" ")}
          >
            <BarChart3 className={scrolled ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>
          <div className="leading-tight">
            <p
              className={[
                "font-bold tracking-tight text-[#002366] transition-all duration-300",
                scrolled ? "text-xs" : "text-sm",
              ].join(" ")}
            >
              PPS — PH
            </p>
            <p className="hidden text-[10px] font-medium uppercase tracking-widest text-slate-400 sm:block">
              Poverty Prediction System
            </p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={[
                  "relative px-4 py-2 text-sm font-medium rounded-md transition-colors group",
                  isActive
                    ? "text-[#002366]"
                    : "text-slate-600 hover:text-[#002366] hover:bg-slate-100",
                ].join(" ")}
              >
                {item.label}
                <span
                  className={[
                    "absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#002366]",
                    "transition-transform duration-200 origin-left",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
          onClick={onSignUpClick}
          className={[
            "hidden rounded-md border border-black bg-white font-semibold text-black transition-all duration-300 hover:bg-[#001a4d] hover:text-white sm:block",
            scrolled ? "px-4 py-1 text-xs" : "px-5 py-2 text-sm",
          ].join(" ")}
          >
            Get Started
          </button>
          <button
          onClick={onLoginClick}
          className={[
            "hidden rounded-md bg-[#002366] font-semibold text-white transition-all duration-300 hover:bg-[#001a4d] sm:block",
            scrolled ? "px-4 py-1 text-xs" : "px-5 py-2 text-sm",
          ].join(" ")}
          >
            Login
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-5 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={[
                  "rounded-md px-3 py-2.5 text-left text-sm font-medium transition",
                  activeId === item.id
                    ? "bg-slate-100 text-[#002366] font-semibold"
                    : "text-slate-700 hover:bg-slate-100 hover:text-[#002366]",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <button 
              onClick={onLoginClick}
              className="w-full rounded-md bg-[#002366] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#001a4d]">
                Login
              </button>
              <button 
              onClick={onSignUpClick}
              className="mt-2 w-full rounded-md border border-[#002366] bg-white px-5 py-2.5 text-sm font-semibold text-[#002366] transition hover:bg-[#001a4d] hover:text-white">
                Get Started
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}