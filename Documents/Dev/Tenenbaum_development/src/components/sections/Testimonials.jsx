import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import { TESTIMONIALS } from "../../constants/content";
import { EASE } from "../../animations/variants";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useCursorHover } from "../../context/CursorContext";

/** Auto-advancing testimonial carousel with manual dot navigation. */
export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();
  const hover = useCursorHover();

  useEffect(() => {
    if (reduced) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, [reduced]);

  const t = TESTIMONIALS[index];

  return (
    <Section id="testimonials">
      <SectionHeading center eyebrow="In Their Words" title="Trusted by independent professionals like you." />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <GlassCard className="quote-card" tilt={false}>
          <div className="mark" aria-hidden="true">
            &ldquo;
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <blockquote>{t.quote}</blockquote>
              <div className="who">
                <div className="name">{t.name}</div>
                <div className="role">{t.role}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        <div className="center gap-2" style={{ marginTop: 24 }}>
          {TESTIMONIALS.map((item, i) => (
            <button
              key={item.id}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              {...hover}
              style={{
                width: i === index ? 28 : 10,
                height: 10,
                borderRadius: 999,
                transition: "all 300ms cubic-bezier(.22,.61,.36,1)",
                background: i === index ? "var(--primary)" : "rgba(36,25,36,0.18)",
              }}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
