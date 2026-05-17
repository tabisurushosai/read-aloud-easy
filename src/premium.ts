import { storage } from './storage';

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PremiumTier = 'free' | 'trial' | 'premium';

export interface PremiumStatus {
  tier: PremiumTier;
  isPremium: boolean;
  isTrial: boolean;
  hasAccess: boolean;
  trialStartTs?: number;
  trialEndTs?: number;
  trialDaysRemaining: number;
  trialMsRemaining: number;
}

export interface PremiumInputs {
  trialStartTs?: number;
  premiumUnlocked: boolean;
  now: number;
}

function normalizeTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.floor(value);
}

export function computeTrialEnd(trialStartTs: number): number {
  return trialStartTs + TRIAL_DURATION_MS;
}

export function computeTrialMsRemaining(trialStartTs: number | undefined, now: number): number {
  if (trialStartTs === undefined) return 0;
  const remaining = computeTrialEnd(trialStartTs) - now;
  return remaining > 0 ? remaining : 0;
}

export function computeTrialDaysRemaining(
  trialStartTs: number | undefined,
  now: number,
): number {
  const ms = computeTrialMsRemaining(trialStartTs, now);
  if (ms <= 0) return 0;
  return Math.ceil(ms / MS_PER_DAY);
}

export function isTrialActive(trialStartTs: number | undefined, now: number): boolean {
  return computeTrialMsRemaining(trialStartTs, now) > 0;
}

export function computeStatus(inputs: PremiumInputs): PremiumStatus {
  const trialStartTs = normalizeTimestamp(inputs.trialStartTs);
  const trialMsRemaining = computeTrialMsRemaining(trialStartTs, inputs.now);
  const trialActive = trialMsRemaining > 0;
  const isPremium = inputs.premiumUnlocked === true;
  const hasAccess = isPremium || trialActive;
  const tier: PremiumTier = isPremium ? 'premium' : trialActive ? 'trial' : 'free';
  return {
    tier,
    isPremium,
    isTrial: trialActive && !isPremium,
    hasAccess,
    trialStartTs,
    trialEndTs: trialStartTs === undefined ? undefined : computeTrialEnd(trialStartTs),
    trialDaysRemaining: computeTrialDaysRemaining(trialStartTs, inputs.now),
    trialMsRemaining,
  };
}

/**
 * Ensure trial_start_ts exists; set it to `now` if missing or invalid.
 * Returns the effective trial start timestamp.
 */
export async function ensureTrialStarted(now: number = Date.now()): Promise<number> {
  const settings = await storage.getSettings();
  const existing = normalizeTimestamp(settings.trial_start_ts);
  if (existing !== undefined) return existing;
  const start = Math.floor(now);
  await storage.setSettings({ trial_start_ts: start });
  return start;
}

export async function getPremiumStatus(now: number = Date.now()): Promise<PremiumStatus> {
  const settings = await storage.getSettings();
  return computeStatus({
    trialStartTs: settings.trial_start_ts,
    premiumUnlocked: settings.premium_unlocked === true,
    now,
  });
}

export async function isPremiumUnlocked(): Promise<boolean> {
  const settings = await storage.getSettings();
  return settings.premium_unlocked === true;
}

export async function isTrialActiveNow(now: number = Date.now()): Promise<boolean> {
  const settings = await storage.getSettings();
  return isTrialActive(normalizeTimestamp(settings.trial_start_ts), now);
}

export async function hasPremiumAccess(now: number = Date.now()): Promise<boolean> {
  const status = await getPremiumStatus(now);
  return status.hasAccess;
}

export async function setPremiumUnlocked(unlocked: boolean): Promise<void> {
  await storage.setSettings({ premium_unlocked: unlocked });
}

export async function resetTrial(): Promise<void> {
  await storage.setSettings({ trial_start_ts: undefined });
}
