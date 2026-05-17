import { FuriganaOptions, FuriganaState } from './types';

const FURIGANA_CLASS = 'rae-furigana';
const FURIGANA_ROOT_ATTR = 'data-rae-furigana';

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

  constructor(initialDict: Map<string, string> = new Map()) {
    this.dict = initialDict;
  }

  setDictionary(dict: Map<string, string>): void {
    this.dict = dict;
  }

  enable(options: FuriganaOptions = DEFAULT_OPTIONS): void {
    if (this.enabled) return;
    this.enabled = true;
    const root = this.resolveRoot(options.rootSelector);
    if (!root) return;
    this.applyTo(root);
    this.observe(root);
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.disconnect();
    this.removeAll();
    this.appliedCount = 0;
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

  protected applyTo(_root: Node): void {
    // Implementation placeholder: actual DOM walk + ruby wrapping arrives in T020.
  }

  protected removeAll(): void {
    document.querySelectorAll(`ruby.${FURIGANA_CLASS}`).forEach((ruby) => {
      const text = ruby.querySelector('rb')?.textContent ?? ruby.textContent ?? '';
      ruby.replaceWith(document.createTextNode(text));
    });
    document.querySelectorAll(`[${FURIGANA_ROOT_ATTR}]`).forEach((el) => {
      el.removeAttribute(FURIGANA_ROOT_ATTR);
    });
  }

  protected observe(_root: Node): void {
    // Implementation placeholder: MutationObserver wiring arrives in T020.
  }

  protected disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  protected shouldSkip(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return SKIP_TAGS.has((node as Element).tagName);
  }

  protected lookup(kanji: string): string | undefined {
    return this.dict.get(kanji);
  }

  protected resolveRoot(selector?: string): Element | null {
    if (!selector) return document.body;
    return document.querySelector(selector);
  }
}

export const FURIGANA_INTERNAL = {
  KANJI_REGEX,
  FURIGANA_CLASS,
  FURIGANA_ROOT_ATTR,
  SKIP_TAGS,
  DEFAULT_OPTIONS,
};
