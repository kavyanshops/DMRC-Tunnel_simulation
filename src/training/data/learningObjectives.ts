import type { LearningObjective } from './types';

const ALL = ['worker', 'engineer', 'controller'] as const;

/**
 * Every objective has an ID, description, linked asset (stage/parameter/scenario) and assessment method.
 * Linked assets: CS-xx = construction stage, MON-xx = monitoring parameter, SCN-FIRE / SCN-FLOOD = scenarios.
 */
export const LEARNING_OBJECTIVES: LearningObjective[] = [
  { id: 'LO-SEQ-01', type: 'explain-sequence', description: 'Place the 12 construction stages in the correct order and state why investigation and baseline monitoring come first.', linkedAsset: 'CS-01', assessment: 'ordering', roles: ['engineer', 'controller'] },
  { id: 'LO-SEQ-02', type: 'explain-sequence', description: 'Explain why utility diversion and protection precede excavation.', linkedAsset: 'CS-02', assessment: 'checkpoint-question', roles: ['engineer', 'worker'] },
  { id: 'LO-SEQ-03', type: 'explain-function', description: 'Explain the purpose of traffic, railway and metro coordination.', linkedAsset: 'CS-03', assessment: 'checkpoint-question', roles: ['engineer'] },
  { id: 'LO-SEQ-04', type: 'explain-function', description: 'Explain why ground improvement / TAM grouting is used near sensitive structures.', linkedAsset: 'CS-04', assessment: 'checkpoint-question', roles: ['engineer'] },
  { id: 'LO-MON-05', type: 'identify-component', description: 'Identify the main monitoring instruments and what each measures.', linkedAsset: 'CS-05', assessment: 'checkpoint-question', roles: [...ALL] },
  { id: 'LO-HAZ-06', type: 'recognise-hazard', description: 'Recognise excavation-edge, groundwater and restricted-zone hazards at the launch pit.', linkedAsset: 'CS-06', assessment: 'checkpoint-question', roles: ['worker', 'engineer'] },
  { id: 'LO-SEQ-07', type: 'explain-sequence', description: 'Describe the TBM launch and initial advance, and why early drives need tighter control.', linkedAsset: 'CS-07', assessment: 'checkpoint-question', roles: ['engineer'] },
  { id: 'LO-FUN-08', type: 'explain-function', description: 'Explain the function of segmental lining erected behind the TBM.', linkedAsset: 'CS-08', assessment: 'checkpoint-question', roles: [...ALL] },
  { id: 'LO-CON-09', type: 'explain-consequence', description: 'Explain what can happen if annular grouting is delayed or incomplete.', linkedAsset: 'CS-09', assessment: 'checkpoint-question', roles: ['engineer', 'controller'] },
  { id: 'LO-HAZ-10', type: 'recognise-hazard', description: 'Recognise breakthrough-phase hazards (face stability, water inflow).', linkedAsset: 'CS-10', assessment: 'checkpoint-question', roles: ['worker', 'engineer'] },
  { id: 'LO-SEQ-11', type: 'explain-sequence', description: 'Explain NATM cross-passage excavation and support, and why it follows the running tunnels.', linkedAsset: 'CS-11', assessment: 'checkpoint-question', roles: ['engineer'] },
  { id: 'LO-FUN-12', type: 'explain-function', description: 'List the systems completed in the final fit-out stage (trackwork, MEP, drainage, ventilation).', linkedAsset: 'CS-12', assessment: 'checkpoint-question', roles: [...ALL] },
  { id: 'LO-MON-13', type: 'interpret-monitoring', description: 'Read a simulated trend, compare it with warning and critical thresholds, and state the alert level.', linkedAsset: 'MON-SETTLE', assessment: 'anomaly-detection', roles: ['engineer', 'controller'] },
  { id: 'LO-MON-14', type: 'interpret-monitoring', description: 'Detect a groundwater level rise and link it to ingress risk.', linkedAsset: 'MON-GW', assessment: 'anomaly-detection', roles: ['engineer', 'controller'] },
  { id: 'LO-ESC-15', type: 'select-escalation', description: 'Select an appropriate escalation action when a monitored value crosses a threshold.', linkedAsset: 'MON-TILT', assessment: 'decision-point', roles: ['engineer', 'controller'] },
  { id: 'LO-ESC-16', type: 'select-escalation', description: 'Fire scenario: identify location, report, choose evacuation/ventilation strategy (decision-based module, planned).', linkedAsset: 'SCN-FIRE', assessment: 'decision-point', roles: [...ALL] },
  { id: 'LO-ESC-17', type: 'select-escalation', description: 'Flooding scenario: identify ingress, interpret water trend, choose drainage and escalation (decision-based module, planned).', linkedAsset: 'SCN-FLOOD', assessment: 'decision-point', roles: [...ALL] },
  { id: 'LO-CON-18', type: 'explain-consequence', description: 'Explain the consequence of an incorrect escalation decision.', linkedAsset: 'SCN-FIRE', assessment: 'decision-point', roles: [...ALL] },
];

export const objectivesForAsset = (asset: string) => LEARNING_OBJECTIVES.filter((o) => o.linkedAsset === asset);
