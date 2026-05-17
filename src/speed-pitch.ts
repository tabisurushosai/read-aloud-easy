import {
  SpeedPitchPreset,
  SpeedPitchRange,
  SpeedPitchState,
  SpeedPitchValues,
} from './types';

export const SPEED_RANGE: SpeedPitchRange = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  defaultValue: 1.0,
};

export const PITCH_RANGE: SpeedPitchRange = {
  min: 0.5,
  max: 2.0,
  step: 0.1,
  defaultValue: 1.0,
};

export const PRESETS: SpeedPitchPreset[] = [
  { id: 'slow',   labelKey: 'preset_slow',   speed: 0.7, pitch: 1.0 },
  { id: 'normal', labelKey: 'preset_normal', speed: 1.0, pitch: 1.0 },
  { id: 'fast',   labelKey: 'preset_fast',   speed: 1.4, pitch: 1.0 },
  { id: 'kids',   labelKey: 'preset_kids',   speed: 0.9, pitch: 1.3 },
];

const EPSILON = 1e-6;

export function clamp(value: number, range: SpeedPitchRange): number {
  if (!Number.isFinite(value)) return range.defaultValue;
  return Math.min(Math.max(value, range.min), range.max);
}

export function quantize(value: number, range: SpeedPitchRange): number {
  const steps = Math.round((value - range.min) / range.step);
  const snapped = range.min + steps * range.step;
  return Math.round(snapped * 100) / 100;
}

export function normalize(value: number, range: SpeedPitchRange): number {
  return quantize(clamp(value, range), range);
}

export function normalizeValues(input: Partial<SpeedPitchValues>): SpeedPitchValues {
  return {
    speed: normalize(input.speed ?? SPEED_RANGE.defaultValue, SPEED_RANGE),
    pitch: normalize(input.pitch ?? PITCH_RANGE.defaultValue, PITCH_RANGE),
  };
}

export function findPreset(values: SpeedPitchValues): SpeedPitchPreset | null {
  for (const preset of PRESETS) {
    if (
      Math.abs(preset.speed - values.speed) < EPSILON &&
      Math.abs(preset.pitch - values.pitch) < EPSILON
    ) {
      return preset;
    }
  }
  return null;
}

export function presetById(id: string): SpeedPitchPreset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}

export class SpeedPitchController {
  private state: SpeedPitchState;

  constructor(initial?: Partial<SpeedPitchValues>) {
    const values = normalizeValues(initial ?? {});
    this.state = { values, presetId: findPreset(values)?.id ?? null };
  }

  getState(): SpeedPitchState {
    return { values: { ...this.state.values }, presetId: this.state.presetId };
  }

  set(partial: Partial<SpeedPitchValues>): SpeedPitchState {
    const next = normalizeValues({ ...this.state.values, ...partial });
    this.state = { values: next, presetId: findPreset(next)?.id ?? null };
    return this.getState();
  }

  reset(): SpeedPitchState {
    return this.set({
      speed: SPEED_RANGE.defaultValue,
      pitch: PITCH_RANGE.defaultValue,
    });
  }

  applyPreset(id: string): SpeedPitchState | null {
    const preset = presetById(id);
    if (!preset) return null;
    return this.set({ speed: preset.speed, pitch: preset.pitch });
  }
}
