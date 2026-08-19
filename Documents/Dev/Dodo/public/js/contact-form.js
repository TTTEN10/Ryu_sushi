document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const successEl = document.getElementById('form-success');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm(form)) return;

    form.style.display = 'none';
    if (successEl) {
      successEl.classList.add('form__success--visible');
      successEl.setAttribute('tabindex', '-1');
      successEl.focus();
    }
  });

  form.querySelectorAll('.form__input, .form__textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.classList.contains('form__input--error')) {
        validateField(field);
      }
    });
  });
});

function validateForm(form) {
  let valid = true;
  const fields = form.querySelectorAll('[required]');

  fields.forEach((field) => {
    if (!validateField(field)) valid = false;
  });

  return valid;
}

function validateField(field) {
  const errorEl = document.getElementById(`${field.id}-error`);
  let message = '';

  if (field.validity.valueMissing) {
    message = 'Ce champ est obligatoire.';
  } else if (field.type === 'email' && field.validity.typeMismatch) {
    message = 'Veuillez entrer une adresse e-mail valide.';
  } else if (field.type === 'tel' && field.value && !/^[\d\s+().-]{8,}$/.test(field.value)) {
    message = 'Veuillez entrer un numéro de téléphone valide.';
  }

  field.classList.toggle('form__input--error', !!message);
  field.setAttribute('aria-invalid', String(!!message));

  if (errorEl) errorEl.textContent = message;

  return !message;
}
