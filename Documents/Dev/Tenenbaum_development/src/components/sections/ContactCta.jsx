import { Section } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import Button from "../ui/Button";
import Reveal from "../ui/Reveal";
import { ArrowRight } from "../../icons/Icons";

/** Closing call-to-action banner that leads to the contact page. */
export default function ContactCta() {
  return (
    <Section id="contact" tight>
      <GlassCard className="cta-banner" tilt={false}>
        <Reveal variant="up">
          <span className="t-eyebrow">Start a Conversation</span>
        </Reveal>
        <Reveal variant="blur" delay={0.05}>
          <h2 className="t-h2 text-balance" style={{ marginTop: 12, maxWidth: 720, marginInline: "auto" }}>
            The best time to redesign your career was last year. The next best time is now.
          </h2>
        </Reveal>
        <Reveal variant="up" delay={0.15}>
          <div className="center" style={{ marginTop: 32 }}>
            <Button to="/contact" size="lg" icon={<ArrowRight />}>
              Book a consultation
            </Button>
          </div>
        </Reveal>
      </GlassCard>
    </Section>
  );
}
