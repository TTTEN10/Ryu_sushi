import { useMemo } from "react";
import { motion, useTransform } from "framer-motion";
import { useMousePosition } from "../../hooks/useMousePosition";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/**
 * Ambient hero backdrop: large blurred colour circles that float slowly and
 * drift with the mouse (parallax), plus a field of subtle floating particles.
 * Purely decorative — hidden from assistive tech.
 */
export default function AuroraBackground({ particles = 26 }) {
  const isDesktop = useIsDesktop();
  const reduced = usePrefersReducedMotion();
  const { x, y } = useMousePosition();

  // Each blob reacts to the mouse by a different depth factor for parallax.
  const bx1 = useTransform(x, [-0.5, 0.5], [-40, 40]);
  const by1 = useTransform(y, [-0.5, 0.5], [-30, 30]);
  const bx2 = useTransform(x, [-0.5, 0.5], [30, -30]);
  const by2 = useTransform(y, [-0.5, 0.5], [40, -40]);
  const bx3 = useTransform(x, [-0.5, 0.5], [-20, 20]);
  const by3 = useTransform(y, [-0.5, 0.5], [20, -20]);

  const motionEnabled = isDesktop && !reduced;

  const dots = useMemo(
    () =>
      Array.from({ length: particles }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 12,
        duration: 14 + Math.random() * 16,
        opacity: 0.25 + Math.random() * 0.4,
      })),
    [particles]
  );

  return (
    <div className="aurora" aria-hidden="true">
      <motion.span
        className="aurora__blob aurora__blob--primary anim-float"
        style={motionEnabled ? { x: bx1, y: by1 } : undefined}
      />
      <motion.span
        className="aurora__blob aurora__blob--secondary anim-float-alt"
        style={motionEnabled ? { x: bx2, y: by2 } : undefined}
      />
      <motion.span
        className="aurora__blob aurora__blob--forest anim-float"
        style={motionEnabled ? { x: bx3, y: by3 } : undefined}
      />

      {!reduced && (
        <div className="aurora__particles">
          {dots.map((d) => (
            <span
              key={d.id}
              className="aurora__particle"
              style={{
                left: `${d.left}%`,
                width: d.size,
                height: d.size,
                opacity: d.opacity,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.duration}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
