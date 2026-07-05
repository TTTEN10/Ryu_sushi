import { useEffect } from "react";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Initialises Lenis smooth scrolling — very slow, natural inertia.
 * Exposes the instance on `window.__lenis` so anchor navigation can defer to
 * it. Disabled entirely when the user prefers reduced motion.
 */
export function useLenis() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;

    const lenis = new Lenis({
      duration: 1.4, // slow, luxurious
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    });

    window.__lenis = lenis;

    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, [reduced]);
}
