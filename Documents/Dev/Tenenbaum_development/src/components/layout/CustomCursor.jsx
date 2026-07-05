import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useCursor } from "../../context/CursorContext";

/**
 * Custom cursor for pointer-fine desktops: a lagging outer ring and a crisp
 * inner dot that expands over interactive elements. Adds `.has-custom-cursor`
 * to <html> so the native cursor is hidden only when this is active.
 */
export default function CustomCursor() {
  const isDesktop = useIsDesktop();
  const reduced = usePrefersReducedMotion();
  const { variant } = useCursor();
  const active = isDesktop && !reduced;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 300, damping: 28, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 300, damping: 28, mass: 0.4 });
  const dotX = useSpring(x, { stiffness: 800, damping: 40 });
  const dotY = useSpring(y, { stiffness: 800, damping: 40 });

  useEffect(() => {
    if (!active) return undefined;
    document.documentElement.classList.add("has-custom-cursor");
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [active, x, y]);

  if (!active) return null;

  const hovering = variant === "hover";

  return (
    <>
      <motion.div
        className="cursor-ring"
        style={{ x: ringX, y: ringY }}
        animate={{ scale: hovering ? 1.8 : 1, opacity: hovering ? 0.9 : 0.6 }}
        transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
      />
      <motion.div
        className="cursor-dot"
        style={{ x: dotX, y: dotY }}
        animate={{ scale: hovering ? 0.4 : 1 }}
        transition={{ duration: 0.2 }}
      />
    </>
  );
}
