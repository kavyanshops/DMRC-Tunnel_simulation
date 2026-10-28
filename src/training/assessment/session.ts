import { CONSTRUCTION_STAGES } from '../data/constructionSequence';
import { MONITORING_PARAMS, SIM_TICKS, alertState } from '../data/monitoringThresholds';
import { valueAt } from '../monitoring/simulation';
import { REVISION_TOPICS, RUBRIC } from '../data/assessmentRubric';
import { DISCLAIMER_SIMULATED } from '../data/constants';
import { FIRE_DECISION_SCENARIO } from '../data/fireDecisionScenario';
import { FLOODING_DECISION_SCENARIO } from '../data/floodingDecisionScenario';
import type { RoleId, ScenarioDecisionRecord } from '../data/types';

export interface CheckpointRecord { stageId: string; chosen: number; correct: boolean; inOrder: boolean; seq: number; }
export interface AnomalyRecord { paramId: string; tick: number; correct: boolean; latencyTicks: number | null; }

export class TrainingSession {
  role: RoleId | null = null;
  startedAt = new Date().toISOString();
  checkpoints: CheckpointRecord[] = [];
  anomalies: AnomalyRecord[] = [];
  scenarioDecisions: ScenarioDecisionRecord[] = [];
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach((f) => f()); }

  setRole(r: RoleId) { this.role = r; this.emit(); }

  completedStageIds(): string[] { return this.checkpoints.map((c) => c.stageId); }

  answerCheckpoint(stageId: string, chosen: number): CheckpointRecord | null {
    if (this.checkpoints.some((c) => c.stageId === stageId)) return null; // first answer counts
    const stage = CONSTRUCTION_STAGES.find((s) => s.id === stageId)!;
    const done = new Set(this.completedStageIds());
    const rec: CheckpointRecord = {
      stageId, chosen, correct: chosen === stage.checkpoint.correctIndex,
      inOrder: stage.dependsOn.every((d) => done.has(d)), seq: this.checkpoints.length + 1,
    };
    this.checkpoints.push(rec);
    this.emit();
    return rec;
  }

  flagAnomaly(paramId: string, tick: number, isAbnormal: boolean, firstWarnTick: number | null) {
    this.anomalies.push({ paramId, tick, correct: isAbnormal, latencyTicks: isAbnormal && firstWarnTick !== null ? tick - firstWarnTick : null });
    this.emit();
  }

  answerScenarioDecision(scenarioId: 'fire' | 'flood', decisionPointId: string, chosenIndex: number, responseTimeMs = 0): ScenarioDecisionRecord | null {
    if (this.scenarioDecisions.some((s) => s.scenarioId === scenarioId && s.decisionPointId === decisionPointId)) return null;
    const sc = scenarioId === 'fire' ? FIRE_DECISION_SCENARIO : FLOODING_DECISION_SCENARIO;
    const dp = sc.decisionPoints.find((p) => p.id === decisionPointId);
    if (!dp) return null;
    const priorForScenario = this.scenarioDecisions.filter((s) => s.scenarioId === scenarioId);
    const inOrder = dp.stepNumber === priorForScenario.length + 1;
    const correct = dp.options[chosenIndex]?.isCorrect ?? false;
    const rec: ScenarioDecisionRecord = {
      scenarioId, decisionPointId, chosenIndex, correct, responseTimeMs, inOrder, seq: this.scenarioDecisions.length + 1,
    };
    this.scenarioDecisions.push(rec);
    this.emit();
    return rec;
  }

  resetScenario(scenarioId: 'fire' | 'flood') {
    this.scenarioDecisions = this.scenarioDecisions.filter((s) => s.scenarioId !== scenarioId);
    this.emit();
  }

  scenarioScore(scenarioId: 'fire' | 'flood'): number | null {
    const recs = this.scenarioDecisions.filter((s) => s.scenarioId === scenarioId);
    if (!recs.length) return null;
    const sc = scenarioId === 'fire' ? FIRE_DECISION_SCENARIO : FLOODING_DECISION_SCENARIO;
    const total = sc.decisionPoints.length;
    const cp = recs.filter((r) => r.correct).length / total;
    const ord = recs.filter((r) => r.inOrder).length / total;
    const cw = RUBRIC.scenario?.correctWeight ?? 0.8;
    const ow = RUBRIC.scenario?.orderWeight ?? 0.2;
    return Math.round((cp * cw + ord * ow) * 100);
  }

  fireScore(): number | null { return this.scenarioScore('fire'); }
  floodingScore(): number | null { return this.scenarioScore('flood'); }

  /** Per-module score 0-100, or null if the module has not been attempted. */
  sequenceScore(): number | null {
    if (!this.checkpoints.length) return null;
    const total = CONSTRUCTION_STAGES.length;
    const cp = this.checkpoints.filter((c) => c.correct).length / total;
    const ord = this.checkpoints.filter((c) => c.inOrder).length / total;
    return Math.round((cp * RUBRIC.sequence.checkpointWeight + ord * RUBRIC.sequence.orderWeight) * 100);
  }

  monitoringScore(): number | null {
    if (!this.anomalies.length) return null;
    const detected = new Set(this.anomalies.filter((a) => a.correct).map((a) => a.paramId));
    // Only parameters that actually leave the normal band in the simulated run count as detectable anomalies.
    const eventual = MONITORING_PARAMS.filter((p) => Array.from({ length: SIM_TICKS + 1 }, (_, t) => alertState(p, valueAt(p, t))).some((a) => a !== 'normal')).length;
    const falseAlarms = this.anomalies.filter((a) => !a.correct).length;
    const raw = detected.size / Math.max(1, eventual) - falseAlarms * RUBRIC.monitoring.falseAlarmPenaltyEach;
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
  }

  overall(): number | null {
    const parts: Array<[number | null, number]> = [
      [this.sequenceScore(), RUBRIC.moduleWeights.sequence ?? 0.35],
      [this.monitoringScore(), RUBRIC.moduleWeights.monitoring ?? 0.25],
      [this.fireScore(), RUBRIC.moduleWeights.fire ?? 0.2],
      [this.floodingScore(), RUBRIC.moduleWeights.flood ?? 0.2],
    ];
    const used = parts.filter(([s]) => s !== null) as Array<[number, number]>;
    if (!used.length) return null;
    const w = used.reduce((a, [, x]) => a + x, 0);
    return Math.round(used.reduce((a, [s, x]) => a + s * x, 0) / w);
  }

  report() {
    const wrong: Array<{ stage: string; chosen: string; correctAnswer: string; explanation: string }> = this.checkpoints.filter((c) => !c.correct).map((c) => {
      const s = CONSTRUCTION_STAGES.find((x) => x.id === c.stageId)!;
      return { stage: `${s.id} ${s.title}`, chosen: s.checkpoint.options[c.chosen], correctAnswer: s.checkpoint.options[s.checkpoint.correctIndex], explanation: s.checkpoint.explanation };
    });

    this.scenarioDecisions.filter((d) => !d.correct).forEach((d) => {
      const sc = d.scenarioId === 'fire' ? FIRE_DECISION_SCENARIO : FLOODING_DECISION_SCENARIO;
      const dp = sc.decisionPoints.find((p) => p.id === d.decisionPointId);
      if (dp) {
        const correctOpt = dp.options.find((o) => o.isCorrect);
        wrong.push({
          stage: `${d.scenarioId === 'fire' ? 'FIRE' : 'FLOOD'} ${dp.id} ${dp.title}`,
          chosen: dp.options[d.chosenIndex]?.text ?? 'Unknown',
          correctAnswer: correctOpt?.text ?? 'Correct action',
          explanation: dp.explanation,
        });
      }
    });

    const topics = new Set<string>();
    this.checkpoints.filter((c) => !c.correct || !c.inOrder).forEach((c) => topics.add(REVISION_TOPICS[c.stageId]));
    if (this.anomalies.some((a) => !a.correct)) topics.add(REVISION_TOPICS['MON-ANOMALY']);
    this.scenarioDecisions.filter((d) => !d.correct || !d.inOrder).forEach((d) => {
      if (REVISION_TOPICS[d.decisionPointId]) topics.add(REVISION_TOPICS[d.decisionPointId]);
    });

    return {
      note: `${DISCLAIMER_SIMULATED} Scores reflect training exercises only.`,
      role: this.role, startedAt: this.startedAt, generatedAt: new Date().toISOString(),
      overallScore: this.overall(),
      modules: {
        constructionSequence: this.sequenceScore(),
        monitoring: this.monitoringScore(),
        fireScenario: this.fireScore(),
        floodingScenario: this.floodingScore(),
      },
      stagesCompleted: `${this.checkpoints.length}/${CONSTRUCTION_STAGES.length}`,
      stagesOutOfOrder: this.checkpoints.filter((c) => !c.inOrder).map((c) => c.stageId),
      correctDecisions: this.checkpoints.filter((c) => c.correct).length + this.anomalies.filter((a) => a.correct).length + this.scenarioDecisions.filter((s) => s.correct).length,
      incorrectDecisions: wrong,
      falseAlarms: this.anomalies.filter((a) => !a.correct).map((a) => a.paramId),
      recommendedRevision: [...topics],
      checkpoints: this.checkpoints,
      anomalies: this.anomalies,
      scenarioDecisions: this.scenarioDecisions,
    };
  }

  exportJSON(): string { return JSON.stringify(this.report(), null, 2); }

  exportCSV(): string {
    const rows: string[][] = [['type', 'id', 'detail', 'correct', 'inOrder', 'tickOrSeq']];
    this.checkpoints.forEach((c) => rows.push(['checkpoint', c.stageId, `chosen=${c.chosen}`, String(c.correct), String(c.inOrder), String(c.seq)]));
    this.anomalies.forEach((a) => rows.push(['anomaly', a.paramId, `latency=${a.latencyTicks ?? ''}`, String(a.correct), '', String(a.tick)]));
    this.scenarioDecisions.forEach((s) => rows.push(['scenario', `${s.scenarioId}:${s.decisionPointId}`, `chosen=${s.chosenIndex};rt=${s.responseTimeMs}ms`, String(s.correct), String(s.inOrder), String(s.seq)]));
    return rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export const session = new TrainingSession();

