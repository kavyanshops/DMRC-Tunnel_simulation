import type { ConfidenceLevel } from '../../types';

export type { ConfidenceLevel };

export type RoleId = 'worker' | 'engineer' | 'controller';

export type ObjectiveType =
  | 'identify-component'
  | 'explain-function'
  | 'explain-sequence'
  | 'recognise-hazard'
  | 'interpret-monitoring'
  | 'select-escalation'
  | 'explain-consequence';

export type AssessmentMethod = 'checkpoint-question' | 'ordering' | 'anomaly-detection' | 'decision-point' | 'quiz';

export interface LearningObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  /** Stage / parameter / scenario id this objective is assessed in. */
  linkedAsset: string;
  assessment: AssessmentMethod;
  roles: RoleId[];
}

export interface CheckpointQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type ZoneColour = 'investigation' | 'utilities' | 'coordination' | 'ground' | 'instrument' | 'excavation' | 'tbm' | 'lining' | 'grout' | 'breakthrough' | 'natm' | 'fitout';

export interface ConstructionStage {
  id: string;
  order: number;
  title: string;
  zone: ZoneColour;
  whatHappens: string;
  whyNecessary: string;
  equipment: string[];
  risks: string[];
  monitoring: string[];
  /** Monitoring parameter ids (see monitoringThresholds.ts) most relevant to this stage. */
  monitoringParamIds: string[];
  whatCanGoWrong: string;
  dependsOn: string[];
  checkpoint: CheckpointQuestion;
  objectiveIds: string[];
  confidence: ConfidenceLevel;
  source: string;
}

export interface MonitoringParam {
  id: string;
  label: string;
  unit: string;
  /** Direction in which values become worse. */
  worse: 'higher' | 'lower';
  normalMax: number;
  warning: number;
  critical: number;
  /** Axis range for chart. */
  chartMin: number;
  chartMax: number;
  linkedStageIds: string[];
  linkedScenario?: 'fire' | 'flood';
  confidence: ConfidenceLevel;
  source: string;
  /** Deterministic series generator parameters (SIMULATED). */
  sim: { baseline: number; noise: number; driftEnd: number; driftStartTick: number; driftEndTick: number; spikeTick?: number; spikeValue?: number };
}

export type AlertState = 'normal' | 'warning' | 'critical';

export interface ScenarioDecisionOption {
  text: string;
  isCorrect: boolean;
  consequences: string;
  feedback: string;
}

export interface ScenarioDecisionPoint {
  id: string;
  stepNumber: number;
  timeOffsetSeconds: number;
  title: string;
  situation: string;
  telemetry: Record<string, string | number>;
  affectedZone: string;
  options: ScenarioDecisionOption[];
  explanation: string;
  learningObjectiveId: string;
}

export interface DecisionScenario {
  id: 'fire' | 'flood';
  title: string;
  type: 'fire' | 'flood';
  summary: string;
  initialConditions: {
    location: string;
    level: string;
    severity: string;
  };
  decisionPoints: ScenarioDecisionPoint[];
}

export interface ScenarioDecisionRecord {
  scenarioId: 'fire' | 'flood';
  decisionPointId: string;
  chosenIndex: number;
  correct: boolean;
  responseTimeMs: number;
  inOrder: boolean;
  seq: number;
}
