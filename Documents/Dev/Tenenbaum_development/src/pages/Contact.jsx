import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Seo from "../components/layout/Seo";
import { Section } from "../components/ui/Section";
import Reveal from "../components/ui/Reveal";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import { Field, TextArea, SelectField, Checkbox } from "../components/ui/Field";
import { validateContact } from "../utils/validation";
import { submitContact } from "../services/api";
import { CONTACT_SUBJECTS } from "../constants/content";
import { SITE } from "../constants/site";
import { EASE } from "../animations/variants";
import { Check, Spinner, MailIcon, PinIcon, ArrowRight } from "../icons/Icons";

const EMPTY = {
  name: "",
  company: "",
  email: "",
  subject: "",
  message: "",
  consent: false,
};

/** Dedicated contact page: glass form with validation + success animation. */
export default function Contact() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");

  const setField = (name) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [name]: val }));
    if (touched[name]) {
      setErrors(validateContact({ ...values, [name]: val }));
    }
  };

  const onBlur = (name) => () => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validateContact(values));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    setTouched(
      Object.keys(EMPTY).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    );
    if (Object.keys(found).length) {
      // Focus the first invalid field for keyboard users.
      const first = document.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setStatus("loading");
    setServerError("");
    try {
      await submitContact(values);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE.legalName}`,
    url: `${SITE.url}/contact`,
  };

  return (
    <div className="simple-page">
      <Seo
        title="Contact"
        description={`Speak with ${SITE.legalName}. Book a consultation and put a senior team on your most important decision.`}
        path="/contact"
        jsonLd={jsonLd}
      />

      <Section>
        <div className="section__head" style={{ maxWidth: 720 }}>
          <Reveal variant="up">
            <span className="t-eyebrow">Contact</span>
          </Reveal>
          <Reveal variant="blur" delay={0.05}>
            <h1 className="t-h2 text-balance" style={{ marginTop: 12 }}>
              Let's talk about the decision that matters most.
            </h1>
          </Reveal>
          <Reveal variant="up" delay={0.12}>
            <p className="t-subtitle text-pretty" style={{ marginTop: 16 }}>
              Tell us a little about your situation and we'll be in touch within one business day.
            </p>
          </Reveal>
        </div>

        <div className="contact-grid">
          {/* Left: contact details */}
          <Reveal variant="right">
            <GlassCard className="contact-info" tilt={false}>
              <div>
                <h2 className="card-title">Reach us directly</h2>
                <p className="card-body">
                  Prefer to skip the form? Our team reads every message personally.
                </p>
              </div>
              <div className="contact-info__item">
                <MailIcon />
                <div>
                  <div style={{ fontWeight: 600 }}>Email</div>
                  <a href={`mailto:${SITE.email}`} className="text-soft">
                    {SITE.email}
                  </a>
                </div>
              </div>
              <div className="contact-info__item">
                <PinIcon />
                <div>
                  <div style={{ fontWeight: 600 }}>Office</div>
                  <span className="text-soft">
                    {SITE.address.line1}
                    <br />
                    {SITE.address.city}, {SITE.address.region} {SITE.address.zip}
                  </span>
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* Right: the form / success state */}
          <Reveal variant="left">
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <GlassCard className="success" tilt={false}>
                    <motion.div
                      className="success__check"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 15 }}
                    >
                      <Check size={38} />
                    </motion.div>
                    <h2 className="t-h3">Message received.</h2>
                    <p className="card-body" style={{ marginTop: 10 }}>
                      Thank you, {values.name.split(" ")[0] || "there"}. A senior member of our
                      team will reply within one business day.
                    </p>
                    <div className="center" style={{ marginTop: 24 }}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setValues(EMPTY);
                          setTouched({});
                          setErrors({});
                          setStatus("idle");
                        }}
                      >
                        Send another message
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  className="contact-form glass glass--radius"
                  onSubmit={onSubmit}
                  noValidate
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {/* Honeypot — hidden from humans, catches bots. */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", opacity: 0 }}
                    value={values.website || ""}
                    onChange={setField("website")}
                  />

                  <div className="form-row">
                    <Field
                      label="Full name"
                      name="name"
                      required
                      autoComplete="name"
                      value={values.name}
                      onChange={setField("name")}
                      onBlur={onBlur("name")}
                      error={touched.name && errors.name}
                    />
                    <Field
                      label="Company"
                      name="company"
                      autoComplete="organization"
                      value={values.company}
                      onChange={setField("company")}
                      onBlur={onBlur("company")}
                    />
                  </div>

                  <div className="form-row">
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={values.email}
                      onChange={setField("email")}
                      onBlur={onBlur("email")}
                      error={touched.email && errors.email}
                    />
                  </div>

                  <SelectField
                    label="Subject"
                    name="subject"
                    required
                    options={CONTACT_SUBJECTS}
                    value={values.subject}
                    onChange={setField("subject")}
                    onBlur={onBlur("subject")}
                    error={touched.subject && errors.subject}
                  />

                  <TextArea
                    label="How can we help?"
                    name="message"
                    required
                    value={values.message}
                    onChange={setField("message")}
                    onBlur={onBlur("message")}
                    error={touched.message && errors.message}
                  />

                  <Checkbox
                    label="I agree to the processing of my details in line with the privacy policy."
                    name="consent"
                    checked={values.consent}
                    onChange={setField("consent")}
                    error={touched.consent && errors.consent}
                  />

                  {serverError && (
                    <p className="field__error" role="alert">
                      {serverError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="btn--full"
                    magnetic={false}
                    disabled={status === "loading"}
                    icon={status === "loading" ? <Spinner /> : <ArrowRight />}
                  >
                    {status === "loading" ? "Sending" : "Send message"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
