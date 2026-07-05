import { motion } from "framer-motion";
import Button from "../ui/Button";
import AuroraBackground from "../ui/AuroraBackground";
import { scrollToHash } from "../../utils/scroll";
import { EASE, maskChild, staggerContainer } from "../../animations/variants";
import { ArrowRight } from "../../icons/Icons";
import { HERO_STATS } from "../../constants/content";

const TITLE_LINES = ["Clarity. Momentum. Impact."];

/** Full-viewport hero: masked headline, glass CTA, aurora backdrop, stats. */
export default function Hero() {
  return (
    <header className="hero" id="top">
      <AuroraBackground />

      <div className="container">
        <div className="hero__inner">
          <motion.span
            className="t-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Refuse to choose either excellence or fulfillment
          </motion.span>

          <motion.h1
            className="hero__title t-hero"
            variants={staggerContainer(0.12, 0.2)}
            initial="hidden"
            animate="show"
          >
            {TITLE_LINES.map((line, i) => (
              <span className="line" key={i}>
                <motion.span style={{ display: "block", overflow: "visible" }} variants={maskChild}>
                  <span className="text-gradient">{line}</span>
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            className="hero__subtitle t-subtitle text-pretty"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: EASE }}
          >
            We lead ambitious individuals sharpen their strategy, scale their skills and balance their personal life.
          </motion.p>

          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease: EASE }}
          >
            <Button to="/contact" size="lg" icon={<ArrowRight />}>
              Book a consultation
            </Button>
          </motion.div>

          <motion.div
            className="hero__stats"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.12, 1)}
          >
            {HERO_STATS.map((item) => (
              <motion.div
                key={item.label}
                className="hero__stat"
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <div className="n">{item.stat}</div>
                <div className="l">{item.label}</div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>

      <motion.button
        className="hero__scroll"
        onClick={() => scrollToHash("#services")}
        aria-label="Scroll to content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
      >
        <span className="hero__scroll-track">
          <motion.span
            className="hero__scroll-dot"
            animate={{ y: [0, 14, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
        Scroll
      </motion.button>
    </header>
  );
}
