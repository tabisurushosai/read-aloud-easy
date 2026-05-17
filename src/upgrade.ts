import { setPremiumUnlocked } from './premium';

/**
 * Default Stripe Payment Link URL used to launch the Premium upgrade flow.
 *
 * Why a Payment Link: Chrome extensions must not call external APIs (offline
 * privacy guarantee). A Stripe Payment Link is a static URL — opening it in a
 * tab keeps the checkout entirely on Stripe's side and avoids any server-side
 * integration on our end.
 */
export const DEFAULT_STRIPE_PAYMENT_LINK =
  'https://buy.stripe.com/read-aloud-easy-premium';

/**
 * Premium price in USD. Buy-once model per SPEC.md.
 */
export const PREMIUM_PRICE_USD = 3;

/**
 * License code prefix. Codes look like:
 *   RAE-<base32 payload>-<2-char checksum>
 * The payload is opaque to the validator; only the checksum is verified
 * offline so existing customers can be migrated by issuing codes elsewhere.
 */
export const LICENSE_CODE_PREFIX = 'RAE-';

const BASE32_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface UpgradeOpenResult {
  ok: boolean;
  url: string;
  tabId?: number;
  error?: string;
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
}

export interface UpgradeOptions {
  /**
   * Override the Stripe payment link (e.g. for region-specific pricing).
   */
  paymentLink?: string;
}

/**
 * Build the Stripe Checkout URL. Currently just returns the configured
 * Payment Link verbatim; kept as a function so callers don't depend on
 * the constant.
 */
export function buildCheckoutUrl(options: UpgradeOptions = {}): string {
  return options.paymentLink ?? DEFAULT_STRIPE_PAYMENT_LINK;
}

/**
 * Open the upgrade flow in a new browser tab. Resolves when the tab has
 * been created (Stripe handles the rest).
 */
export async function openUpgradeFlow(
  options: UpgradeOptions = {},
): Promise<UpgradeOpenResult> {
  const url = buildCheckoutUrl(options);
  try {
    const tab = await chrome.tabs.create({ url, active: true });
    return { ok: true, url, tabId: tab.id };
  } catch (e) {
    return {
      ok: false,
      url,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Compute a 2-character checksum for a payload using a stable rolling hash.
 * Used for offline validation of license codes — not a cryptographic guarantee
 * (a determined attacker can forge codes), but enough to prevent typos and
 * accidental input from unlocking Premium.
 */
export function computeChecksum(payload: string): string {
  let h = 5381;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) + h + payload.charCodeAt(i)) >>> 0;
  }
  const a = BASE32_ALPHABET[h % BASE32_ALPHABET.length];
  const b = BASE32_ALPHABET[Math.floor(h / BASE32_ALPHABET.length) % BASE32_ALPHABET.length];
  return `${a}${b}`;
}

/**
 * Normalize a license code: uppercase, strip whitespace and dashes.
 * Callers can pass a user-friendly format like "rae-abcd-efgh-12" and we
 * accept it as `RAE-ABCDEFGH-12` internally.
 */
export function normalizeLicenseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s]/g, '');
}

/**
 * Validate a license code offline. Returns true when the code starts with
 * the prefix and the trailing 2 chars match the checksum of the payload.
 */
export function validateLicenseCode(raw: string): boolean {
  const normalized = normalizeLicenseCode(raw);
  if (!normalized.startsWith(LICENSE_CODE_PREFIX)) return false;
  const body = normalized.slice(LICENSE_CODE_PREFIX.length).replace(/-/g, '');
  if (body.length < 3) return false;
  const payload = body.slice(0, -2);
  const checksum = body.slice(-2);
  if (!/^[A-Z0-9]+$/.test(payload)) return false;
  return computeChecksum(payload) === checksum;
}

/**
 * Redeem a license code. On success, sets premium_unlocked=true.
 */
export async function redeemLicenseCode(raw: string): Promise<RedeemResult> {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'empty_code' };
  }
  if (!validateLicenseCode(raw)) {
    return { ok: false, error: 'invalid_code' };
  }
  await setPremiumUnlocked(true);
  return { ok: true };
}

/**
 * Mark Premium as unlocked without code validation. Used for internal
 * flows (e.g. a future Stripe webhook bridge) and tests.
 */
export async function markPremiumUnlocked(): Promise<void> {
  await setPremiumUnlocked(true);
}
