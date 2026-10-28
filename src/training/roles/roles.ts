import type { RoleId } from '../data/types';

export interface RoleDef {
  id: RoleId;
  label: string;
  blurb: string;
  recommended: Array<'sequence' | 'monitoring' | 'fire' | 'flood'>;
  checklist: string[];
  scenarioEmphasis: string;
  assessmentFocus: string;
}

export const ROLES: RoleDef[] = [
  {
    id: 'worker', label: 'Construction Worker',
    blurb: 'Hazards, PPE, restricted zones, reporting and evacuation awareness.',
    recommended: ['sequence', 'fire', 'flood'],
    checklist: ['Recognise excavation-edge and breakthrough hazards (stages 6 and 10)', 'Know what segment lining and grouting do (stages 8-9)', 'Know when and how to report a hazard', 'Understand the evacuation emphasis in both scenarios'],
    scenarioEmphasis: 'Reporting and evacuation awareness.',
    assessmentFocus: 'Hazard recognition and basic function checkpoints.',
  },
  {
    id: 'engineer', label: 'Site Engineer',
    blurb: 'Construction sequence, QA/QC, monitoring and escalation.',
    recommended: ['sequence', 'monitoring', 'flood', 'fire'],
    checklist: ['Complete all 12 stages in dependency order', 'Link each stage to its monitoring parameters', 'Detect settlement, tilt and groundwater anomalies', 'Select the correct escalation when a threshold is crossed'],
    scenarioEmphasis: 'Monitoring interpretation and escalation.',
    assessmentFocus: 'Stage order, anomaly detection and escalation choices.',
  },
  {
    id: 'controller', label: 'Safety / Controller Trainee',
    blurb: 'Alarms, affected zones, response coordination and debrief.',
    recommended: ['monitoring', 'fire', 'flood', 'sequence'],
    checklist: ['Interpret alert states for all six parameters', 'Link alarms to affected zones and stages', 'Coordinate response in the decision scenarios', 'Review the debrief and missed checkpoints'],
    scenarioEmphasis: 'Alarms, affected zones and response coordination.',
    assessmentFocus: 'Alarm interpretation and coordination decisions.',
  },
];

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id)!;
