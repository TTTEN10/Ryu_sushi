/**
 * Central site metadata. Keeping brand + SEO defaults in one place so pages
 * and the backend can share a single source of truth.
 */
export const SITE = {
  name: "Tenenbaum Development",
  legalName: "Tenenbaum Development",
  tagline: "Clarity. Momentum. Impact.",
  description:
    "Tenenbaum Development helps high-earning independent professionals—psychologists, ergonomists, consultants, and coaches—sharpen their strategy, scale their influence, and design a career that aligns with their ambitions and values.",
  url: "https://tenenbaum.example.com",
  email: "hello@tenenbaum.example.com",
  address: {
    line1: "410 Park Avenue, Suite 1900",
    city: "New York",
    region: "NY",
    zip: "10022",
    country: "United States",
  },
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "X", href: "https://x.com" },
    { label: "Instagram", href: "https://www.instagram.com" },
  ],
};

export const NAV_LINKS = [
  { label: "Home", to: "/", hash: "#top" },
  { label: "Services", to: "/", hash: "#services" },
  { label: "About", to: "/", hash: "#why" },
  { label: "Results", to: "/", hash: "#results" },
  { label: "Contact", to: "/contact", hash: null },
];
