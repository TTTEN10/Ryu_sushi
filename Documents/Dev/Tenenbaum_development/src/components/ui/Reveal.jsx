import { motion } from "framer-motion";
import { blurReveal, fadeUp, fadeLeft, fadeRight, scaleIn, fade, inView } from "../../animations/variants";

const VARIANTS = {
  up: fadeUp,
  left: fadeLeft,
  right: fadeRight,
  blur: blurReveal,
  scale: scaleIn,
  fade,
};

/**
 * Declarative scroll-reveal wrapper. Choose an entrance with `variant`, add an
 * optional `delay`, and pick the rendered element with `as`.
 *
 *   <Reveal variant="blur" delay={0.1}>…</Reveal>
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  as = "div",
  className,
  amount,
  ...rest
}) {
  const MotionTag = motion[as] || motion.div;
  const chosen = VARIANTS[variant] || fadeUp;

  return (
    <MotionTag
      className={className}
      variants={chosen}
      initial="hidden"
      whileInView="show"
      viewport={{ ...inView, amount: amount ?? inView.amount }}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
