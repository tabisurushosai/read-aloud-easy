import {
  Bookmark,
  BookmarkInput,
  BookmarkListQuery,
  BookmarkState,
  BookmarkUpdate,
} from './types';

export const BOOKMARK_STORAGE_KEY = 'bookmarks';
export const SNIPPET_MAX_LENGTH = 200;
export const NOTE_MAX_LENGTH = 500;
export const FREE_BOOKMARK_LIMIT = 50;
export const PREMIUM_BOOKMARK_LIMIT = Number.POSITIVE_INFINITY;
export const DEFAULT_LIST_LIMIT = 100;

export type BookmarkSort = NonNullable<BookmarkListQuery['sort']>;

const SORT_FNS: Record<BookmarkSort, (a: Bookmark, b: Bookmark) => number> = {
  createdAtDesc: (a, b) => b.createdAt - a.createdAt,
  createdAtAsc: (a, b) => a.createdAt - b.createdAt,
  updatedAtDesc: (a, b) => b.updatedAt - a.updatedAt,
};

export function generateBookmarkId(now: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `bm_${now.toString(36)}_${rand}`;
}

export function truncateSnippet(text: string, max = SNIPPET_MAX_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + '…';
}

export function normalizeNote(note: string | undefined): string | undefined {
  if (note === undefined) return undefined;
  const trimmed = note.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, NOTE_MAX_LENGTH);
}

export function buildBookmark(
  input: BookmarkInput,
  now: number = Date.now(),
): Bookmark {
  if (!input.url) throw new Error('bookmark.url is required');
  return {
    id: generateBookmarkId(now),
    url: input.url,
    title: (input.title ?? '').trim(),
    snippet: truncateSnippet(input.snippet ?? ''),
    position: input.position,
    note: normalizeNote(input.note),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyUpdate(
  bookmark: Bookmark,
  update: BookmarkUpdate,
  now: number = Date.now(),
): Bookmark {
  const next: Bookmark = { ...bookmark, updatedAt: now };
  if (update.title !== undefined) next.title = update.title.trim();
  if (update.snippet !== undefined) next.snippet = truncateSnippet(update.snippet);
  if (update.position !== undefined) next.position = update.position;
  if (update.note !== undefined) next.note = normalizeNote(update.note);
  return next;
}

export function queryBookmarks(
  bookmarks: Bookmark[],
  query: BookmarkListQuery = {},
): Bookmark[] {
  const sort = query.sort ?? 'createdAtDesc';
  const filtered = query.url
    ? bookmarks.filter((b) => b.url === query.url)
    : bookmarks.slice();
  filtered.sort(SORT_FNS[sort]);
  const limit = query.limit ?? DEFAULT_LIST_LIMIT;
  return filtered.slice(0, limit);
}

export class BookmarkController {
  private bookmarks: Bookmark[];
  private limit: number;

  constructor(initial: Bookmark[] = [], limit: number = FREE_BOOKMARK_LIMIT) {
    this.bookmarks = initial.slice();
    this.limit = limit;
  }

  setLimit(limit: number): void {
    this.limit = limit;
  }

  getLimit(): number {
    return this.limit;
  }

  getState(): BookmarkState {
    return {
      bookmarks: this.bookmarks.slice(),
      total: this.bookmarks.length,
    };
  }

  list(query: BookmarkListQuery = {}): Bookmark[] {
    return queryBookmarks(this.bookmarks, query);
  }

  get(id: string): Bookmark | null {
    return this.bookmarks.find((b) => b.id === id) ?? null;
  }

  create(input: BookmarkInput, now: number = Date.now()): Bookmark {
    if (this.bookmarks.length >= this.limit) {
      throw new Error('bookmark limit reached');
    }
    const bookmark = buildBookmark(input, now);
    this.bookmarks.push(bookmark);
    return bookmark;
  }

  update(id: string, update: BookmarkUpdate, now: number = Date.now()): Bookmark | null {
    const idx = this.bookmarks.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    const next = applyUpdate(this.bookmarks[idx], update, now);
    this.bookmarks[idx] = next;
    return next;
  }

  remove(id: string): boolean {
    const idx = this.bookmarks.findIndex((b) => b.id === id);
    if (idx < 0) return false;
    this.bookmarks.splice(idx, 1);
    return true;
  }

  clear(): void {
    this.bookmarks = [];
  }

  replaceAll(bookmarks: Bookmark[]): void {
    this.bookmarks = bookmarks.slice();
  }
}
