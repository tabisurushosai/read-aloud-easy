import { applyI18nToDoc, t } from './i18n';
import { storage } from './storage';
import {
  PITCH_RANGE,
  SPEED_RANGE,
  SpeedPitchController,
} from './speed-pitch';
import {
  BookmarkController,
  FREE_BOOKMARK_LIMIT,
  PREMIUM_BOOKMARK_LIMIT,
} from './bookmark';
import {
  Bookmark,
  DifficultHighlightMessage,
  FuriganaMessage,
  SpeedPitchState,
  TTSMessage,
  TTSStatus,
} from './types';

document.addEventListener('DOMContentLoaded', async () => {
  applyI18nToDoc();

  const settings = await storage.getSettings();

  const speedInput = document.getElementById('speed') as HTMLInputElement | null;
  const pitchInput = document.getElementById('pitch') as HTMLInputElement | null;
  const speedValue = document.getElementById('speed-value');
  const pitchValue = document.getElementById('pitch-value');
  const presetButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.preset[data-preset]'),
  );
  const resetButton = document.getElementById(
    'reset-speed-pitch',
  ) as HTMLButtonElement | null;

  const speedPitch = new SpeedPitchController({
    speed: settings.speed,
    pitch: settings.pitch,
  });

  if (speedInput) {
    speedInput.min = SPEED_RANGE.min.toString();
    speedInput.max = SPEED_RANGE.max.toString();
    speedInput.step = SPEED_RANGE.step.toString();
  }
  if (pitchInput) {
    pitchInput.min = PITCH_RANGE.min.toString();
    pitchInput.max = PITCH_RANGE.max.toString();
    pitchInput.step = PITCH_RANGE.step.toString();
  }

  const renderSpeedPitch = (state: SpeedPitchState) => {
    const speedStr = state.values.speed.toFixed(1);
    const pitchStr = state.values.pitch.toFixed(1);
    if (speedInput) speedInput.value = speedStr;
    if (pitchInput) pitchInput.value = pitchStr;
    if (speedValue) speedValue.textContent = speedStr;
    if (pitchValue) pitchValue.textContent = pitchStr;
    for (const btn of presetButtons) {
      const active = btn.dataset.preset === state.presetId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  };

  const persistSpeedPitch = async (state: SpeedPitchState) => {
    await storage.setSettings({
      speed: state.values.speed,
      pitch: state.values.pitch,
    });
  };

  renderSpeedPitch(speedPitch.getState());
  // Persist normalized values in case storage held out-of-range data.
  await persistSpeedPitch(speedPitch.getState());

  speedInput?.addEventListener('input', () => {
    const next = speedPitch.set({ speed: parseFloat(speedInput.value) });
    renderSpeedPitch(next);
    void persistSpeedPitch(next);
  });

  pitchInput?.addEventListener('input', () => {
    const next = speedPitch.set({ pitch: parseFloat(pitchInput.value) });
    renderSpeedPitch(next);
    void persistSpeedPitch(next);
  });

  for (const btn of presetButtons) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.preset;
      if (!id) return;
      const next = speedPitch.applyPreset(id);
      if (!next) return;
      renderSpeedPitch(next);
      void persistSpeedPitch(next);
    });
  }

  resetButton?.addEventListener('click', () => {
    const next = speedPitch.reset();
    renderSpeedPitch(next);
    void persistSpeedPitch(next);
  });

  const sendToActiveTab = async (msg: FuriganaMessage | DifficultHighlightMessage) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return;
    const blocked = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'https://chrome.google.com/webstore'];
    if (blocked.some((prefix) => tab.url!.startsWith(prefix))) return;
    await chrome.tabs.sendMessage(tab.id, msg);
  };

  const furiganaInput = document.getElementById('furigana') as HTMLInputElement | null;
  if (furiganaInput) {
    furiganaInput.checked = settings.furigana_enabled ?? false;
    furiganaInput.addEventListener('change', async () => {
      const enabled = furiganaInput.checked;
      await storage.set('furigana_enabled', enabled);
      try {
        const msg: FuriganaMessage = enabled
          ? { type: 'FURIGANA_ENABLE', options: { enabled: true } }
          : { type: 'FURIGANA_DISABLE' };
        await sendToActiveTab(msg);
      } catch (e) {
        console.error('Furigana toggle failed:', e);
      }
    });
  }

  const highlightInput = document.getElementById('highlight') as HTMLInputElement | null;
  if (highlightInput) {
    highlightInput.checked = settings.highlight_enabled ?? false;
    highlightInput.addEventListener('change', async () => {
      const enabled = highlightInput.checked;
      await storage.set('highlight_enabled', enabled);
      try {
        const minSeverity = settings.highlight_min_severity ?? 'medium';
        const msg: DifficultHighlightMessage = enabled
          ? {
              type: 'DIFFICULT_HIGHLIGHT_ENABLE',
              options: { enabled: true, minSeverity },
            }
          : { type: 'DIFFICULT_HIGHLIGHT_DISABLE' };
        await sendToActiveTab(msg);
      } catch (e) {
        console.error('Highlight toggle failed:', e);
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

    const values = speedPitch.getState().values;
    setStatus('playing');
    const res = await send<{ success: boolean; status?: TTSStatus; error?: string }>({
      type: 'TTS_PLAY',
      text,
      options: {
        rate: values.speed,
        pitch: values.pitch,
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

  // ----- Bookmarks -----
  const bookmarkBtn = document.getElementById('bookmark') as HTMLButtonElement | null;
  const bookmarkStatusEl = document.getElementById('bookmark-status');
  const bookmarkListEl = document.getElementById('bookmark-list') as HTMLUListElement | null;
  const bookmarkEmptyEl = document.getElementById('bookmark-empty');

  const bookmarkLimit = settings.premium_unlocked
    ? PREMIUM_BOOKMARK_LIMIT
    : FREE_BOOKMARK_LIMIT;
  const storedBookmarks = await storage.getBookmarks();
  const bookmarkController = new BookmarkController(storedBookmarks, bookmarkLimit);

  const persistBookmarks = async () => {
    await storage.setBookmarks(bookmarkController.getState().bookmarks);
  };

  const setBookmarkMessage = (key: string, isError = false) => {
    if (!bookmarkStatusEl) return;
    bookmarkStatusEl.textContent = t(key);
    bookmarkStatusEl.classList.toggle('error', isError);
    if (!isError) {
      window.setTimeout(() => {
        if (bookmarkStatusEl.textContent === t(key)) {
          bookmarkStatusEl.textContent = '';
        }
      }, 2000);
    }
  };

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const renderBookmark = (bm: Bookmark): HTMLLIElement => {
    const li = document.createElement('li');
    li.className = 'bookmark-item';
    li.dataset.bookmarkId = bm.id;

    const link = document.createElement('a');
    link.className = 'bookmark-link';
    link.href = bm.url;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = bm.title || bm.url;
    link.title = bm.url;

    const meta = document.createElement('div');
    meta.className = 'bookmark-meta';
    meta.textContent = formatTimestamp(bm.createdAt);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'bookmark-remove';
    remove.setAttribute('aria-label', t('popup_bookmark_remove'));
    remove.textContent = '×';
    remove.addEventListener('click', async () => {
      if (!bookmarkController.remove(bm.id)) return;
      await persistBookmarks();
      renderBookmarks();
    });

    const head = document.createElement('div');
    head.className = 'bookmark-head';
    head.appendChild(link);
    head.appendChild(remove);

    li.appendChild(head);
    li.appendChild(meta);

    if (bm.snippet) {
      const snip = document.createElement('p');
      snip.className = 'bookmark-snippet';
      snip.textContent = bm.snippet;
      li.appendChild(snip);
    }

    return li;
  };

  const renderBookmarks = () => {
    if (!bookmarkListEl) return;
    bookmarkListEl.innerHTML = '';
    const items = bookmarkController.list({ sort: 'createdAtDesc', limit: 10 });
    for (const bm of items) bookmarkListEl.appendChild(renderBookmark(bm));
    if (bookmarkEmptyEl) {
      bookmarkEmptyEl.hidden = items.length > 0;
    }
  };

  renderBookmarks();

  bookmarkBtn?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        setBookmarkMessage('popup_bookmark_unavailable', true);
        return;
      }
      const blocked = [
        'chrome://',
        'edge://',
        'about:',
        'chrome-extension://',
        'https://chrome.google.com/webstore',
      ];
      if (blocked.some((prefix) => tab.url!.startsWith(prefix))) {
        setBookmarkMessage('popup_bookmark_unavailable', true);
        return;
      }
      const snippet = (await getSelectedText()).trim();
      bookmarkController.create({
        url: tab.url,
        title: tab.title ?? '',
        snippet,
      });
      await persistBookmarks();
      renderBookmarks();
      setBookmarkMessage('popup_bookmark_added');
    } catch (e) {
      console.error('Bookmark creation failed:', e);
      const reason = e instanceof Error ? e.message : String(e);
      if (reason.includes('limit')) {
        setBookmarkMessage('popup_bookmark_limit', true);
      } else {
        setBookmarkMessage('popup_bookmark_failed', true);
      }
    }
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
