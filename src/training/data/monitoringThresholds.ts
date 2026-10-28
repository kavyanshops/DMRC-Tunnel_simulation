import type { AlertState, MonitoringParam } from './types';

/**
 * ALL thresholds below are ILLUSTRATIVE TRAINING VALUES, tagged ASSUMED.
 * They are NOT project alarm levels. Real trigger levels are set by the designer and asset owners.
 * Reference context only: groundwater table 5-6 m depth (WTC paper, Verified in stationSpec).
 */
const SRC = 'ASSUMED — illustrative training threshold, not a project alarm level';

export const MONITORING_PARAMS: MonitoringParam[] = [
  {
    id: 'MON-SETTLE', label: 'Surface settlement', unit: 'mm', worse: 'higher',
    normalMax: 5, warning: 10, critical: 15, chartMin: 0, chartMax: 20,
    linkedStageIds: ['CS-02', 'CS-04', 'CS-05', 'CS-06', 'CS-07', 'CS-08', 'CS-09', 'CS-11'],
    confidence: 'Assumed', source: SRC,
    sim: { baseline: 1, noise: 0.35, driftEnd: 11.5, driftStartTick: 40, driftEndTick: 110 },
  },
  {
    id: 'MON-TILT', label: 'Building tilt', unit: 'mm/m', worse: 'higher',
    normalMax: 0.5, warning: 1.0, critical: 2.0, chartMin: 0, chartMax: 2.5,
    linkedStageIds: ['CS-04', 'CS-05', 'CS-08'],
    confidence: 'Assumed', source: SRC,
    sim: { baseline: 0.1, noise: 0.03, driftEnd: 0.8, driftStartTick: 60, driftEndTick: 120 },
  },
  {
    id: 'MON-GW', label: 'Groundwater level (depth below ground)', unit: 'm', worse: 'lower',
    normalMax: 5.0, warning: 4.5, critical: 3.5, chartMin: 3, chartMax: 6.5,
    linkedStageIds: ['CS-01', 'CS-05', 'CS-06', 'CS-10', 'CS-12'], linkedScenario: 'flood',
    confidence: 'Assumed', source: `${SRC}; baseline 5-6 m depth is Verified (WTC paper)`,
    sim: { baseline: 5.5, noise: 0.04, driftEnd: 4.2, driftStartTick: 70, driftEndTick: 120 },
  },
  {
    id: 'MON-CONV', label: 'Tunnel convergence', unit: 'mm', worse: 'higher',
    normalMax: 8, warning: 15, critical: 25, chartMin: 0, chartMax: 30,
    linkedStageIds: ['CS-08', 'CS-11'],
    confidence: 'Assumed', source: SRC,
    sim: { baseline: 2, noise: 0.5, driftEnd: 9, driftStartTick: 30, driftEndTick: 120 },
  },
  {
    id: 'MON-GROUT', label: 'Segment grouting fill ratio', unit: '%', worse: 'lower',
    normalMax: 100, warning: 90, critical: 80, chartMin: 70, chartMax: 120,
    linkedStageIds: ['CS-09'],
    confidence: 'Assumed', source: SRC,
    sim: { baseline: 108, noise: 1.2, driftEnd: 108, driftStartTick: 0, driftEndTick: 1, spikeTick: 85, spikeValue: 83 },
  },
  {
    id: 'MON-TBM', label: 'TBM advance rate', unit: 'rings/day', worse: 'higher',
    normalMax: 12, warning: 16, critical: 20, chartMin: 0, chartMax: 24,
    linkedStageIds: ['CS-07', 'CS-08', 'CS-10'],
    confidence: 'Assumed', source: SRC,
    sim: { baseline: 9, noise: 0.8, driftEnd: 9, driftStartTick: 0, driftEndTick: 1, spikeTick: 95, spikeValue: 17.5 },
  },
];

export const SIM_TICKS = 120;

export function alertState(p: MonitoringParam, v: number): AlertState {
  if (p.worse === 'higher') return v >= p.critical ? 'critical' : v >= p.warning ? 'warning' : 'normal';
  return v <= p.critical ? 'critical' : v <= p.warning ? 'warning' : 'normal';
}
