import {
  PITCH_RANGE,
  PRESETS,
  SPEED_RANGE,
  SpeedPitchController,
  clamp,
  findPreset,
  normalize,
  normalizeValues,
  presetById,
  quantize,
} from '../src/speed-pitch';

let passed = 0;
let failed = 0;

function approxEq(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    return;
  }
  failed++;
  console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

// clamp
check('clamp below min', clamp(0.1, SPEED_RANGE) === SPEED_RANGE.min);
check('clamp above max', clamp(99, SPEED_RANGE) === SPEED_RANGE.max);
check('clamp in range', clamp(1.2, SPEED_RANGE) === 1.2);
check('clamp NaN -> default', clamp(NaN, SPEED_RANGE) === SPEED_RANGE.defaultValue);
check('clamp +Inf -> default', clamp(Infinity, SPEED_RANGE) === SPEED_RANGE.defaultValue);

// quantize
check('quantize snaps to step', approxEq(quantize(1.23, SPEED_RANGE), 1.2));
check('quantize at min', approxEq(quantize(SPEED_RANGE.min, SPEED_RANGE), SPEED_RANGE.min));
check('quantize at max', approxEq(quantize(SPEED_RANGE.max, SPEED_RANGE), SPEED_RANGE.max));

// normalize
check('normalize clamps + quantizes', approxEq(normalize(99, SPEED_RANGE), SPEED_RANGE.max));
check('normalize NaN -> default', approxEq(normalize(NaN, SPEED_RANGE), SPEED_RANGE.defaultValue));
check(
  'normalize 1.07 -> 1.1',
  approxEq(normalize(1.07, SPEED_RANGE), 1.1),
);

// normalizeValues
const nv = normalizeValues({ speed: 99, pitch: -5 });
check('normalizeValues clamps speed', nv.speed === SPEED_RANGE.max);
check('normalizeValues clamps pitch', nv.pitch === PITCH_RANGE.min);
const nvEmpty = normalizeValues({});
check('normalizeValues default speed', nvEmpty.speed === SPEED_RANGE.defaultValue);
check('normalizeValues default pitch', nvEmpty.pitch === PITCH_RANGE.defaultValue);

// presets
check('PRESETS not empty', PRESETS.length > 0);
check('presetById finds normal', presetById('normal')?.id === 'normal');
check('presetById unknown -> null', presetById('xyz') === null);

// findPreset
const normalPreset = PRESETS.find((p) => p.id === 'normal')!;
check(
  'findPreset matches normal',
  findPreset({ speed: normalPreset.speed, pitch: normalPreset.pitch })?.id === 'normal',
);
check('findPreset no match -> null', findPreset({ speed: 1.1, pitch: 1.7 }) === null);

// Controller
const c = new SpeedPitchController();
check('controller default speed', c.getState().values.speed === SPEED_RANGE.defaultValue);
check('controller default preset normal', c.getState().presetId === 'normal');

c.set({ speed: 1.5 });
check('controller set speed', c.getState().values.speed === 1.5);
check('controller set clears preset when off-grid', c.getState().presetId === null);

const slow = c.applyPreset('slow');
check('applyPreset slow speed', slow?.values.speed === 0.7);
check('applyPreset slow id', slow?.presetId === 'slow');

const bad = c.applyPreset('does-not-exist');
check('applyPreset unknown returns null', bad === null);

const reset = c.reset();
check('reset speed default', reset.values.speed === SPEED_RANGE.defaultValue);
check('reset pitch default', reset.values.pitch === PITCH_RANGE.defaultValue);
check('reset preset normal', reset.presetId === 'normal');

// Out-of-range constructor
const c2 = new SpeedPitchController({ speed: 99, pitch: -5 });
check('constructor clamps speed', c2.getState().values.speed === SPEED_RANGE.max);
check('constructor clamps pitch', c2.getState().values.pitch === PITCH_RANGE.min);

// State immutability
const state = c.getState();
state.values.speed = 999;
check(
  'getState returns copy',
  c.getState().values.speed !== 999,
);

console.log(`speed-pitch tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
