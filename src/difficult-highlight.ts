import {
  DifficultHighlightOptions,
  DifficultHighlightState,
  DifficultySeverity,
  DifficultyEntry,
} from './types';

const HIGHLIGHT_CLASS = 'rae-difficult';
const HIGHLIGHT_ROOT_ATTR = 'data-rae-difficult';
const HIGHLIGHT_STYLE_ID = 'rae-difficult-style';
const HIGHLIGHT_SEVERITY_ATTR = 'data-rae-severity';

const SEVERITY_ORDER: Record<DifficultySeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE',
  'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
  'RUBY', 'RT', 'RP', 'IFRAME', 'OBJECT', 'SVG',
]);

const DEFAULT_OPTIONS: Required<Omit<DifficultHighlightOptions, 'rootSelector'>> &
  Pick<DifficultHighlightOptions, 'rootSelector'> = {
  enabled: false,
  minSeverity: 'medium',
  color: 'inherit',
  backgroundColor: 'rgba(255, 235, 130, 0.55)',
  underline: true,
  rootSelector: 'body',
};

export class DifficultHighlighter {
  protected enabled = false;
  protected highlightedCount = 0;
  protected entries: DifficultyEntry[] = [];
  protected entryMap: Map<string, DifficultySeverity> = new Map();
  protected sortedKeys: string[] = [];
  protected observer: MutationObserver | null = null;
  protected currentOptions: DifficultHighlightOptions = DEFAULT_OPTIONS;
  protected rootEl: Element | null = null;

  constructor(initialEntries: DifficultyEntry[] = []) {
    this.setEntries(initialEntries);
  }

  setEntries(entries: DifficultyEntry[]): void {
    this.entries = entries;
    this.entryMap = new Map(entries.map((e) => [e.text, e.severity]));
    this.sortedKeys = [...this.entryMap.keys()].sort((a, b) => b.length - a.length);
    if (this.enabled && this.rootEl) {
      this.removeAll();
      this.highlightedCount = 0;
      this.applyTo(this.rootEl);
    }
  }

  enable(options: DifficultHighlightOptions = DEFAULT_OPTIONS): void {
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
    this.highlightedCount = 0;
    this.rootEl = null;
  }

  toggle(options: DifficultHighlightOptions = DEFAULT_OPTIONS): boolean {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable(options);
    }
    return this.enabled;
  }

  getState(): DifficultHighlightState {
    return { enabled: this.enabled, highlightedCount: this.highlightedCount };
  }

  protected applyTo(_root: Node): void {
    // Implementation arrives in T023
  }

  protected removeAll(): void {
    document.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).forEach((el) => {
      const text = el.textContent ?? '';
      el.replaceWith(document.createTextNode(text));
    });
  }

  protected observe(_root: Node): void {
    // Implementation arrives in T023
  }

  protected disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  protected isInsideSkip(el: Element | null): boolean {
    let cur: Element | null = el;
    while (cur) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.classList?.contains(HIGHLIGHT_CLASS)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  protected meetsThreshold(severity: DifficultySeverity): boolean {
    const min = this.currentOptions.minSeverity ?? DEFAULT_OPTIONS.minSeverity;
    return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[min];
  }

  protected resolveRoot(selector?: string): Element | null {
    if (!selector) return document.body;
    return document.querySelector(selector);
  }

  protected injectStyle(options: DifficultHighlightOptions): void {
    this.removeStyle();
    const style = document.createElement('style');
    style.id = HIGHLIGHT_STYLE_ID;
    const color = options.color ?? DEFAULT_OPTIONS.color;
    const bg = options.backgroundColor ?? DEFAULT_OPTIONS.backgroundColor;
    const underline = options.underline ?? DEFAULT_OPTIONS.underline;
    style.textContent = `
span.${HIGHLIGHT_CLASS} {
  background-color: ${bg};
  color: ${color};
  ${underline ? 'text-decoration: underline wavy currentColor;' : ''}
  border-radius: 2px;
  padding: 0 1px;
}
span.${HIGHLIGHT_CLASS}[${HIGHLIGHT_SEVERITY_ATTR}="high"] {
  background-color: rgba(255, 170, 130, 0.65);
}
span.${HIGHLIGHT_CLASS}[${HIGHLIGHT_SEVERITY_ATTR}="low"] {
  background-color: rgba(200, 230, 255, 0.55);
}
`;
    document.head.appendChild(style);
  }

  protected removeStyle(): void {
    document.getElementById(HIGHLIGHT_STYLE_ID)?.remove();
  }
}

export const DIFFICULT_HIGHLIGHT_INTERNAL = {
  HIGHLIGHT_CLASS,
  HIGHLIGHT_ROOT_ATTR,
  HIGHLIGHT_SEVERITY_ATTR,
  SKIP_TAGS,
  SEVERITY_ORDER,
  DEFAULT_OPTIONS,
};
