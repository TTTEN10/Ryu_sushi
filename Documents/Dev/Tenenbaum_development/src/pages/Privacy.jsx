import Seo from "../components/layout/Seo";
import { Section } from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import { SITE } from "../constants/site";

/** Privacy policy — concise, representative boilerplate. */
export default function Privacy() {
  return (
    <div className="simple-page">
      <Seo title="Privacy Policy" path="/privacy" />
      <Section>
        <Reveal variant="blur">
          <span className="t-eyebrow">Legal</span>
          <h1 className="t-h2" style={{ marginTop: 12 }}>
            Privacy Policy
          </h1>
        </Reveal>
        <Reveal variant="up" delay={0.1} className="legal-prose" style={{ marginTop: 32 }}>
          <p>
            {SITE.legalName} ("we", "us") respects your privacy. This policy explains what
            information we collect and how we use it.
          </p>
          <h2>Information we collect</h2>
          <p>
            When you contact us or subscribe to our newsletter we collect the details you provide —
            such as your name, company, email address and message. We also collect
            limited, anonymised analytics about how the site is used.
          </p>
          <h2>How we use it</h2>
          <p>
            We use your information solely to respond to your enquiry, deliver requested content and
            improve our services. We never sell your data.
          </p>
          <h2>Data retention</h2>
          <p>
            We keep enquiry data only as long as necessary to serve you and to meet our legal
            obligations, after which it is securely deleted.
          </p>
          <h2>Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by emailing <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </Reveal>
      </Section>
    </div>
  );
}
