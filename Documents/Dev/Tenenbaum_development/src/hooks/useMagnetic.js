import { useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";
import { useIsDesktop } from "./useMediaQuery";

/**
 * Magnetic hover effect — the element is gently pulled toward the cursor.
 * Returns a ref, the x/y spring motion values, and pointer handlers.
 */
export function useMagnetic(strength = 0.35) {
  const ref = useRef(null);
  const isDesktop = useIsDesktop();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  const onMouseMove = (e) => {
    if (!isDesktop || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { ref, x: sx, y: sy, onMouseMove, onMouseLeave };
}
