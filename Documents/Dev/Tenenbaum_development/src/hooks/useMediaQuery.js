import { useEffect, useState } from "react";

/** Reactive media query hook. Returns true when the query matches. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Convenience: true on pointer-fine desktop devices (for cursor / parallax). */
export function useIsDesktop() {
  return useMediaQuery("(min-width: 1025px) and (pointer: fine)");
}
