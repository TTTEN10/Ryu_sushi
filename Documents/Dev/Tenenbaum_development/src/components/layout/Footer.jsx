import { Link } from "react-router-dom";
import Reveal from "../ui/Reveal";
import { SITE, NAV_LINKS } from "../../constants/site";
import { useCursorHover } from "../../context/CursorContext";
import { ArrowUpRight } from "../../icons/Icons";

/** Minimal footer with oversized wordmark, links, contact + legal. */
export default function Footer() {
  const hover = useCursorHover();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <Reveal variant="blur">
          <p className="footer__cta t-h2 text-balance">
            Let's build what's next, together.
          </p>
        </Reveal>

        <div className="footer__grid">
          <div className="footer__col">
            <span className="t-eyebrow">Navigate</span>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} {...hover}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <span className="t-eyebrow">Connect</span>
            <ul>
              {SITE.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" {...hover}>
                    {s.label}
                    <ArrowUpRight size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <span className="t-eyebrow">Reach us</span>
            <address className="footer__address">
              {SITE.address.line1}
              <br />
              {SITE.address.city}, {SITE.address.region} {SITE.address.zip}
              <br />
              <a href={`mailto:${SITE.email}`} {...hover}>
                {SITE.email}
              </a>
            </address>
          </div>
        </div>

        <div className="footer__mark" aria-hidden="true">
          {SITE.name}
        </div>

        <div className="footer__bottom">
          <span>
            © {year} {SITE.legalName}. All rights reserved.
          </span>
          <nav className="footer__legal" aria-label="Legal">
            <Link to="/privacy" {...hover}>
              Privacy
            </Link>
            <Link to="/terms" {...hover}>
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
