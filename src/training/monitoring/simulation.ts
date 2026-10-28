import type { MonitoringParam } from '../data/types';
import { SIM_TICKS } from '../data/monitoringThresholds';

/** Deterministic hash noise in [-1, 1]. Same inputs always give the same output (no Math.random). */
export function hashNoise(seed: string, tick: number): number {
  let h = 2166136261 ^ tick;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** SIMULATED series for a parameter. Pure function of (param, tick). */
export function valueAt(p: MonitoringParam, tick: number): number {
  const s = p.sim;
  const span = Math.max(1, s.driftEndTick - s.driftStartTick);
  const t = Math.min(1, Math.max(0, (tick - s.driftStartTick) / span));
  const eased = t * t * (3 - 2 * t);
  let v = s.baseline + (s.driftEnd - s.baseline) * eased + hashNoise(p.id, tick) * s.noise;
  if (s.spikeTick !== undefined && s.spikeValue !== undefined) {
    const d = Math.abs(tick - s.spikeTick);
    if (d <= 5) v += (s.spikeValue - s.baseline) * (1 - d / 6);
  }
  return v;
}

export function seriesUpTo(p: MonitoringParam, tick: number): number[] {
  const n = Math.min(tick, SIM_TICKS);
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(valueAt(p, i));
  return out;
}

/** First tick at which the parameter crosses its warning threshold, or null. Used to score anomaly detection. */
export function firstWarningTick(p: MonitoringParam, isWarn: (v: number) => boolean): number | null {
  for (let i = 0; i <= SIM_TICKS; i++) if (isWarn(valueAt(p, i))) return i;
  return null;
}
