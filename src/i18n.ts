/**
 * chrome.i18n.getMessage の型安全なヘルパー
 */

/**
 * 指定されたキーに対応する翻訳メッセージを取得します。
 * @param messageName messages.json で定義されたキー
 * @param substitutions メッセージ内の $1, $2 などを置き換える文字列または文字列の配列
 * @returns 翻訳されたメッセージ
 */
export function t(messageName: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(messageName, substitutions) || messageName;
}

/**
 * DOM 要素内の data-i18n 属性を持つ要素に翻訳を適用します。
 * 要素が data-i18n="key" を持っている場合、textContent を翻訳メッセージに置き換えます。
 * 要素が data-i18n-placeholder="key" を持っている場合、placeholder を翻訳メッセージに置き換えます。
 */
export function applyI18nToDoc(): void {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && el instanceof HTMLInputElement) {
      el.placeholder = t(key);
    }
  });
}
