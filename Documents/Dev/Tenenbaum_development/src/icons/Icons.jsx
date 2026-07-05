/**
 * Inline SVG icon set. Icons inherit `currentColor` and accept a `size` prop.
 * Kept as one tree-shakeable module so we ship no icon-font weight.
 */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
});

export const ArrowRight = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

export const Menu = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const Close = ({ size = 22 }) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </svg>
);

export const Check = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Plus = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const Minus = ({ size = 20 }) => (
  <svg {...base(size)}>
    <path d="M5 12h14" />
  </svg>
);

export const Spinner = ({ size = 18 }) => (
  <svg {...base(size)} style={{ animation: "spin-slow 0.8s linear infinite" }}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const MailIcon = ({ size = 18 }) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const PhoneIcon = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M4 5c0-1 1-2 2-2h2l2 5-2 1c1 2 3 4 5 5l1-2 5 2v2c0 1-1 2-2 2A16 16 0 0 1 4 5Z" />
  </svg>
);

export const PinIcon = ({ size = 18 }) => (
  <svg {...base(size)}>
    <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
