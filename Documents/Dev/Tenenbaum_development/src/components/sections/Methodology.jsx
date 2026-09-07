import { motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import { METHODOLOGY } from "../../constants/content";
import { staggerContainer, fadeLeft, inView } from "../../animations/variants";

/** Sequential methodology steps, revealed as they scroll in. */
export default function Methodology() {
  return (
    <Section id="methodology">
      <SectionHeading
        eyebrow="How We Work"
        title="A method built for your momentum."
        subtitle="Four phases to take you from overwhelmed to unstoppable:"
      />

      <motion.div
        className="method"
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        {METHODOLOGY.map((m) => (
          <motion.div key={m.id} variants={fadeLeft}>
            <GlassCard className="method-step" tilt={false}>
              <div className="idx">{m.icon}</div>
              <div>
                <h3 className="card-title">{m.title}</h3>
                <p className="card-body">{m.description}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
