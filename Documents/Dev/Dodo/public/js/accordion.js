document.addEventListener('DOMContentLoaded', () => {
  const accordion = document.querySelector('.accordion');
  if (!accordion) return;

  const triggers = accordion.querySelectorAll('.accordion__trigger');

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));

      triggers.forEach((other) => {
        if (other !== trigger) {
          other.setAttribute('aria-expanded', 'false');
          const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          if (otherPanel) otherPanel.setAttribute('aria-hidden', 'true');
        }
      });

      trigger.setAttribute('aria-expanded', String(!expanded));
      if (panel) panel.setAttribute('aria-hidden', String(expanded));
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  });
});
