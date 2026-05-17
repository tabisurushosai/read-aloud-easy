import { applyI18nToDoc, t } from './i18n';
import { storage } from './storage';
import { FuriganaMessage, TTSMessage, TTSStatus } from './types';

document.addEventListener('DOMContentLoaded', async () => {
  applyI18nToDoc();

  const settings = await storage.getSettings();

  const speedInput = document.getElementById('speed') as HTMLInputElement | null;
  const speedValue = document.getElementById('speed-value');
  if (speedInput && speedValue) {
    speedInput.value = (settings.speed ?? 1.0).toString();
    speedValue.textContent = speedInput.value;
    speedInput.addEventListener('input', () => {
      speedValue.textContent = speedInput.value;
      storage.set('speed', parseFloat(speedInput.value));
    });
  }

  const pitchInput = document.getElementById('pitch') as HTMLInputElement | null;
  const pitchValue = document.getElementById('pitch-value');
  if (pitchInput && pitchValue) {
    pitchInput.value = (settings.pitch ?? 1.0).toString();
    pitchValue.textContent = pitchInput.value;
    pitchInput.addEventListener('input', () => {
      pitchValue.textContent = pitchInput.value;
      storage.set('pitch', parseFloat(pitchInput.value));
    });
  }

  const furiganaInput = document.getElementById('furigana') as HTMLInputElement | null;
  if (furiganaInput) {
    furiganaInput.checked = settings.furigana_enabled ?? false;
    furiganaInput.addEventListener('change', async () => {
      const enabled = furiganaInput.checked;
      await storage.set('furigana_enabled', enabled);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !tab.url) return;
        const blocked = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'https://chrome.google.com/webstore'];
        if (blocked.some((prefix) => tab.url!.startsWith(prefix))) return;
        const msg: FuriganaMessage = enabled
          ? { type: 'FURIGANA_ENABLE', options: { enabled: true } }
          : { type: 'FURIGANA_DISABLE' };
        await chrome.tabs.sendMessage(tab.id, msg);
      } catch (e) {
        console.error('Furigana toggle failed:', e);
      }
    });
  }

  const statusEl = document.getElementById('status-text');
  const setStatus = (status: TTSStatus) => {
    if (!statusEl) return;
    statusEl.classList.remove('error');
    const key =
      status === 'playing'
        ? 'popup_status_playing'
        : status === 'paused'
          ? 'popup_status_paused'
          : 'popup_status_stopped';
    statusEl.textContent = t(key);
  };
  const setError = (key: string) => {
    if (!statusEl) return;
    statusEl.classList.add('error');
    statusEl.textContent = t(key);
  };

  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const stopBtn = document.getElementById('stop');

  const send = async <T = unknown>(msg: TTSMessage): Promise<T | undefined> => {
    try {
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      console.error('sendMessage failed:', e);
      return undefined;
    }
  };

  const refreshStatus = async () => {
    const res = await send<{ status: TTSStatus }>({ type: 'GET_TTS_STATUS' });
    setStatus(res?.status ?? 'stopped');
  };
  await refreshStatus();

  playBtn?.addEventListener('click', async () => {
    const statusResponse = await send<{ status: TTSStatus }>({ type: 'GET_TTS_STATUS' });
    const status: TTSStatus = statusResponse?.status ?? 'stopped';

    if (status === 'paused') {
      const res = await send<{ status: TTSStatus }>({ type: 'TTS_RESUME' });
      setStatus(res?.status ?? 'playing');
      return;
    }

    const text = (await getSelectedText()).trim();
    if (!text) {
      setError('popup_status_no_selection');
      return;
    }

    const current = await storage.getSettings();
    setStatus('playing');
    const res = await send<{ success: boolean; status?: TTSStatus; error?: string }>({
      type: 'TTS_PLAY',
      text,
      options: {
        rate: current.speed,
        pitch: current.pitch,
      },
    });
    setStatus(res?.status ?? 'stopped');
  });

  pauseBtn?.addEventListener('click', async () => {
    const res = await send<{ status: TTSStatus }>({ type: 'TTS_PAUSE' });
    setStatus(res?.status ?? 'paused');
  });

  stopBtn?.addEventListener('click', async () => {
    const res = await send<{ status: TTSStatus }>({ type: 'TTS_STOP' });
    setStatus(res?.status ?? 'stopped');
  });
});

async function getSelectedText(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return '';

    const blocked = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'https://chrome.google.com/webstore'];
    if (blocked.some((prefix) => tab.url!.startsWith(prefix))) return '';

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? '',
    });
    return results[0]?.result ?? '';
  } catch (e) {
    console.error('Failed to get selection:', e);
    return '';
  }
}
