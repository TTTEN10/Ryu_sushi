import { motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import { WHY_CHOOSE } from "../../constants/content";
import { staggerContainer, scaleIn, inView } from "../../animations/variants";

/** "Why choose us" — headline stats in glass cards. */
export default function WhyChooseUs() {
  return (
    <Section id="why">
      <SectionHeading
        eyebrow="Why Tenenbaum"
        title="The senior guidance you need—without the corporate fluff."
        subtitle="We're former practitioners (psychologists, ergonomists, and executives) who've built and sold our own practices. Now, we help others do the same—faster, with fewer missteps."
      />

      <motion.div
        className="grid grid-4"
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        {WHY_CHOOSE.map((w) => (
          <motion.div key={w.id} variants={scaleIn}>
            <GlassCard className="stat-card" tilt={false} style={{ height: "100%" }}>
              <div className="big">{w.stat}</div>
              <div className="lab">{w.label}</div>
              <p className="desc">{w.description}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
