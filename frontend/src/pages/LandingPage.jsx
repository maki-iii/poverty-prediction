// Import Lib
import { useRef } from "react";

// Import Pages / Components
import NavBar from "../components/landing_page/Navbar";
import Home from "../components/landing_page/Home";
import About from "../components/landing_page/About";
import Features from "../components/landing_page/Features";
import Insights from "../components/landing_page/Insights";

// Import Back to top components
import BackToTop from "../components/common/BackToTop";

export default function LandingPage() {
  const sectionRefs = {
    home:     useRef(null),
    about:    useRef(null),
    features: useRef(null),
    insights: useRef(null),
  };

  const scrollToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <NavBar scrollToSection={scrollToSection} />

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
      <BackToTop/>
    </>
  );
}