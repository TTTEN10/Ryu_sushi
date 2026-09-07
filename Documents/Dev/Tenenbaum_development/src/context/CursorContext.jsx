import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Lightweight global cursor state. Interactive elements call `setVariant` to
 * expand / label the custom cursor, giving the whole site a cohesive pointer.
 */
const CursorContext = createContext(null);

export function CursorProvider({ children }) {
  const [variant, setVariant] = useState("default");

  const onHover = useCallback(() => setVariant("hover"), []);
  const onLeave = useCallback(() => setVariant("default"), []);

  const value = useMemo(
    () => ({ variant, setVariant, onHover, onLeave }),
    [variant, onHover, onLeave]
  );

  return <CursorContext.Provider value={value}>{children}</CursorContext.Provider>;
}

export function useCursor() {
  const ctx = useContext(CursorContext);
  if (!ctx) {
    // Safe no-op fallback so components work outside the provider (e.g. tests).
    return {
      variant: "default",
      setVariant: () => {},
      onHover: () => {},
      onLeave: () => {},
    };
  }
  return ctx;
}

/** Spread onto any element to make the cursor expand while hovering it. */
export function useCursorHover() {
  const { onHover, onLeave } = useCursor();
  return { onMouseEnter: onHover, onMouseLeave: onLeave };
}
