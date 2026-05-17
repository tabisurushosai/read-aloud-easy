import { TTSManager } from './tts';
import { TTSMessage } from './types';

const ttsManager = new TTSManager();

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

chrome.runtime.onMessage.addListener((message: TTSMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'TTS_PLAY':
      if (!message.text) {
        sendResponse({ success: false, error: 'No text provided' });
        return false;
      }
      ttsManager.speak(message.text, message.options)
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
