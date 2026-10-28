import './training.css';
import { ConstructionTrainer } from './constructionSequence/ConstructionTrainer';
import { MonitoringDashboard } from './monitoring/MonitoringDashboard';
import { DecisionScenarioTrainer } from './scenarios/DecisionScenarioTrainer';
import { FIRE_DECISION_SCENARIO } from './data/fireDecisionScenario';
import { FLOODING_DECISION_SCENARIO } from './data/floodingDecisionScenario';
import { ROLES, roleById } from './roles/roles';
import { session } from './assessment/session';
import { DISCLAIMER_SIMULATED } from './data/constants';
import { CONSTRUCTION_STAGES } from './data/constructionSequence';
import { clear, download, h } from './ui';

type View = 'hub' | 'sequence' | 'monitoring' | 'fire' | 'flood' | 'report';

const TABS: Array<{ id: View; label: string }> = [
  { id: 'hub', label: 'Training Hub' }, { id: 'sequence', label: 'Construction Sequence' }, { id: 'monitoring', label: 'Site Monitoring' },
  { id: 'fire', label: 'Fire — Decision Training' }, { id: 'flood', label: 'Water Ingress — Decision Training' }, { id: 'report', label: 'Report' },
];

class TrainingApp {
  readonly root = h('div', { id: 'training-root', role: 'region', 'aria-label': 'Construction Training' });
  private body = h('div', { class: 't-body' });
  private tabsEl = h('nav', { class: 't-tabs', 'aria-label': 'Training modules' });
  private view: View = 'hub';
  private sequence = new ConstructionTrainer((paramId) => { this.show('monitoring'); this.monitoring.focus(paramId); });
  private monitoring = new MonitoringDashboard((stageId) => { this.show('sequence'); this.sequence.openStage(stageId); });
  private fireTrainer = new DecisionScenarioTrainer(FIRE_DECISION_SCENARIO, (v) => this.show(v as View));
  private floodTrainer = new DecisionScenarioTrainer(FLOODING_DECISION_SCENARIO, (v) => this.show(v as View));

  constructor() {
    this.root.append(this.tabsEl, this.body);
    session.subscribe(() => { if (this.view === 'report' || this.view === 'hub') this.renderBody(); });
    this.render();
  }

  show(v: View) {
    if (this.view === 'monitoring' && v !== 'monitoring') this.monitoring.stop();
    if (this.view === 'fire' && v !== 'fire') this.fireTrainer.stop();
    if (this.view === 'flood' && v !== 'flood') this.floodTrainer.stop();
    this.view = v;
    this.render();
  }

  private render() {
    clear(this.tabsEl);
    const back = h('button', { class: 't-btn t-btn-ghost' }, '← Portal');
    back.addEventListener('click', () => { location.hash = ''; });
    this.tabsEl.append(back);
    TABS.forEach((t) => {
      const b = h('button', { class: `t-tab${this.view === t.id ? ' active' : ''}` }, t.label);
      b.addEventListener('click', () => this.show(t.id));
      this.tabsEl.append(b);
    });
    if (session.role) this.tabsEl.append(h('span', { class: 't-role' }, roleById(session.role).label));
    this.renderBody();
  }

  private renderBody() {
    clear(this.body);
    if (!session.role && this.view !== 'hub') this.view = 'hub';
    switch (this.view) {
      case 'hub': this.body.append(session.role ? this.hub() : this.roleSelect()); break;
      case 'sequence': this.body.append(this.sequence.el); break;
      case 'monitoring': this.body.append(this.monitoring.el); break;
      case 'fire': this.body.append(this.fireTrainer.el); break;
      case 'flood': this.body.append(this.floodTrainer.el); break;
      case 'report': this.body.append(this.report()); break;
    }
  }

  private roleSelect(): HTMLElement {
    const wrap = h('section', { class: 't-panel' }, h('h2', {}, 'Choose your role'), h('p', { class: 't-muted' }, 'Your role changes the recommended modules, checklist priorities, scenario emphasis and assessment focus.'));
    const grid = h('div', { class: 't-cards' });
    ROLES.forEach((r) => {
      const c = h('button', { class: 't-card' }, h('h3', {}, r.label), h('p', {}, r.blurb), h('span', { class: 't-muted' }, `Assessment focus: ${r.assessmentFocus}`));
      c.addEventListener('click', () => { session.setRole(r.id); this.render(); });
      grid.append(c);
    });
    wrap.append(grid);
    return wrap;
  }

  private hub(): HTMLElement {
    const role = roleById(session.role!);
    const wrap = h('section', { class: 't-panel' });
    const change = h('button', { class: 't-btn t-btn-ghost t-btn-small' }, 'Change role');
    change.addEventListener('click', () => { session.role = null; this.render(); });
    wrap.append(h('div', { class: 't-panel-head' }, h('h2', {}, 'Training Hub'), h('p', { class: 't-muted' }, `Role: ${role.label}. Scenario emphasis: ${role.scenarioEmphasis}`), change));
    const mods: Array<{ id: View; key: 'sequence' | 'monitoring' | 'fire' | 'flood'; title: string; desc: string; ready: boolean }> = [
      { id: 'sequence', key: 'sequence', title: 'Construction Sequence Trainer', desc: '12-stage interactive timeline with checkpoints.', ready: true },
      { id: 'monitoring', key: 'monitoring', title: 'Monitoring Dashboard', desc: 'Simulated trends, thresholds and alert states.', ready: true },
      { id: 'fire', key: 'fire', title: 'Fire Emergency — Decision Training', desc: '5 decision points: evacuation, ventilation, cross-passage, traction earthing & purge.', ready: true },
      { id: 'flood', key: 'flood', title: 'Water Ingress — Decision Training', desc: '5 decision points: inflow triage, fines wash-out, rail submergence, chemical grouting & resumption.', ready: true },
    ];
    const grid = h('div', { class: 't-cards' });
    mods.forEach((m) => {
      const rank = role.recommended.indexOf(m.key);
      const card = h('button', { class: 't-card' },
        h('div', { class: 't-card-top' }, h('h3', {}, m.title), rank >= 0 && rank < 2 ? h('span', { class: 't-badge t-badge-provisional' }, 'RECOMMENDED') : null),
        h('p', {}, m.desc));
      card.addEventListener('click', () => this.show(m.id));
      grid.append(card);
    });
    wrap.append(grid, h('h3', {}, `Checklist — ${role.label}`), h('ul', { class: 't-checklist' }, ...role.checklist.map((c) => h('li', {}, c))),
      h('p', { class: 't-muted' }, `Progress: ${session.checkpoints.length}/${CONSTRUCTION_STAGES.length} stages answered · ${session.anomalies.length} anomaly flags · ${session.scenarioDecisions.length} scenario decisions. ${DISCLAIMER_SIMULATED}`));
    return wrap;
  }

  private report(): HTMLElement {
    const r = session.report();
    const wrap = h('section', { class: 't-panel' }, h('h2', {}, 'Session Report'), h('p', { class: 't-sim' }, r.note));
    const fmt = (n: number | null) => (n === null ? 'not attempted' : `${n}/100`);
    wrap.append(
      h('div', { class: 't-scores' },
        h('div', {}, h('strong', {}, fmt(r.overallScore)), h('span', {}, 'Overall')),
        h('div', {}, h('strong', {}, fmt(r.modules.constructionSequence)), h('span', {}, 'Construction sequence')),
        h('div', {}, h('strong', {}, fmt(r.modules.monitoring)), h('span', {}, 'Monitoring')),
        h('div', {}, h('strong', {}, fmt(r.modules.fireScenario)), h('span', {}, 'Fire decisions')),
        h('div', {}, h('strong', {}, fmt(r.modules.floodingScenario)), h('span', {}, 'Water ingress decisions'))),
      h('p', {}, `Stages answered: ${r.stagesCompleted}. Correct decisions: ${r.correctDecisions}. Out-of-order stages: ${r.stagesOutOfOrder.join(', ') || 'none'}.`),
      h('h3', {}, 'Incorrect answers'),
      r.incorrectDecisions.length ? h('ul', {}, ...r.incorrectDecisions.map((w) => h('li', {}, `${w.stage} — you chose "${w.chosen}". Correct: "${w.correctAnswer}". ${w.explanation}`))) : h('p', { class: 't-muted' }, 'None recorded.'),
      h('h3', {}, 'Recommended revision'),
      r.recommendedRevision.length ? h('ul', {}, ...r.recommendedRevision.map((t) => h('li', {}, t))) : h('p', { class: 't-muted' }, 'No revision topics yet.'),
    );
    const j = h('button', { class: 't-btn' }, 'Export JSON'); j.addEventListener('click', () => download('sadar-bazar-training-report.json', session.exportJSON(), 'application/json'));
    const c = h('button', { class: 't-btn' }, 'Export CSV'); c.addEventListener('click', () => download('sadar-bazar-training-report.csv', session.exportCSV(), 'text/csv'));
    wrap.append(h('div', { class: 't-actions' }, j, c));
    return wrap;
  }
}

let app: TrainingApp | null = null;

export function openTraining(host: HTMLElement) {
  if (!app) { app = new TrainingApp(); host.append(app.root); }
  app.root.style.display = 'block';
}

export function closeTraining() {
  if (app) { app.show('hub'); app.root.style.display = 'none'; }
}

