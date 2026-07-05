import Seo from "../components/layout/Seo";
import { Section } from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import { ArrowRight } from "../icons/Icons";

/** 404 page. */
export default function NotFound() {
  return (
    <div className="simple-page">
      <Seo title="Page not found" path="/404" />
      <Section>
        <div className="notfound">
          <Reveal variant="scale">
            <div className="notfound__code">404</div>
          </Reveal>
          <Reveal variant="up" delay={0.1}>
            <h1 className="t-h3">This page has wandered off.</h1>
          </Reveal>
          <Reveal variant="up" delay={0.18}>
            <p className="t-body" style={{ maxWidth: 440 }}>
              The link may be broken or the page may have moved. Let's get you back on track.
            </p>
          </Reveal>
          <Reveal variant="up" delay={0.26}>
            <Button to="/" size="lg" icon={<ArrowRight />}>
              Back to home
            </Button>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
