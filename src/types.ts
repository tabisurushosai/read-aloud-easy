export type TTSStatus = 'playing' | 'paused' | 'stopped';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
}

export interface TTSMessage {
  type: 'TTS_PLAY' | 'TTS_PAUSE' | 'TTS_RESUME' | 'TTS_STOP' | 'GET_TTS_STATUS';
  text?: string;
  options?: TTSOptions;
}

export interface TTSState {
  status: TTSStatus;
  currentText?: string;
  currentIndex?: number;
}
