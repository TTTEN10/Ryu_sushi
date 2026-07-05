/**
 * Smoothly scroll to an element (by hash) using Lenis when available, falling
 * back to native scrolling. Accounts for the floating navigation height.
 */
export function scrollToHash(hash, offset = -96) {
  if (!hash) return;
  const target = hash === "#top" ? document.body : document.querySelector(hash);
  if (!target) return;

  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(hash === "#top" ? 0 : target, { offset, duration: 1.6 });
  } else {
    const top =
      hash === "#top"
        ? 0
        : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
}
