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

export interface SpeedPitchValues {
  speed: number;
  pitch: number;
}

export interface SpeedPitchRange {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface SpeedPitchPreset {
  id: string;
  labelKey: string;
  speed: number;
  pitch: number;
}

export interface SpeedPitchState {
  values: SpeedPitchValues;
  presetId: string | null;
}

export interface SpeedPitchMessage {
  type:
    | 'SPEED_PITCH_SET'
    | 'SPEED_PITCH_RESET'
    | 'SPEED_PITCH_APPLY_PRESET'
    | 'GET_SPEED_PITCH_STATE';
  values?: Partial<SpeedPitchValues>;
  presetId?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  snippet: string;
  position?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkInput {
  url: string;
  title?: string;
  snippet?: string;
  position?: number;
  note?: string;
}

export interface BookmarkUpdate {
  note?: string;
  snippet?: string;
  position?: number;
  title?: string;
}

export interface BookmarkListQuery {
  url?: string;
  limit?: number;
  sort?: 'createdAtDesc' | 'createdAtAsc' | 'updatedAtDesc';
}

export interface BookmarkState {
  bookmarks: Bookmark[];
  total: number;
}

export interface BookmarkMessage {
  type:
    | 'BOOKMARK_CREATE'
    | 'BOOKMARK_UPDATE'
    | 'BOOKMARK_REMOVE'
    | 'BOOKMARK_LIST'
    | 'BOOKMARK_CLEAR'
    | 'GET_BOOKMARK_STATE';
  bookmark?: BookmarkInput;
  id?: string;
  update?: BookmarkUpdate;
  query?: BookmarkListQuery;
}
