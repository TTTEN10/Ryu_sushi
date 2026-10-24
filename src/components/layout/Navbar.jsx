import { useState, useRef } from 'react';
const logoImg = '/images/ryu-logo.png';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 100) {
        setHidden(currentScrollY > lastScrollYRef.current);
      } else {
        setHidden(false);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href) => {
    setMobileOpen(false);
    // Show the nav immediately when clicking
    setHidden(false);
    const el = document.querySelector(href);
    if (el) {
      // Offset scroll to account for nav height
      const navHeight = 80;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - navHeight,
        behavior: 'smooth'
      });
      window.history.pushState(null, '', href);
    }
  };

  return (
    <nav className={`nav ${lastScrollYRef.current > 50 ? 'nav--scrolled' : ''} ${hidden ? 'nav--hidden' : ''}`} role="navigation" aria-label="Navigation principale">
      <div className="container nav__inner">
        <a href="#home" onClick={(e) => { e.preventDefault(); handleNavClick('#home'); }} aria-label="Ryu Sushi — Accueil">
          <img src={logoImg} alt="Ryu Sushi — Food truck sushi japonais en tournée dans le Morbihan" className="nav__logo" />
        </a>

        <div className="nav__actions">
          <a href="#menu" className="btn btn--secondary btn--sm" onClick={(e) => { e.preventDefault(); handleNavClick('#menu'); }}>
            Menu
          </a>
          <a href="#contact" className="btn btn--primary btn--sm" onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}>
            Commander
          </a>
          <button className="nav__burger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Ouvrir le menu" aria-expanded={mobileOpen}>
            <span style={{ transform: mobileOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
            <span style={{ opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ transform: mobileOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
          </button>
        </div>
      </div>

      <div className={`nav__mobile-menu ${mobileOpen ? 'nav__mobile-menu--open' : ''}`}>
        <a href="#menu" className="btn btn--secondary" onClick={(e) => { e.preventDefault(); handleNavClick('#menu'); }}>
          Menu
        </a>
        <a href="#contact" className="btn btn--primary" onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}>
          Commander
        </a>
      </div>
    </nav>
  );
}
