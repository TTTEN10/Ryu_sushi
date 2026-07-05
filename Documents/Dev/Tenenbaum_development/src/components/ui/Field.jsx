import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../../animations/variants";

/**
 * Glass form controls with floating labels, inline validation and full a11y
 * wiring (label association + aria-invalid + aria-describedby).
 */

function ErrorText({ id, error }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.span
          id={id}
          className="field__error"
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {error}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  required,
  autoComplete,
}) {
  const id = useId();
  const errId = `${id}-err`;
  const filled = String(value ?? "").length > 0;

  return (
    <div className={`field ${error ? "field--error" : ""} ${filled ? "field--filled" : ""}`}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder=" "
        className="field__input glass glass--radius-sm"
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        aria-required={required}
      />
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function TextArea({ label, name, value, onChange, onBlur, error, required, rows = 5 }) {
  const id = useId();
  const errId = `${id}-err`;
  const filled = String(value ?? "").length > 0;

  return (
    <div className={`field ${error ? "field--error" : ""} ${filled ? "field--filled" : ""}`}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder=" "
        className="field__input field__textarea glass glass--radius-sm"
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        aria-required={required}
      />
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function SelectField({ label, name, value, onChange, onBlur, error, options, required }) {
  const id = useId();
  const errId = `${id}-err`;
  const filled = String(value ?? "").length > 0;

  return (
    <div className={`field field--select ${error ? "field--error" : ""} ${filled ? "field--filled" : ""}`}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className="field__input glass glass--radius-sm"
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        aria-required={required}
      >
        <option value="" disabled hidden />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function Checkbox({ label, name, checked, onChange, error }) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={`checkbox ${error ? "field--error" : ""}`}>
      <label htmlFor={id} className="checkbox__label">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="checkbox__input"
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
        />
        <span className="checkbox__box" aria-hidden="true" />
        <span>{label}</span>
      </label>
      <ErrorText id={errId} error={error} />
    </div>
  );
}
