import { motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import { SERVICES } from "../../constants/content";
import { staggerContainer, fadeUp, inView } from "../../animations/variants";
import { Check } from "../../icons/Icons";

/** Grid of Liquid-Glass service cards. */
export default function Services() {
  return (
    <Section id="services">
      <SectionHeading
        eyebrow="What We Do"
        title="Four pillars. One focus: Your success."
        subtitle="Every engagement is tailored design for you : achieve clarity, skills and growth."
      />

      <motion.div
        className="grid grid-4"
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        {SERVICES.map((s) => (
          <motion.div key={s.id} variants={fadeUp}>
            <GlassCard className="card-pad" style={{ height: "100%" }}>
              <span className="card-num">{s.id.slice(0, 2).toUpperCase()}</span>
              <h3 className="card-title">{s.title}</h3>
              <p className="card-body">{s.description}</p>
              <ul className="card-points">
                {s.points.map((p) => (
                  <li key={p}>
                    <Check size={16} />
                    {p}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
