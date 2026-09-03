import { useState } from 'react'

export function FormField({
  label,
  error,
  hint,
  children,
  required = false,
}) {
  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export function FormInput({
  label,
  error,
  hint,
  required = false,
  type = 'text',
  ...props
}) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <input type={type} className={`form-input ${error ? 'error' : ''}`} {...props} />
    </FormField>
  )
}

export function FormTextarea({
  label,
  error,
  hint,
  required = false,
  rows = 4,
  ...props
}) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <textarea
        rows={rows}
        className={`form-textarea ${error ? 'error' : ''}`}
        {...props}
      />
    </FormField>
  )
}

export function FormSelect({
  label,
  error,
  hint,
  required = false,
  options = [],
  placeholder,
  ...props
}) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <select className={`form-select ${error ? 'error' : ''}`} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

export function FormCheckbox({ label, error, hint, ...props }) {
  return (
    <div className="form-checkbox-field">
      <label className="form-checkbox">
        <input type="checkbox" className="form-checkbox-input" {...props} />
        <span className="form-checkbox-label">{label}</span>
      </label>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export function FormRadio({ label, error, hint, options = [], ...props }) {
  return (
    <div className="form-radio-field">
      {label && <label className="form-label">{label}</label>}
      <div className="form-radio-group">
        {options.map((option, index) => (
          <label key={index} className="form-radio">
            <input
              type="radio"
              value={option.value}
              className="form-radio-input"
              {...props}
            />
            <span className="form-radio-label">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export default function Form({ children, onSubmit, className = '' }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  return (
    <form onSubmit={handleSubmit} className={`form ${className}`} noValidate>
      {children}
    </form>
  )
}