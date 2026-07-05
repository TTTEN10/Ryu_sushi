import Reveal from "./Reveal";

/** Semantic section shell with consistent container + vertical rhythm. */
export function Section({ id, children, className = "", tight = false, ...rest }) {
  return (
    <section
      id={id}
      className={`section ${tight ? "section--tight" : ""} ${className}`}
      {...rest}
    >
      <div className="container">{children}</div>
    </section>
  );
}

/** Standard eyebrow + title + subtitle block used at the top of sections. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = false,
  className = "",
}) {
  return (
    <div className={`section__head ${center ? "section__head--center" : ""} ${className}`}>
      {eyebrow && (
        <Reveal variant="up">
          <span className="t-eyebrow">{eyebrow}</span>
        </Reveal>
      )}
      {title && (
        <Reveal variant="blur" delay={0.05}>
          <h2 className="t-h2 text-balance" style={{ marginTop: 12 }}>
            {title}
          </h2>
        </Reveal>
      )}
      {subtitle && (
        <Reveal variant="up" delay={0.12}>
          <p className="t-subtitle text-pretty" style={{ marginTop: 16 }}>
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
