import {
  BOOKMARK_STORAGE_KEY,
  BookmarkController,
  DEFAULT_LIST_LIMIT,
  FREE_BOOKMARK_LIMIT,
  NOTE_MAX_LENGTH,
  PREMIUM_BOOKMARK_LIMIT,
  SNIPPET_MAX_LENGTH,
  applyUpdate,
  buildBookmark,
  generateBookmarkId,
  normalizeNote,
  queryBookmarks,
  truncateSnippet,
} from '../src/bookmark';
import { Bookmark } from '../src/types';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    return;
  }
  failed++;
  console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

// constants
check('BOOKMARK_STORAGE_KEY is "bookmarks"', BOOKMARK_STORAGE_KEY === 'bookmarks');
check('FREE_BOOKMARK_LIMIT is 50', FREE_BOOKMARK_LIMIT === 50);
check('PREMIUM_BOOKMARK_LIMIT is Infinity', PREMIUM_BOOKMARK_LIMIT === Number.POSITIVE_INFINITY);
check('SNIPPET_MAX_LENGTH is 200', SNIPPET_MAX_LENGTH === 200);
check('NOTE_MAX_LENGTH is 500', NOTE_MAX_LENGTH === 500);
check('DEFAULT_LIST_LIMIT is 100', DEFAULT_LIST_LIMIT === 100);

// generateBookmarkId
const id1 = generateBookmarkId(1000);
const id2 = generateBookmarkId(1000);
check('id has bm_ prefix', id1.startsWith('bm_'));
check('two ids differ (random suffix)', id1 !== id2);

// truncateSnippet
check('truncate short text unchanged', truncateSnippet('hello') === 'hello');
check(
  'truncate collapses whitespace',
  truncateSnippet('  a  b\n c\t d  ') === 'a b c d',
);
const long = 'x'.repeat(300);
const truncated = truncateSnippet(long);
check('truncate caps length to max', truncated.length === SNIPPET_MAX_LENGTH);
check('truncate ends with ellipsis', truncated.endsWith('…'));
check(
  'truncate custom max',
  truncateSnippet('hello world', 5) === 'hell…',
);
check('truncate exact length unchanged', truncateSnippet('abcde', 5) === 'abcde');

// normalizeNote
check('normalize undefined -> undefined', normalizeNote(undefined) === undefined);
check('normalize empty -> undefined', normalizeNote('   ') === undefined);
check('normalize trims', normalizeNote('  hi  ') === 'hi');
const longNote = 'a'.repeat(NOTE_MAX_LENGTH + 100);
check(
  'normalize caps at NOTE_MAX_LENGTH',
  (normalizeNote(longNote) ?? '').length === NOTE_MAX_LENGTH,
);

// buildBookmark
const built = buildBookmark(
  { url: 'https://example.com', title: ' Hi ', snippet: '  some text  ', note: ' note ' },
  5000,
);
check('built has id', built.id.startsWith('bm_'));
check('built url', built.url === 'https://example.com');
check('built title trimmed', built.title === 'Hi');
check('built snippet trimmed', built.snippet === 'some text');
check('built note trimmed', built.note === 'note');
check('built createdAt', built.createdAt === 5000);
check('built updatedAt', built.updatedAt === 5000);

let buildErr = false;
try {
  buildBookmark({ url: '' });
} catch {
  buildErr = true;
}
check('buildBookmark throws on empty url', buildErr);

const noOpt = buildBookmark({ url: 'https://a.com' }, 1);
check('built default title empty', noOpt.title === '');
check('built default snippet empty', noOpt.snippet === '');
check('built default note undefined', noOpt.note === undefined);

// applyUpdate
const base: Bookmark = buildBookmark({ url: 'https://example.com', title: 'A' }, 1000);
const updated = applyUpdate(base, { title: ' B ', note: ' n ' }, 2000);
check('apply update title', updated.title === 'B');
check('apply update note', updated.note === 'n');
check('apply update timestamp', updated.updatedAt === 2000);
check('apply update preserves id', updated.id === base.id);
check('apply update preserves createdAt', updated.createdAt === base.createdAt);

const updatedNoChange = applyUpdate(base, {}, 3000);
check('apply update only bumps updatedAt', updatedNoChange.updatedAt === 3000);
check('apply update no-op preserves title', updatedNoChange.title === base.title);

const updatedSnippet = applyUpdate(base, { snippet: '  long  text  ' }, 4000);
check('apply update snippet normalized', updatedSnippet.snippet === 'long text');

const updatedPos = applyUpdate(base, { position: 42 }, 5000);
check('apply update position', updatedPos.position === 42);

// queryBookmarks
const list: Bookmark[] = [
  { id: 'a', url: 'u1', title: 'A', snippet: '', createdAt: 100, updatedAt: 200 },
  { id: 'b', url: 'u2', title: 'B', snippet: '', createdAt: 200, updatedAt: 100 },
  { id: 'c', url: 'u1', title: 'C', snippet: '', createdAt: 300, updatedAt: 300 },
];

const sortedDesc = queryBookmarks(list);
check('default sort createdAtDesc first id', sortedDesc[0].id === 'c');
check('default sort length', sortedDesc.length === 3);

const sortedAsc = queryBookmarks(list, { sort: 'createdAtAsc' });
check('createdAtAsc first id', sortedAsc[0].id === 'a');

const sortedUpd = queryBookmarks(list, { sort: 'updatedAtDesc' });
check('updatedAtDesc first id', sortedUpd[0].id === 'c');

const filteredU1 = queryBookmarks(list, { url: 'u1' });
check('filter by url count', filteredU1.length === 2);
check('filter by url ids', filteredU1.every((b) => b.url === 'u1'));

const limited = queryBookmarks(list, { limit: 2 });
check('limit cuts list', limited.length === 2);

// BookmarkController
const ctrl = new BookmarkController();
check('default limit free', ctrl.getLimit() === FREE_BOOKMARK_LIMIT);

const created = ctrl.create({ url: 'https://x.com', title: 'X' }, 1000);
check('controller create returns bookmark', created.url === 'https://x.com');
check('controller state total 1', ctrl.getState().total === 1);

const fetched = ctrl.get(created.id);
check('controller get by id', fetched?.id === created.id);
check('controller get unknown -> null', ctrl.get('nope') === null);

const upd = ctrl.update(created.id, { title: 'Y' }, 2000);
check('controller update title', upd?.title === 'Y');
check('controller update unknown -> null', ctrl.update('nope', {}) === null);

const removed = ctrl.remove(created.id);
check('controller remove true', removed === true);
check('controller state total 0', ctrl.getState().total === 0);
check('controller remove unknown false', ctrl.remove('nope') === false);

// limit enforcement
const tiny = new BookmarkController([], 2);
tiny.create({ url: 'https://1.com' });
tiny.create({ url: 'https://2.com' });
let limitErr = false;
try {
  tiny.create({ url: 'https://3.com' });
} catch {
  limitErr = true;
}
check('controller throws on limit', limitErr);

tiny.setLimit(5);
check('controller setLimit', tiny.getLimit() === 5);
tiny.create({ url: 'https://3.com' });
check('controller create after limit raise', tiny.getState().total === 3);

// clear / replaceAll
tiny.clear();
check('controller clear empties', tiny.getState().total === 0);

tiny.replaceAll(list);
check('controller replaceAll count', tiny.getState().total === 3);

// getState immutability
const stateCopy = tiny.getState();
stateCopy.bookmarks.pop();
check(
  'getState returns copy of bookmarks',
  tiny.getState().total === 3,
);

// list via controller
const listed = tiny.list({ url: 'u1' });
check('controller list filter', listed.length === 2);

console.log(`bookmark tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
