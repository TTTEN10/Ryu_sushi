import Seo from "../components/layout/Seo";
import { Section } from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import { SITE } from "../constants/site";

/** Terms of service — concise, representative boilerplate. */
export default function Terms() {
  return (
    <div className="simple-page">
      <Seo title="Terms of Service" path="/terms" />
      <Section>
        <Reveal variant="blur">
          <span className="t-eyebrow">Legal</span>
          <h1 className="t-h2" style={{ marginTop: 12 }}>
            Terms of Service
          </h1>
        </Reveal>
        <Reveal variant="up" delay={0.1} className="legal-prose" style={{ marginTop: 32 }}>
          <p>
            These terms govern your use of the {SITE.legalName} website. By using the site you agree
            to them.
          </p>
          <h2>Use of the site</h2>
          <p>
            The content on this site is provided for general information about our services and does
            not constitute professional advice. Any engagement is governed by a separate written
            agreement.
          </p>
          <h2>Intellectual property</h2>
          <p>
            All content, branding and design on this site are the property of {SITE.legalName} and
            may not be reproduced without permission.
          </p>
          <h2>Liability</h2>
          <p>
            We take care to keep information accurate and the site available, but we provide it "as
            is" without warranties of any kind to the extent permitted by law.
          </p>
          <h2>Contact</h2>
          <p>
            Questions about these terms? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>
        </Reveal>
      </Section>
    </div>
  );
}
