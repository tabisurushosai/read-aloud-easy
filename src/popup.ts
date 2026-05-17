import { applyI18nToDoc } from './i18n';

document.addEventListener('DOMContentLoaded', () => {
  // Apply translations
  applyI18nToDoc();

  // Speed control
  const speedInput = document.getElementById('speed') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  if (speedInput && speedValue) {
    speedInput.addEventListener('input', () => {
      speedValue.textContent = speedInput.value;
    });
  }

  // Pitch control
  const pitchInput = document.getElementById('pitch') as HTMLInputElement;
  const pitchValue = document.getElementById('pitch-value');
  if (pitchInput && pitchValue) {
    pitchInput.addEventListener('input', () => {
      pitchValue.textContent = pitchInput.value;
    });
  }

  console.log('Popup script initialized with i18n');
});
