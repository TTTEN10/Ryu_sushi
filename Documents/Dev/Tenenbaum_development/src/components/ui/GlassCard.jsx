import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { useCursorHover } from "../../context/CursorContext";
import { EASE } from "../../animations/variants";

/**
 * Liquid-glass surface with a lift + subtle 3D tilt toward the cursor and a
 * brighten-on-hover effect. Pass `tilt={false}` for large panels where tilt
 * would feel heavy.
 */
export default function GlassCard({
  children,
  className = "",
  radius = "lg",
  tilt = true,
  as = "div",
  ...rest
}) {
  const ref = useRef(null);
  const isDesktop = useIsDesktop();
  const cursor = useCursorHover();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), {
    stiffness: 150,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), {
    stiffness: 150,
    damping: 18,
  });

  const handleMove = (e) => {
    if (!isDesktop || !tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = (e) => {
    mx.set(0);
    my.set(0);
    cursor.onMouseLeave(e);
  };

  const Tag = motion[as] || motion.div;
  const radiusClass =
    radius === "sm" ? "glass--radius-sm" : radius === "pill" ? "glass--pill" : "glass--radius";

  return (
    <Tag
      ref={ref}
      className={`glass glass--hover ${radiusClass} ${className}`}
      style={
        tilt && isDesktop
          ? { rotateX, rotateY, transformPerspective: 1000 }
          : undefined
      }
      onMouseMove={handleMove}
      onMouseEnter={cursor.onMouseEnter}
      onMouseLeave={handleLeave}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
