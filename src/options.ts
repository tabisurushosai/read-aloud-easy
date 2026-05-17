import { applyI18nToDoc } from './i18n';

document.addEventListener('DOMContentLoaded', () => {
  applyI18nToDoc();

  const saveButton = document.getElementById('save');
  const status = document.getElementById('status');

  if (saveButton && status) {
    saveButton.addEventListener('click', () => {
      // For now, just show a success message as settings storage is not yet implemented
      status.textContent = 'Settings saved (placeholder)';
      status.className = 'status-message success';
      setTimeout(() => {
        status.className = 'status-message';
      }, 2000);
    });
  }
});
