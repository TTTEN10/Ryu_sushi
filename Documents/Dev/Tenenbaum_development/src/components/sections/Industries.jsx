import { Section, SectionHeading } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import { Check } from "../../icons/Icons";

/** Who we serve section — defining the ideal independent professional client. */
export default function Industries() {
  return (
    <Section id="who-we-serve">
      <SectionHeading
        center
        eyebrow="Who We Serve"
        title="Independent professionals who:"
      />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <GlassCard className="who-we-serve-card" tilt={false}>
          <ul className="criteria-list">
            <li>
              <Check size={24} className="check-icon" />
              <span>Earn €100K–€500K+ annually (or aim to)</span>
            </li>
            <li>
              <Check size={24} className="check-icon" />
              <span>Work in psychology, ergonomics, coaching, or consulting</span>
            </li>
            <li>
              <Check size={24} className="check-icon" />
              <span>Are solo or small-team practitioners (no agencies or corporates)</span>
            </li>
            <li>
              <Check size={24} className="check-icon" />
              <span>Want to scale without sacrificing autonomy</span>
            </li>
          </ul>
        </GlassCard>
      </div>
    </Section>
  );
}
