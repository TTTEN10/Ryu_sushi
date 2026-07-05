import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Section } from "../ui/Section";
import GlassCard from "../ui/GlassCard";
import Button from "../ui/Button";
import { subscribeNewsletter } from "../../services/api";
import { isEmail } from "../../utils/validation";
import { EASE } from "../../animations/variants";
import { Check, Spinner } from "../../icons/Icons";

/** Single-input newsletter capture with confirmation animation. */
export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      await subscribeNewsletter(email);
      setStatus("done");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  };

  return (
    <Section id="newsletter">
      <GlassCard className="newsletter" tilt={false}>
        <span className="t-eyebrow">Perspectives</span>
        <h2 className="t-h2 text-balance" style={{ marginTop: 12 }}>
          Ideas worth the inbox.
        </h2>
        <p className="t-subtitle" style={{ marginTop: 14, maxWidth: 560, marginInline: "auto" }}>
          Occasional, substantive notes on strategy and leadership. No noise.
        </p>

        <AnimatePresence mode="wait">
          {status === "done" ? (
            <motion.div
              key="done"
              className="center gap-2"
              style={{ marginTop: 28, color: "var(--primary)", fontWeight: 600 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 16 }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(4,114,77,0.14)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Check size={18} />
              </motion.span>
              You're on the list. Watch your inbox.
            </motion.div>
          ) : (
            <motion.form
              key="form"
              className="newsletter__form"
              onSubmit={onSubmit}
              noValidate
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <label htmlFor="nl-email" className="sr-only">
                Email address
              </label>
              <input
                id="nl-email"
                type="email"
                className="newsletter__input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
              />
              <Button type="submit" disabled={status === "loading"} magnetic={false}>
                {status === "loading" ? <Spinner /> : "Subscribe"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        {error && (
          <p className="form-note" style={{ color: "#c0492f" }}>
            {error}
          </p>
        )}
        {status !== "done" && (
          <p className="form-note">We respect your privacy. Unsubscribe anytime.</p>
        )}
      </GlassCard>
    </Section>
  );
}
