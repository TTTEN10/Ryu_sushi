import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CustomCursor from "./CustomCursor";
import ScrollProgress from "../ui/ScrollProgress";
import ScrollToTop from "./ScrollToTop";
import Home from "../../pages/Home";
import Contact from "../../pages/Contact";
import Privacy from "../../pages/Privacy";
import Terms from "../../pages/Terms";
import NotFound from "../../pages/NotFound";
import { EASE } from "../../animations/variants";

/** Wraps each routed page in a soft fade transition. */
function Page({ children }) {
  return (
    <motion.main
      id="main"
      className="page page-fade"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.main>
  );
}

/** Global chrome + animated routing outlet. */
export default function Layout() {
  const location = useLocation();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ScrollProgress />
      <CustomCursor />
      <Navbar />
      <ScrollToTop />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/contact" element={<Page><Contact /></Page>} />
          <Route path="/privacy" element={<Page><Privacy /></Page>} />
          <Route path="/terms" element={<Page><Terms /></Page>} />
          <Route path="*" element={<Page><NotFound /></Page>} />
        </Routes>
      </AnimatePresence>

      <Footer />
    </>
  );
}
