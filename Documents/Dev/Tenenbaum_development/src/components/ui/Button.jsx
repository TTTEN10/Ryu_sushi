import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useMagnetic } from "../../hooks/useMagnetic";
import { useCursorHover } from "../../context/CursorContext";
import { EASE } from "../../animations/variants";

/**
 * Polymorphic capsule button: renders a router `<Link>`, an anchor, or a
 * `<button>` depending on props. Glass / solid / outline variants, magnetic
 * cursor attraction, and iOS-style press feedback baked in.
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = "solid",
    size,
    to,
    href,
    magnetic = true,
    className = "",
    icon,
    ...rest
  },
  _ref
) {
  const mag = useMagnetic(magnetic ? 0.3 : 0);
  const cursor = useCursorHover();

  const cls = [
    "btn",
    variant === "glass" && "btn--glass",
    variant === "outline" && "btn--outline",
    size === "lg" && "btn--lg",
    size === "sm" && "btn--sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span>{children}</span>
      {icon && <span className="btn__icon">{icon}</span>}
    </>
  );

  const motionProps = {
    ref: mag.ref,
    className: cls,
    style: { x: mag.x, y: mag.y },
    onMouseMove: mag.onMouseMove,
    onMouseLeave: (e) => {
      mag.onMouseLeave(e);
      cursor.onMouseLeave(e);
    },
    onMouseEnter: cursor.onMouseEnter,
    whileTap: { scale: 0.97 },
    transition: { duration: 0.3, ease: EASE },
    ...rest,
  };

  if (to) {
    return (
      <motion.div style={{ x: mag.x, y: mag.y, display: "inline-flex" }}>
        <Link
          to={to}
          className={cls}
          ref={mag.ref}
          onMouseMove={mag.onMouseMove}
          onMouseLeave={(e) => {
            mag.onMouseLeave(e);
            cursor.onMouseLeave(e);
          }}
          onMouseEnter={cursor.onMouseEnter}
          {...rest}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  if (href) {
    return (
      <motion.a href={href} {...motionProps}>
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button {...motionProps}>{content}</motion.button>
  );
});

export default Button;
