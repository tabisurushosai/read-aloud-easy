chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.storage.local.set({
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
      trial_start_ts: Date.now(),
      premium_unlocked: false,
    }, () => {
      console.log('Default settings initialized.');
    });
  }
});

console.log('Background script loaded.');
