import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { NAV_LINKS, SITE } from "../../constants/site";
import { scrollToHash } from "../../utils/scroll";
import { useCursorHover } from "../../context/CursorContext";
import { EASE } from "../../animations/variants";
import { ArrowRight, Close, Menu } from "../../icons/Icons";

/**
 * Floating, centered, sticky glass navigation. Shrinks slightly on scroll and
 * collapses into a full-screen glass sheet on mobile.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const location = useLocation();
  const hover = useCursorHover();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  const handleNav = (link) => (e) => {
    setOpen(false);
    if (link.hash) {
      e.preventDefault();
      if (location.pathname !== "/") {
        navigate("/");
        // Wait for the home page to mount before scrolling.
        setTimeout(() => scrollToHash(link.hash), 260);
      } else {
        scrollToHash(link.hash);
      }
    } else {
      navigate(link.to);
    }
  };

  return (
    <>
      <motion.header
        className="nav-wrap"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
      >
        <motion.nav
          className="nav glass--nav"
          aria-label="Primary"
          animate={{
            scale: scrolled ? 0.96 : 1,
            paddingTop: scrolled ? 8 : 12,
            paddingBottom: scrolled ? 8 : 12,
          }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <a
            href="/#top"
            className="nav__brand"
            onClick={handleNav({ to: "/", hash: "#top" })}
            {...hover}
          >
            <span className="nav__brand-mark">T</span>
            <span className="nav__brand-name">{SITE.name}</span>
          </a>

          <ul className="nav__links">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.hash ? `/${link.hash}` : link.to}
                  className="nav__link"
                  onClick={handleNav(link)}
                  {...hover}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="nav__cta">
            <Button to="/contact" size="sm" icon={<ArrowRight size={16} />}>
              Book a consultation
            </Button>
          </div>

          <button
            className="nav__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            {...hover}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="nav-sheet glass"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <motion.ul
              className="nav-sheet__links"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            >
              {NAV_LINKS.map((link) => (
                <motion.li
                  key={link.label}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <a href={link.hash ? `/${link.hash}` : link.to} onClick={handleNav(link)}>
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
            <Button to="/contact" size="lg" className="btn--full" onClick={() => setOpen(false)}>
              Book a consultation
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
