import type { Bookmark } from './types';

/**
 * Settings interface
 */
export interface Settings {
  speed: number;
  pitch: number;
  furigana_enabled: boolean;
  highlight_enabled: boolean;
  highlight_min_severity: 'low' | 'medium' | 'high';
  trial_start_ts?: number;
  premium_unlocked: boolean;
  [key: string]: any;
}

export const BOOKMARKS_KEY = 'bookmarks';

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  speed: 1.0,
  pitch: 1.0,
  furigana_enabled: false,
  highlight_enabled: false,
  highlight_min_severity: 'medium',
  premium_unlocked: false,
};

/**
 * Storage wrapper for chrome.storage.local
 */
export const storage = {
  /**
   * Get all settings
   */
  async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
        resolve(items as Settings);
      });
    });
  },

  /**
   * Set settings
   */
  async setSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(settings, () => {
        resolve();
      });
    });
  },

  /**
   * Get a specific key from storage
   */
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [key]: defaultValue }, (items) => {
        resolve(items[key]);
      });
    });
  },

  /**
   * Set a specific key in storage
   */
  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  /**
   * Remove a key from storage
   */
  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  },

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  },

  /**
   * Load persisted bookmarks list.
   */
  async getBookmarks(): Promise<Bookmark[]> {
    const raw = await new Promise<unknown>((resolve) => {
      chrome.storage.local.get({ [BOOKMARKS_KEY]: [] }, (items) => {
        resolve(items[BOOKMARKS_KEY]);
      });
    });
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (b): b is Bookmark =>
        !!b &&
        typeof (b as Bookmark).id === 'string' &&
        typeof (b as Bookmark).url === 'string' &&
        typeof (b as Bookmark).createdAt === 'number',
    );
  },

  /**
   * Persist bookmarks list.
   */
  async setBookmarks(bookmarks: Bookmark[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [BOOKMARKS_KEY]: bookmarks }, () => {
        resolve();
      });
    });
  },
};
