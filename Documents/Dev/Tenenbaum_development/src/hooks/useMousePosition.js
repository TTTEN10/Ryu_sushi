import { useEffect } from "react";
import { useMotionValue, useSpring } from "framer-motion";

/**
 * Returns smoothed, normalised pointer motion values in the range [-0.5, 0.5]
 * for both axes. Used to let hero layers respond subtly to mouse movement.
 * Springs keep the movement gentle and organic.
 */
export function useMousePosition(stiffness = 60, damping = 20) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness, damping });
  const sy = useSpring(y, { stiffness, damping });

  useEffect(() => {
    const onMove = (e) => {
      x.set(e.clientX / window.innerWidth - 0.5);
      y.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [x, y]);

  return { x: sx, y: sy };
}
