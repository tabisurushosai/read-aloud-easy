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

export interface FuriganaReading {
  kanji: string;
  reading: string;
}

export interface FuriganaOptions {
  enabled: boolean;
  fontSize?: string;
  color?: string;
  rootSelector?: string;
}

export interface FuriganaMessage {
  type: 'FURIGANA_ENABLE' | 'FURIGANA_DISABLE' | 'FURIGANA_TOGGLE' | 'GET_FURIGANA_STATE';
  options?: FuriganaOptions;
}

export interface FuriganaState {
  enabled: boolean;
  appliedCount: number;
}

export type DifficultySeverity = 'low' | 'medium' | 'high';

export interface DifficultHighlightOptions {
  enabled: boolean;
  rootSelector?: string;
  minSeverity?: DifficultySeverity;
  color?: string;
  backgroundColor?: string;
  underline?: boolean;
}

export interface DifficultHighlightMessage {
  type:
    | 'DIFFICULT_HIGHLIGHT_ENABLE'
    | 'DIFFICULT_HIGHLIGHT_DISABLE'
    | 'DIFFICULT_HIGHLIGHT_TOGGLE'
    | 'GET_DIFFICULT_HIGHLIGHT_STATE';
  options?: DifficultHighlightOptions;
}

export interface DifficultHighlightState {
  enabled: boolean;
  highlightedCount: number;
}

export interface DifficultyEntry {
  text: string;
  severity: DifficultySeverity;
}
