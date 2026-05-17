import { TTSManager } from './tts';
import { TTSMessage } from './types';
import { openUpgradeFlow, redeemLicenseCode } from './upgrade';

const ttsManager = new TTSManager();

type PremiumMessage =
  | { type: 'PREMIUM_OPEN_UPGRADE' }
  | { type: 'PREMIUM_REDEEM_CODE'; code: string };

function isPremiumMessage(m: unknown): m is PremiumMessage {
  if (!m || typeof m !== 'object') return false;
  const t = (m as { type?: unknown }).type;
  return t === 'PREMIUM_OPEN_UPGRADE' || t === 'PREMIUM_REDEEM_CODE';
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
      furigana_enabled: false,
      trial_start_ts: Date.now(),
      premium_unlocked: false,
    }, () => {
      console.log('Default settings initialized.');
    });
  }
});

chrome.runtime.onMessage.addListener((message: TTSMessage | PremiumMessage, _sender, sendResponse) => {
  if (isPremiumMessage(message)) {
    if (message.type === 'PREMIUM_OPEN_UPGRADE') {
      openUpgradeFlow()
        .then((result) => sendResponse(result))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message ?? String(error) }),
        );
      return true;
    }
    if (message.type === 'PREMIUM_REDEEM_CODE') {
      redeemLicenseCode(message.code ?? '')
        .then((result) => sendResponse(result))
        .catch((error) =>
          sendResponse({ ok: false, error: error?.message ?? String(error) }),
        );
      return true;
    }
  }
  const ttsMessage = message as TTSMessage;
  switch (ttsMessage.type) {
    case 'TTS_PLAY':
      if (!ttsMessage.text) {
        sendResponse({ success: false, error: 'No text provided' });
        return false;
      }
      ttsManager.speak(ttsMessage.text, ttsMessage.options)
        .then(() => sendResponse({ success: true, status: ttsManager.getStatus() }))
        .catch((error) => sendResponse({ success: false, error: error?.message ?? String(error) }));
      return true;
    case 'TTS_PAUSE':
      ttsManager.pause().then(() =>
        sendResponse({ success: true, status: ttsManager.getStatus() })
      );
      return true;
    case 'TTS_RESUME':
      ttsManager.resume().then(() =>
        sendResponse({ success: true, status: ttsManager.getStatus() })
      );
      return true;
    case 'TTS_STOP':
      ttsManager.stop().then(() =>
        sendResponse({ success: true, status: ttsManager.getStatus() })
      );
      return true;
    case 'GET_TTS_STATUS':
      sendResponse({ status: ttsManager.getStatus() });
      return false;
  }
  return false;
});

console.log('Background script loaded.');
