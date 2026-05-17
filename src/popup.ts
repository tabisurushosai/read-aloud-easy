import { applyI18nToDoc } from './i18n';
import { storage } from './storage';
import { TTSMessage, TTSStatus } from './types';

document.addEventListener('DOMContentLoaded', async () => {
  // Apply translations
  applyI18nToDoc();

  // Load settings
  const settings = await storage.getSettings();

  // Speed control
  const speedInput = document.getElementById('speed') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  if (speedInput && speedValue) {
    speedInput.value = (settings.speed || 1.0).toString();
    speedValue.textContent = speedInput.value;
    speedInput.addEventListener('input', () => {
      speedValue.textContent = speedInput.value;
      storage.set('speed', parseFloat(speedInput.value));
    });
  }

  // Pitch control
  const pitchInput = document.getElementById('pitch') as HTMLInputElement;
  const pitchValue = document.getElementById('pitch-value');
  if (pitchInput && pitchValue) {
    pitchInput.value = (settings.pitch || 1.0).toString();
    pitchValue.textContent = pitchInput.value;
    pitchInput.addEventListener('input', () => {
      pitchValue.textContent = pitchInput.value;
      storage.set('pitch', parseFloat(pitchInput.value));
    });
  }

  // TTS Controls
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const stopBtn = document.getElementById('stop');

  playBtn?.addEventListener('click', async () => {
    const statusResponse = await chrome.runtime.sendMessage({ type: 'GET_TTS_STATUS' });
    const status: TTSStatus = statusResponse?.status || 'stopped';

    if (status === 'paused') {
      chrome.runtime.sendMessage({ type: 'TTS_RESUME' });
    } else {
      const text = await getSelectedText();
      if (text) {
        const currentSettings = await storage.getSettings();
        const message: TTSMessage = {
          type: 'TTS_PLAY',
          text,
          options: {
            rate: currentSettings.speed,
            pitch: currentSettings.pitch,
          }
        };
        chrome.runtime.sendMessage(message);
      } else {
        console.log('No text selected');
        // Optional: Provide feedback to user that no text is selected
      }
    }
  });

  pauseBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TTS_PAUSE' });
  });

  stopBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TTS_STOP' });
  });

  console.log('Popup script initialized with i18n and TTS controls');
});

/**
 * Gets the currently selected text from the active tab.
 */
async function getSelectedText(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return '';

    // Cannot execute scripts on restricted pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('https://chrome.google.com/webstore')) {
      return '';
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || '',
    });
    
    return results[0]?.result || '';
  } catch (e) {
    console.error('Failed to get selection:', e);
    return '';
  }
}
