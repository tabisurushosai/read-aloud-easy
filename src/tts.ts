import { TTSOptions, TTSStatus } from './types';

export class TTSManager {
  private status: TTSStatus = 'stopped';

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.status = 'playing';
      chrome.tts.speak(text, {
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        lang: options.lang,
        onEvent: (event) => {
          if (event.type === 'end') {
            this.status = 'stopped';
            resolve();
          } else if (event.type === 'interrupted' || event.type === 'cancelled' || event.type === 'error') {
            this.status = 'stopped';
            reject(new Error(`TTS event: ${event.type}`));
          }
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tts.stop();
      this.status = 'stopped';
      resolve();
    });
  }

  async pause(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tts.pause();
      this.status = 'paused';
      resolve();
    });
  }

  async resume(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tts.resume();
      this.status = 'playing';
      resolve();
    });
  }

  getStatus(): TTSStatus {
    return this.status;
  }
}
