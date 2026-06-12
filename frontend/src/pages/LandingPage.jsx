"use client";
import { useRef, useState } from "react";

import NavBar from "../components/landing_page/Navbar";
import Home from "../components/landing_page/Home";
import About from "../components/landing_page/About";
import Features from "../components/landing_page/Features";
import Insights from "../components/landing_page/Insights";
import BackToTop from "../components/common/BackToTop";

import LoginModal from "../components/auth/LoginModal";
import SignUpModal from "../components/auth/SignUpModal";

export default function LandingPage() {
  const [modal, setModal] = useState(null); // null | "login" | "signup"

  const sectionRefs = {
    home:     useRef(null),
    about:    useRef(null),
    features: useRef(null),
    insights: useRef(null),
  };

  const scrollToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <NavBar
        scrollToSection={scrollToSection}
        onLoginClick={() => setModal("login")}
        onSignUpClick={() => setModal("signup")}
      />

      <main>
        <section id="home" ref={sectionRefs.home} className="min-h-screen">
          <Home scrollToSection={scrollToSection} />
        </section>
        <section id="about" ref={sectionRefs.about} className="min-h-screen">
          <About />
        </section>
        <section id="features" ref={sectionRefs.features} className="min-h-screen">
          <Features />
        </section>
        <section id="insights" ref={sectionRefs.insights} className="min-h-screen">
          <Insights />
        </section>
      </main>

      <BackToTop />

      <LoginModal
        isOpen={modal === "login"}
        onClose={() => setModal(null)}
        onSwitchToSignUp={() => setModal("signup")}
      />
      <SignUpModal
        isOpen={modal === "signup"}
        onClose={() => setModal(null)}
        onSwitchToLogin={() => setModal("login")}
      />
    </>
  );
}