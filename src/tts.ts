import { TTSOptions, TTSStatus } from './types';

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export class TTSManager {
  private status: TTSStatus = 'stopped';

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    // Cancel any prior speech before starting a new utterance.
    chrome.tts.stop();
    return new Promise((resolve) => {
      this.status = 'playing';
      chrome.tts.speak(text, {
        rate: clamp(options.rate ?? 1.0, 0.1, 10.0),
        pitch: clamp(options.pitch ?? 1.0, 0.0, 2.0),
        volume: clamp(options.volume ?? 1.0, 0.0, 1.0),
        lang: options.lang,
        voiceName: options.voiceName,
        onEvent: (event) => {
          switch (event.type) {
            case 'start':
              this.status = 'playing';
              break;
            case 'pause':
              this.status = 'paused';
              break;
            case 'resume':
              this.status = 'playing';
              break;
            case 'end':
            case 'interrupted':
            case 'cancelled':
            case 'error':
              this.status = 'stopped';
              resolve();
              break;
          }
        }
      });
    });
  }

  async stop(): Promise<void> {
    chrome.tts.stop();
    this.status = 'stopped';
  }

  async pause(): Promise<void> {
    if (this.status !== 'playing') return;
    chrome.tts.pause();
    this.status = 'paused';
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') return;
    chrome.tts.resume();
    this.status = 'playing';
  }

  getStatus(): TTSStatus {
    return this.status;
  }
}
