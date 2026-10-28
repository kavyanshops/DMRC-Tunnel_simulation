// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { CONSTRUCTION_STAGES } from '../data/constructionSequence';
import { MONITORING_PARAMS, SIM_TICKS, alertState } from '../data/monitoringThresholds';
import { LEARNING_OBJECTIVES } from '../data/learningObjectives';
import { FIRE_DECISION_SCENARIO } from '../data/fireDecisionScenario';
import { FLOODING_DECISION_SCENARIO } from '../data/floodingDecisionScenario';
import { valueAt, seriesUpTo } from '../monitoring/simulation';
import { TrainingSession } from '../assessment/session';

describe('data integrity', () => {
  it('has 12 ordered stages with unique ids and valid dependencies', () => {
    expect(CONSTRUCTION_STAGES).toHaveLength(12);
    const ids = new Set(CONSTRUCTION_STAGES.map((s) => s.id));
    expect(ids.size).toBe(12);
    CONSTRUCTION_STAGES.forEach((s, i) => {
      expect(s.order).toBe(i + 1);
      s.dependsOn.forEach((d) => { expect(ids.has(d)).toBe(true); expect(CONSTRUCTION_STAGES.find((x) => x.id === d)!.order).toBeLessThan(s.order); });
      expect(s.checkpoint.correctIndex).toBeGreaterThanOrEqual(0);
      expect(s.checkpoint.correctIndex).toBeLessThan(s.checkpoint.options.length);
      expect(s.objectiveIds.length).toBeGreaterThan(0);
      expect(s.confidence).toMatch(/Verified|Provisional|Assumed/);
    });
  });
  it('links stages, parameters and objectives consistently', () => {
    const params = new Set(MONITORING_PARAMS.map((p) => p.id));
    const objs = new Set(LEARNING_OBJECTIVES.map((o) => o.id));
    CONSTRUCTION_STAGES.forEach((s) => { s.monitoringParamIds.forEach((id) => expect(params.has(id)).toBe(true)); s.objectiveIds.forEach((id) => expect(objs.has(id)).toBe(true)); });
    MONITORING_PARAMS.forEach((p) => p.linkedStageIds.forEach((id) => expect(CONSTRUCTION_STAGES.some((s) => s.id === id)).toBe(true)));
    LEARNING_OBJECTIVES.forEach((o) => { expect(o.description.length).toBeGreaterThan(10); expect(o.assessment).toBeTruthy(); });
  });
  it('keeps threshold ordering sane for every parameter', () => {
    MONITORING_PARAMS.forEach((p) => {
      if (p.worse === 'higher') { expect(p.normalMax).toBeLessThan(p.warning); expect(p.warning).toBeLessThan(p.critical); }
      else { expect(p.normalMax).toBeGreaterThan(p.warning); expect(p.warning).toBeGreaterThan(p.critical); }
      expect(p.confidence).toBe('Assumed');
    });
  });
  it('has exactly 5 ordered decision points for fire and flooding scenarios with valid options', () => {
    [FIRE_DECISION_SCENARIO, FLOODING_DECISION_SCENARIO].forEach((sc) => {
      expect(sc.decisionPoints).toHaveLength(5);
      sc.decisionPoints.forEach((dp, i) => {
        expect(dp.stepNumber).toBe(i + 1);
        expect(dp.options.length).toBeGreaterThanOrEqual(3);
        const correctCount = dp.options.filter((o) => o.isCorrect).length;
        expect(correctCount).toBe(1);
        expect(Object.keys(dp.telemetry).length).toBeGreaterThanOrEqual(3);
        expect(dp.situation.length).toBeGreaterThan(20);
        expect(dp.explanation.length).toBeGreaterThan(20);
        expect(dp.learningObjectiveId).toBeTruthy();
      });
    });
  });
});

describe('simulation determinism', () => {
  it('returns identical series on every run', () => {
    MONITORING_PARAMS.forEach((p) => {
      expect(seriesUpTo(p, SIM_TICKS)).toEqual(seriesUpTo(p, SIM_TICKS));
      expect(valueAt(p, 57)).toBe(valueAt(p, 57));
    });
  });
  it('starts normal everywhere and the planned anomalies are reachable', () => {
    MONITORING_PARAMS.forEach((p) => expect(alertState(p, valueAt(p, 0))).toBe('normal'));
    const reaches = (id: string) => { const p = MONITORING_PARAMS.find((x) => x.id === id)!; return Array.from({ length: SIM_TICKS + 1 }, (_, t) => alertState(p, valueAt(p, t))).some((a) => a !== 'normal'); };
    ['MON-SETTLE', 'MON-GW', 'MON-GROUT', 'MON-TBM'].forEach((id) => expect(reaches(id)).toBe(true));
    ['MON-TILT', 'MON-CONV'].forEach((id) => expect(reaches(id)).toBe(false)); // intentional distractors
  });
});

describe('scoring', () => {
  let s: TrainingSession;
  beforeEach(() => { s = new TrainingSession(); });
  it('scores perfect in-order run at 100 for sequence', () => {
    CONSTRUCTION_STAGES.forEach((st) => s.answerCheckpoint(st.id, st.checkpoint.correctIndex));
    expect(s.sequenceScore()).toBe(100);
    expect(s.report().incorrectDecisions).toHaveLength(0);
  });
  it('records out-of-order and wrong answers with explanations and revision topics', () => {
    const last = CONSTRUCTION_STAGES[11];
    const rec = s.answerCheckpoint(last.id, (last.checkpoint.correctIndex + 1) % last.checkpoint.options.length)!;
    expect(rec.inOrder).toBe(false); expect(rec.correct).toBe(false);
    const r = s.report();
    expect(r.incorrectDecisions[0].explanation).toBeTruthy();
    expect(r.recommendedRevision.length).toBeGreaterThan(0);
    expect(r.stagesOutOfOrder).toContain('CS-12');
  });
  it('ignores a second answer to the same checkpoint', () => {
    s.answerCheckpoint('CS-01', 0); expect(s.answerCheckpoint('CS-01', 1)).toBeNull(); expect(s.checkpoints).toHaveLength(1);
  });
  it('penalises false alarms and exports valid JSON/CSV', () => {
    s.flagAnomaly('MON-SETTLE', 5, false, null);
    expect(s.monitoringScore()).toBe(0);
    s.flagAnomaly('MON-SETTLE', 100, true, 80);
    expect(s.anomalies[1].latencyTicks).toBe(20);
    expect(JSON.parse(s.exportJSON()).note).toContain('SIMULATED');
    expect(s.exportCSV().split('\n')[0]).toContain('type');
  });
  it('scores scenario decisions accurately and includes scenario records in reports', () => {
    FIRE_DECISION_SCENARIO.decisionPoints.forEach((dp) => {
      const correctIdx = dp.options.findIndex((o) => o.isCorrect);
      s.answerScenarioDecision('fire', dp.id, correctIdx, 5000);
    });
    expect(s.fireScore()).toBe(100);
    expect(s.floodingScore()).toBeNull();

    // Answer flood scenario with 1 mistake
    FLOODING_DECISION_SCENARIO.decisionPoints.forEach((dp, idx) => {
      const chosen = idx === 0 ? dp.options.findIndex((o) => !o.isCorrect) : dp.options.findIndex((o) => o.isCorrect);
      s.answerScenarioDecision('flood', dp.id, chosen, 4000);
    });
    expect(s.floodingScore()).toBeLessThan(100);
    const r = s.report();
    expect(r.modules.fireScenario).toBe(100);
    expect(r.modules.floodingScenario).toBe(s.floodingScore());
    expect(r.incorrectDecisions.some((d) => d.stage.includes('FLOOD'))).toBe(true);
    expect(r.recommendedRevision).toContain('Sudden groundwater inflow detection and sump pump staging');
    expect(s.exportCSV()).toContain('scenario');
  });
  it('is the same function of the same event log (deterministic)', () => {
    const a = new TrainingSession(), b = new TrainingSession();
    [a, b].forEach((x) => {
      x.answerCheckpoint('CS-01', 1);
      x.answerCheckpoint('CS-02', 1);
      x.flagAnomaly('MON-GW', 90, true, 85);
      x.answerScenarioDecision('fire', 'FIRE-DP-01', 0, 3000);
    });
    expect(a.overall()).toBe(b.overall());
  });
});

describe('UI flow (jsdom)', () => {
  it('role select -> sequence checkpoint -> monitoring -> fire scenario -> report', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { openTraining, closeTraining } = await import('../TrainingApp');
    const { session } = await import('../assessment/session');
    const host = document.getElementById('app')!;
    openTraining(host);
    const root = document.getElementById('training-root')!;
    expect(root.textContent).toContain('Choose your role');
    (Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Site Engineer') ?? (Array.from(root.querySelectorAll('.t-card'))[1] as HTMLElement)).dispatchEvent(new Event('click'));

    // Sequence module
    (Array.from(root.querySelectorAll('.t-card')).find((c) => c.textContent?.includes('Construction Sequence')) as HTMLElement).click();
    expect(root.textContent).toContain('Stage 1: Geotechnical');
    expect(root.querySelectorAll('.cs-node')).toHaveLength(12);
    (root.querySelectorAll('.cs-options input')[1] as HTMLInputElement).dispatchEvent(new Event('change'));
    (Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Submit answer') as HTMLElement).click();
    expect(session.checkpoints).toHaveLength(1);
    expect(root.textContent).toContain('Correct.');

    // Monitoring module
    (Array.from(root.querySelectorAll('.t-tab')).find((t) => t.textContent === 'Site Monitoring') as HTMLElement).click();
    expect(root.textContent).toContain('SIMULATED — not real telemetry.');
    expect(root.querySelectorAll('.mon-card')).toHaveLength(6);
    (root.querySelector('.mon-actions button') as HTMLElement).click();
    expect(session.anomalies).toHaveLength(1);

    // Fire decision scenario module
    (Array.from(root.querySelectorAll('.t-tab')).find((t) => t.textContent?.includes('Fire — Decision Training')) as HTMLElement).click();
    expect(root.textContent).toContain('Fire Emergency — Decision Training');
    expect(root.textContent).toContain('STEP 1 OF 5');
    expect(root.querySelectorAll('.sc-telem-card').length).toBeGreaterThanOrEqual(3);
    const optButtons = root.querySelectorAll('.sc-opt-btn');
    expect(optButtons.length).toBeGreaterThanOrEqual(3);
    (optButtons[0] as HTMLElement).click();
    expect(session.scenarioDecisions.length).toBeGreaterThanOrEqual(1);
    expect(root.textContent).toContain('Immediate Consequence:');

    // Report
    (Array.from(root.querySelectorAll('.t-tab')).find((t) => t.textContent === 'Report') as HTMLElement).click();
    expect(root.textContent).toContain('Session Report');
    closeTraining();
    expect(root.style.display).toBe('none');
  });
});

