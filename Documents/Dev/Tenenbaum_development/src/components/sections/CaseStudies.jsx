import { motion } from "framer-motion";
import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import Button from "../ui/Button";
import { CASE_STUDIES } from "../../constants/content";
import { staggerContainer, fadeUp, inView } from "../../animations/variants";
import { ArrowUpRight } from "../../icons/Icons";

/** Selected client outcomes, presented as glass cards. */
export default function CaseStudies() {
  return (
    <Section id="results">
      <SectionHeading
        eyebrow="Selected Client Outcomes"
        title="Real results. Real people."
        subtitle="See what happens when independent professionals get strategic about their practice."
      />

      <motion.div
        className="grid grid-3"
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="show"
        viewport={inView}
      >
        {CASE_STUDIES.map((c) => (
          <motion.div key={c.id} variants={fadeUp}>
            <GlassCard className="case-card">
              <div>
                <div className="name">{c.name}</div>
                <div className="sector">{c.role}</div>
              </div>
              <div>
                <div className="challenge-label">Challenge</div>
                <p className="challenge">{c.challenge}</p>
                <div className="outcome-label">Outcome</div>
                <p className="outcome">{c.outcome}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <div style={{ marginTop: 40 }}>
        <Button to="/contact" variant="outline" icon={<ArrowUpRight size={16} />}>
          Discuss your challenge
        </Button>
      </div>
    </Section>
  );
}
