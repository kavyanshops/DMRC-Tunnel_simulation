import { clear, h } from '../ui';
import { session } from '../assessment/session';
import { DISCLAIMER_FRAMEWORK } from '../data/constants';
import type { DecisionScenario } from '../data/types';
import { fireScenarioSchematic, floodingScenarioSchematic } from './scenarioSchematic';

export class DecisionScenarioTrainer {
  readonly el = h('div', { class: 'sc-wrap' });
  private currentStepIndex = 0;
  private stepStartTime = Date.now();
  private timerInterval: any = null;
  private isDebrief = false;
  private elapsedSeconds = 0;

  constructor(
    private scenario: DecisionScenario,
    private onNavigate?: (view: string) => void,
  ) {
    // Check if session already has completed decisions for this scenario
    const prior = session.scenarioDecisions.filter((s) => s.scenarioId === this.scenario.id);
    if (prior.length >= this.scenario.decisionPoints.length) {
      this.isDebrief = true;
    } else if (prior.length > 0) {
      this.currentStepIndex = prior.length;
    }
    this.render();
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startTimer() {
    this.stop();
    this.stepStartTime = Date.now();
    this.elapsedSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.round((Date.now() - this.stepStartTime) / 1000);
      const timerEl = this.el.querySelector('.sc-timer');
      if (timerEl) timerEl.textContent = `Elapsed: ${this.elapsedSeconds}s`;
    }, 1000);
  }

  private render() {
    this.stop();
    clear(this.el);

    if (this.isDebrief) {
      this.el.append(this.renderDebrief());
      return;
    }

    const dp = this.scenario.decisionPoints[this.currentStepIndex];
    const priorDecisions = session.scenarioDecisions.filter((s) => s.scenarioId === this.scenario.id);
    const existingRec = priorDecisions.find((s) => s.decisionPointId === dp.id);

    // 1. Header
    const head = h('div', { class: 'sc-head' });
    const topRow = h('div', { class: 'sc-head-top' });
    topRow.append(
      h('div', {},
        h('h2', {}, this.scenario.title),
        h('p', { class: 't-muted' }, this.scenario.summary),
      ),
      h('button', { class: 't-btn t-btn-ghost t-btn-small' }, 'Restart Scenario')
    );
    topRow.querySelector('button')!.addEventListener('click', () => {
      session.resetScenario(this.scenario.id);
      this.currentStepIndex = 0;
      this.isDebrief = false;
      this.render();
    });

    const initConds = h('div', { class: 'sc-init-conds' },
      h('span', { class: 'sc-cond-tag' }, `Location: ${this.scenario.initialConditions.location}`),
      h('span', { class: 'sc-cond-tag' }, `Elevation: ${this.scenario.initialConditions.level}`),
      h('span', { class: 'sc-cond-tag sc-cond-warn' }, `Severity: ${this.scenario.initialConditions.severity}`),
    );

    // Step progression buttons (1 to 5)
    const stepNav = h('div', { class: 'sc-step-nav' });
    this.scenario.decisionPoints.forEach((p, idx) => {
      const rec = priorDecisions.find((d) => d.decisionPointId === p.id);
      const isDone = !!rec;
      const isCurrent = idx === this.currentStepIndex;
      const btn = h('button', {
        class: `sc-step-btn${isCurrent ? ' active' : ''}${isDone ? (rec?.correct ? ' done-ok' : ' done-bad') : ''}`,
        title: p.title,
      }, `Step ${idx + 1}`);

      // Allow clicking previously answered steps or the current step
      if (idx <= priorDecisions.length) {
        btn.addEventListener('click', () => {
          this.currentStepIndex = idx;
          this.render();
        });
      } else {
        btn.setAttribute('disabled', 'true');
      }
      stepNav.append(btn);
    });

    head.append(topRow, initConds, stepNav);

    // 2. SVG Schematic Section
    const visual = h('div', { class: 'sc-visual' });
    const svgStr = this.scenario.id === 'fire'
      ? fireScenarioSchematic(dp.stepNumber)
      : floodingScenarioSchematic(dp.stepNumber);
    visual.innerHTML = svgStr;

    // 3. Telemetry Bar (SIMULATED)
    const telem = h('div', { class: 'sc-telemetry-bar' });
    telem.append(h('div', { class: 'sc-telem-head' },
      h('span', { class: 't-badge t-badge-simulated' }, 'SIMULATED'),
      h('span', { class: 't-muted' }, 'Live simulated sensor feed for current decision point'),
    ));
    const telemGrid = h('div', { class: 'sc-telem-grid' });
    for (const [key, val] of Object.entries(dp.telemetry)) {
      telemGrid.append(h('div', { class: 'sc-telem-card' },
        h('span', { class: 'sc-telem-label' }, key),
        h('strong', { class: 'sc-telem-value' }, String(val)),
      ));
    }
    telem.append(telemGrid);

    // 4. Decision Point & Options
    const dpPanel = h('div', { class: 'sc-dp-panel' });
    const dpTop = h('div', { class: 'sc-dp-top' });
    const timerSpan = h('span', { class: 'sc-timer' }, existingRec ? `Response time: ${Math.round(existingRec.responseTimeMs / 1000)}s` : 'Elapsed: 0s');
    dpTop.append(
      h('div', {},
        h('span', { class: 't-badge t-badge-provisional' }, `STEP ${dp.stepNumber} OF 5`),
        h('h3', {}, dp.title),
        h('span', { class: 't-muted' }, `Affected zone: ${dp.affectedZone}`),
      ),
      timerSpan
    );

    const situ = h('p', { class: 'sc-situation' }, dp.situation);
    const optionsWrap = h('div', { class: 'sc-options' });

    dp.options.forEach((opt, idx) => {
      const isChosen = existingRec?.chosenIndex === idx;
      let optClass = 'sc-opt-btn';
      if (existingRec) {
        if (isChosen) {
          optClass += opt.isCorrect ? ' opt-correct' : ' opt-incorrect';
        } else if (opt.isCorrect) {
          optClass += ' opt-reveal-correct';
        }
      }

      const optBtn = h('button', { class: optClass },
        h('span', { class: 'sc-opt-letter' }, String.fromCharCode(65 + idx)),
        h('span', { class: 'sc-opt-text' }, opt.text)
      );

      if (existingRec) {
        optBtn.setAttribute('disabled', 'true');
      } else {
        optBtn.addEventListener('click', () => {
          this.stop();
          const rt = Math.max(1000, Date.now() - this.stepStartTime);
          session.answerScenarioDecision(this.scenario.id, dp.id, idx, rt);
          this.render();
        });
      }
      optionsWrap.append(optBtn);
    });

    dpPanel.append(dpTop, situ, optionsWrap);

    // If answered, show feedback & consequence box, and next button
    if (existingRec) {
      const chosenOpt = dp.options[existingRec.chosenIndex];
      const feedbackBox = h('div', { class: `sc-feedback ${existingRec.correct ? 'fb-ok' : 'fb-bad'}` });
      feedbackBox.append(
        h('h4', {}, existingRec.correct ? '✓ Decision Verified — Safe Outcome' : '⚠ Critical Safety Violation — Negative Escalation'),
        h('p', { class: 'sc-consequence' }, h('strong', {}, 'Immediate Consequence: '), chosenOpt?.consequences || ''),
        h('p', { class: 'sc-expl' }, h('strong', {}, 'Engineering Analysis: '), chosenOpt?.feedback || '', ' ', dp.explanation),
      );

      const nextRow = h('div', { class: 'sc-next-row' });
      if (this.currentStepIndex < this.scenario.decisionPoints.length - 1) {
        const nextBtn = h('button', { class: 't-btn' }, `Proceed to Decision Point ${this.currentStepIndex + 2} →`);
        nextBtn.addEventListener('click', () => {
          this.currentStepIndex++;
          this.render();
        });
        nextRow.append(nextBtn);
      } else {
        const debriefBtn = h('button', { class: 't-btn' }, 'View Scenario Debrief & Assessment →');
        debriefBtn.addEventListener('click', () => {
          this.isDebrief = true;
          this.render();
        });
        nextRow.append(debriefBtn);
      }
      dpPanel.append(feedbackBox, nextRow);
    }

    // 5. Incident Chronological Event Log
    const eventLog = h('div', { class: 'sc-event-log' });
    eventLog.append(h('h4', {}, 'Incident Event Log'));
    if (priorDecisions.length === 0) {
      eventLog.append(h('p', { class: 't-muted' }, 'No decisions recorded yet. Select an action above to start the incident response.'));
    } else {
      const list = h('div', { class: 'sc-log-list' });
      priorDecisions.forEach((d) => {
        const p = this.scenario.decisionPoints.find((x) => x.id === d.decisionPointId);
        if (!p) return;
        const opt = p.options[d.chosenIndex];
        list.append(h('div', { class: `sc-log-item ${d.correct ? 'log-ok' : 'log-bad'}` },
          h('span', { class: 'sc-log-step' }, `Step ${p.stepNumber}`),
          h('span', { class: 'sc-log-title' }, p.title),
          h('span', { class: 'sc-log-action' }, opt?.text || ''),
          h('span', { class: 'sc-log-rt' }, `${Math.round(d.responseTimeMs / 1000)}s`),
          h('span', { class: 'sc-log-status' }, d.correct ? '✓ Verified' : '✗ Error')
        ));
      });
      eventLog.append(list);
    }

    this.el.append(head, visual, telem, dpPanel, eventLog);

    if (!existingRec) {
      this.startTimer();
    }
  }

  private renderDebrief(): HTMLElement {
    const wrap = h('section', { class: 't-panel sc-debrief-wrap' });
    const score = session.scenarioScore(this.scenario.id) ?? 0;
    const decisions = session.scenarioDecisions.filter((s) => s.scenarioId === this.scenario.id);
    const correctCount = decisions.filter((d) => d.correct).length;
    const totalCount = this.scenario.decisionPoints.length;
    const isPass = correctCount >= 4;

    wrap.append(
      h('div', { class: 'sc-debrief-head' },
        h('h2', {}, `Scenario Debrief — ${this.scenario.title}`),
        h('p', { class: 't-warn' }, DISCLAIMER_FRAMEWORK),
      ),
      h('div', { class: 't-scores' },
        h('div', {}, h('strong', {}, `${score}/100`), h('span', {}, 'Scenario Score')),
        h('div', {}, h('strong', {}, `${correctCount} / ${totalCount}`), h('span', {}, 'Decisions Verified')),
        h('div', {}, h('strong', { class: isPass ? 't-ok' : 't-bad' }, isPass ? 'PASSED' : 'REVISION NEEDED'), h('span', {}, 'Outcome Status')),
      )
    );

    // Detailed audit table
    const table = h('div', { class: 'sc-audit-list' });
    this.scenario.decisionPoints.forEach((dp) => {
      const rec = decisions.find((d) => d.decisionPointId === dp.id);
      const chosen = rec !== undefined ? dp.options[rec.chosenIndex] : null;
      const correctOpt = dp.options.find((o) => o.isCorrect);

      const item = h('div', { class: `sc-audit-item ${rec?.correct ? 'audit-ok' : 'audit-bad'}` },
        h('div', { class: 'sc-audit-top' },
          h('h4', {}, `Step ${dp.stepNumber}: ${dp.title}`),
          h('span', { class: `t-badge ${rec?.correct ? 't-badge-verified' : 't-badge-simulated'}` }, rec?.correct ? 'VERIFIED' : 'CRITICAL ERROR'),
        ),
        h('p', {}, h('strong', {}, 'Your Decision: '), chosen?.text ?? 'Not attempted'),
        rec?.correct ? null : h('p', { class: 't-ok' }, h('strong', {}, 'Required Correct Action: '), correctOpt?.text ?? ''),
        h('p', { class: 't-muted' }, h('strong', {}, 'Consequence: '), chosen?.consequences ?? ''),
        h('p', { class: 't-muted' }, h('strong', {}, 'Technical Basis: '), dp.explanation),
      );
      table.append(item);
    });

    wrap.append(h('h3', {}, 'Decision-by-Decision Assessment'), table);

    // Action buttons
    const actions = h('div', { class: 't-actions' });
    const retake = h('button', { class: 't-btn' }, 'Retake Scenario');
    retake.addEventListener('click', () => {
      session.resetScenario(this.scenario.id);
      this.currentStepIndex = 0;
      this.isDebrief = false;
      this.render();
    });

    const report = h('button', { class: 't-btn t-btn-ghost' }, 'View Full Session Report');
    report.addEventListener('click', () => {
      if (this.onNavigate) this.onNavigate('report');
    });

    const hub = h('button', { class: 't-btn t-btn-ghost' }, 'Return to Training Hub');
    hub.addEventListener('click', () => {
      if (this.onNavigate) this.onNavigate('hub');
    });

    actions.append(retake, report, hub);
    wrap.append(actions);

    return wrap;
  }
}
