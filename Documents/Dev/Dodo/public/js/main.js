document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCalendlyLinks();
  initHeaderScroll();
  initLazyImages();
  initScrollReveal();
});

function initNavigation() {
  const burger = document.querySelector('.header__burger');
  const nav = document.querySelector('.header__nav');

  if (!burger || !nav) return;

  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('header__nav--open');
    document.body.style.overflow = expanded ? '' : 'hidden';
  });

  nav.querySelectorAll('.header__link').forEach((link) => {
    link.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('header__nav--open');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('header__nav--open')) {
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('header__nav--open');
      document.body.style.overflow = '';
      burger.focus();
    }
  });
}

function initCalendlyLinks() {
  document.querySelectorAll('[data-calendly]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
    });
  });
}

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle('header--scrolled', window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  });
}

function initLazyImages() {
  const images = document.querySelectorAll('img[loading="lazy"]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '200px' }
    );

    images.forEach((img) => observer.observe(img));
  }
}

function initScrollReveal() {
  // Reveal elements on scroll
  const reveals = document.querySelectorAll('.reveal');
  const revealStaggers = document.querySelectorAll('.reveal-stagger');

  if ('IntersectionObserver' in window) {
    // Single element reveal
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
      }
    );

    reveals.forEach((el) => revealObserver.observe(el));

    // Stagger children reveal
    const staggerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-stagger--visible');
            staggerObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
      }
    );

    revealStaggers.forEach((el) => staggerObserver.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    reveals.forEach((el) => el.classList.add('reveal--visible'));
    revealStaggers.forEach((el) => el.classList.add('reveal-stagger--visible'));
  }
}

function setActiveNavLink() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.header__link').forEach((link) => {
    const href = link.getAttribute('href').replace(/\/$/, '') || '/';
    link.classList.toggle('header__link--active', href === currentPath);
  });
}

setActiveNavLink();
