import { FuriganaOptions, FuriganaState } from './types';

const FURIGANA_CLASS = 'rae-furigana';
const FURIGANA_ROOT_ATTR = 'data-rae-furigana';
const FURIGANA_STYLE_ID = 'rae-furigana-style';

const KANJI_REGEX = /[一-龯㐀-䶿]+/g;

const DEFAULT_OPTIONS: Required<Omit<FuriganaOptions, 'rootSelector'>> & Pick<FuriganaOptions, 'rootSelector'> = {
  enabled: false,
  fontSize: '0.6em',
  color: 'inherit',
  rootSelector: 'body',
};

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE',
  'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
  'RUBY', 'RT', 'RP', 'IFRAME', 'OBJECT', 'SVG',
]);

export class FuriganaOverlay {
  private enabled = false;
  private appliedCount = 0;
  private dict: Map<string, string>;
  private observer: MutationObserver | null = null;
  private currentOptions: FuriganaOptions = DEFAULT_OPTIONS;
  private rootEl: Element | null = null;

  constructor(initialDict: Map<string, string> = new Map()) {
    this.dict = initialDict;
  }

  setDictionary(dict: Map<string, string>): void {
    this.dict = dict;
    if (this.enabled && this.rootEl) {
      this.removeAll();
      this.appliedCount = 0;
      this.applyTo(this.rootEl);
    }
  }

  enable(options: FuriganaOptions = DEFAULT_OPTIONS): void {
    if (this.enabled) return;
    this.enabled = true;
    this.currentOptions = { ...DEFAULT_OPTIONS, ...options };
    const root = this.resolveRoot(this.currentOptions.rootSelector);
    if (!root) return;
    this.rootEl = root;
    this.injectStyle(this.currentOptions);
    this.applyTo(root);
    this.observe(root);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.disconnect();
    this.removeAll();
    this.removeStyle();
    this.appliedCount = 0;
    this.rootEl = null;
  }

  toggle(options: FuriganaOptions = DEFAULT_OPTIONS): boolean {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable(options);
    }
    return this.enabled;
  }

  getState(): FuriganaState {
    return { enabled: this.enabled, appliedCount: this.appliedCount };
  }

  protected applyTo(root: Node): void {
    const textNodes = this.collectTextNodes(root);
    for (const node of textNodes) {
      this.processTextNode(node);
    }
  }

  protected collectTextNodes(root: Node): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.nodeValue ?? '';
        if (!text.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (this.isInsideSkip(parent)) return NodeFilter.FILTER_REJECT;
        if (!KANJI_REGEX.test(text)) {
          KANJI_REGEX.lastIndex = 0;
          return NodeFilter.FILTER_REJECT;
        }
        KANJI_REGEX.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const out: Text[] = [];
    let cur: Node | null;
    while ((cur = walker.nextNode())) {
      out.push(cur as Text);
    }
    return out;
  }

  protected processTextNode(node: Text): void {
    const text = node.nodeValue ?? '';
    KANJI_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    const segments: Array<{ start: number; end: number; kanji: string; reading: string }> = [];
    while ((match = KANJI_REGEX.exec(text)) !== null) {
      const kanji = match[0];
      const reading = this.lookup(kanji);
      if (!reading) continue;
      segments.push({ start: match.index, end: match.index + kanji.length, kanji, reading });
    }
    if (segments.length === 0) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const seg of segments) {
      if (seg.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, seg.start)));
      }
      frag.appendChild(this.buildRuby(seg.kanji, seg.reading));
      this.appliedCount += 1;
      cursor = seg.end;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode?.replaceChild(frag, node);
  }

  protected buildRuby(kanji: string, reading: string): HTMLElement {
    const ruby = document.createElement('ruby');
    ruby.className = FURIGANA_CLASS;
    ruby.setAttribute(FURIGANA_ROOT_ATTR, '1');
    const rb = document.createElement('rb');
    rb.textContent = kanji;
    const rp1 = document.createElement('rp');
    rp1.textContent = '(';
    const rt = document.createElement('rt');
    rt.textContent = reading;
    const rp2 = document.createElement('rp');
    rp2.textContent = ')';
    ruby.appendChild(rb);
    ruby.appendChild(rp1);
    ruby.appendChild(rt);
    ruby.appendChild(rp2);
    return ruby;
  }

  protected removeAll(): void {
    document.querySelectorAll(`ruby.${FURIGANA_CLASS}`).forEach((ruby) => {
      const text = ruby.querySelector('rb')?.textContent ?? ruby.textContent ?? '';
      ruby.replaceWith(document.createTextNode(text));
    });
  }

  protected observe(root: Node): void {
    this.disconnect();
    this.observer = new MutationObserver((mutations) => {
      if (!this.enabled) return;
      const targets = new Set<Node>();
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.ELEMENT_NODE) {
              const el = n as Element;
              if (el.tagName === 'RUBY' && el.classList.contains(FURIGANA_CLASS)) return;
              if (this.isInsideSkip(el)) return;
              targets.add(n);
            } else if (n.nodeType === Node.TEXT_NODE) {
              const parent = (n as Text).parentElement;
              if (parent && !this.isInsideSkip(parent)) targets.add(n);
            }
          });
        } else if (m.type === 'characterData') {
          const parent = (m.target as Text).parentElement;
          if (parent && !this.isInsideSkip(parent)) targets.add(m.target);
        }
      }
      for (const t of targets) {
        if (t.nodeType === Node.TEXT_NODE) {
          this.processTextNode(t as Text);
        } else {
          this.applyTo(t);
        }
      }
    });
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  protected disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  protected isInsideSkip(el: Element | null): boolean {
    let cur: Element | null = el;
    while (cur) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  protected lookup(kanji: string): string | undefined {
    const direct = this.dict.get(kanji);
    if (direct) return direct;
    if (kanji.length === 1) return undefined;
    let out = '';
    let i = 0;
    while (i < kanji.length) {
      let matched = false;
      for (let len = kanji.length - i; len >= 1; len--) {
        const sub = kanji.slice(i, i + len);
        const r = this.dict.get(sub);
        if (r) {
          out += r;
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) return undefined;
    }
    return out;
  }

  protected resolveRoot(selector?: string): Element | null {
    if (!selector) return document.body;
    return document.querySelector(selector);
  }

  protected injectStyle(options: FuriganaOptions): void {
    this.removeStyle();
    const style = document.createElement('style');
    style.id = FURIGANA_STYLE_ID;
    const fontSize = options.fontSize ?? DEFAULT_OPTIONS.fontSize;
    const color = options.color ?? DEFAULT_OPTIONS.color;
    style.textContent = `
ruby.${FURIGANA_CLASS} rt {
  font-size: ${fontSize};
  color: ${color};
  font-weight: normal;
  user-select: none;
}
ruby.${FURIGANA_CLASS} {
  ruby-position: over;
}
`;
    document.head.appendChild(style);
  }

  protected removeStyle(): void {
    document.getElementById(FURIGANA_STYLE_ID)?.remove();
  }
}

export const FURIGANA_INTERNAL = {
  KANJI_REGEX,
  FURIGANA_CLASS,
  FURIGANA_ROOT_ATTR,
  SKIP_TAGS,
  DEFAULT_OPTIONS,
};
