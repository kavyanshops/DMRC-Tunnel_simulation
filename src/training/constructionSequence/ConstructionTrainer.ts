import { CONSTRUCTION_STAGES } from '../data/constructionSequence';
import { objectivesForAsset } from '../data/learningObjectives';
import { MONITORING_PARAMS } from '../data/monitoringThresholds';
import { ASSUMED_NOTE } from '../data/constants';
import { session } from '../assessment/session';
import { clear, confidenceBadge, h } from '../ui';
import { stageSchematic, ZONE_COLOURS } from './schematic';

export class ConstructionTrainer {
  readonly el = h('section', { class: 't-panel', 'aria-label': 'Construction Sequence Trainer' });
  private index = 0;
  private unsub: () => void;

  constructor(private onOpenMonitoring: (paramId: string) => void) {
    this.unsub = session.subscribe(() => this.renderTimeline());
    this.render();
  }

  destroy() { this.unsub(); }

  openStage(stageId: string) {
    const i = CONSTRUCTION_STAGES.findIndex((s) => s.id === stageId);
    if (i < 0) return;
    this.index = i; this.scrub.value = String(i + 1); this.renderTimeline(); this.renderDetail();
  }

  private timelineHost = h('div', { class: 'cs-timeline' });
  private detailHost = h('div', { class: 'cs-detail' });

  private render() {
    clear(this.el);
    const total = CONSTRUCTION_STAGES.length;
    const slider = h('input', { type: 'range', min: '1', max: String(total), value: String(this.index + 1), class: 'cs-scrub', 'aria-label': 'Scrub construction timeline' }) as HTMLInputElement;
    slider.addEventListener('input', () => { this.index = parseInt(slider.value, 10) - 1; this.renderTimeline(); this.renderDetail(); });
    this.scrub = slider;
    this.el.append(
      h('div', { class: 't-panel-head' }, h('h2', {}, 'Construction Sequence Trainer'), h('p', { class: 't-muted' }, 'Work through the 12 stages in order. Scrub the timeline, read the stage, then answer the checkpoint. Dependencies are shown, and out-of-order completion is recorded.')),
      this.timelineHost, slider, this.detailHost,
    );
    this.renderTimeline();
    this.renderDetail();
  }

  private scrub!: HTMLInputElement;

  private renderTimeline() {
    clear(this.timelineHost);
    CONSTRUCTION_STAGES.forEach((s, i) => {
      const rec = session.checkpoints.find((c) => c.stageId === s.id);
      const cls = ['cs-node', i === this.index ? 'is-current' : '', rec ? (rec.correct ? 'is-done' : 'is-wrong') : ''].join(' ');
      const btn = h('button', { class: cls, title: s.title, 'aria-label': `Stage ${s.order}: ${s.title}`, style: `--zone:${ZONE_COLOURS[s.zone]}` }, String(s.order));
      btn.addEventListener('click', () => { this.index = i; this.scrub.value = String(i + 1); this.renderTimeline(); this.renderDetail(); });
      this.timelineHost.append(btn);
    });
    this.timelineHost.append(h('span', { class: 't-muted cs-progress' }, `${session.checkpoints.length}/${CONSTRUCTION_STAGES.length} checkpoints answered`));
  }

  private list(items: string[]) { return h('ul', {}, ...items.map((i) => h('li', {}, i))); }
  private field(label: string, body: Node | string) { return h('div', { class: 'cs-field' }, h('h4', {}, label), typeof body === 'string' ? h('p', {}, body) : body); }

  private renderDetail() {
    clear(this.detailHost);
    const s = CONSTRUCTION_STAGES[this.index];
    const done = new Set(session.completedStageIds());
    const missing = s.dependsOn.filter((d) => !done.has(d));

    const visual = h('div', { class: 'cs-visual' });
    visual.innerHTML = stageSchematic(s.order, s.zone);

    const links = h('div', { class: 'cs-links' },
      ...s.monitoringParamIds.map((id) => {
        const p = MONITORING_PARAMS.find((x) => x.id === id)!;
        const b = h('button', { class: 't-chip' }, `View ${p.label}`);
        b.addEventListener('click', () => this.onOpenMonitoring(id));
        return b;
      }),
    );

    const info = h('div', { class: 'cs-info' },
      h('div', { class: 'cs-title-row' },
        h('h3', {}, `Stage ${s.order}: ${s.title}`), confidenceBadge(s.confidence)),
      missing.length ? h('div', { class: 't-warn' }, `Prerequisites not completed: ${missing.join(', ')}. You can read this stage, but answering now is recorded as out of order.`) : null,
      s.dependsOn.length ? h('p', { class: 't-muted' }, `Depends on: ${s.dependsOn.join(', ')}`) : null,
      this.field('What happens', s.whatHappens),
      this.field('Why it is necessary', s.whyNecessary),
      this.field('Key equipment', this.list(s.equipment)),
      this.field('Key risks', this.list(s.risks)),
      this.field('Monitoring parameters', this.list(s.monitoring)),
      s.monitoringParamIds.length ? links : null,
      this.field('What can go wrong if skipped or done incorrectly', s.whatCanGoWrong),
      h('p', { class: 't-muted' }, `Source / confidence: ${s.source}.${s.confidence === 'Assumed' ? ' ' + ASSUMED_NOTE : ''}`),
      h('p', { class: 't-muted' }, `Learning objectives: ${s.objectiveIds.join(', ')} — ${objectivesForAsset(s.id).map((o) => o.assessment).join(', ')}`),
      this.checkpoint(s.id),
    );
    this.detailHost.append(visual, info);
  }

  private checkpoint(stageId: string): HTMLElement {
    const s = CONSTRUCTION_STAGES.find((x) => x.id === stageId)!;
    const box = h('div', { class: 'cs-checkpoint' }, h('h4', {}, 'Checkpoint'), h('p', {}, s.checkpoint.prompt));
    const existing = session.checkpoints.find((c) => c.stageId === stageId);
    const form = h('div', { class: 'cs-options' });
    let chosen = existing ? existing.chosen : -1;
    s.checkpoint.options.forEach((opt, i) => {
      const id = `opt-${stageId}-${i}`;
      const input = h('input', { type: 'radio', name: `q-${stageId}`, id }) as HTMLInputElement;
      if (existing) { input.disabled = true; input.checked = existing.chosen === i; }
      input.addEventListener('change', () => { chosen = i; submit.removeAttribute('disabled'); });
      const cls = existing ? (i === s.checkpoint.correctIndex ? 'is-correct' : existing.chosen === i ? 'is-incorrect' : '') : '';
      form.append(h('label', { for: id, class: cls }, input, ' ', opt));
    });
    const submit = h('button', { class: 't-btn', disabled: 'true' }, 'Submit answer');
    submit.addEventListener('click', () => { if (chosen >= 0) { session.answerCheckpoint(stageId, chosen); this.renderDetail(); } });
    box.append(form);
    if (existing) {
      box.append(h('p', { class: existing.correct ? 't-ok' : 't-bad' }, `${existing.correct ? 'Correct.' : 'Not quite.'} ${s.checkpoint.explanation}`));
      if (this.index < CONSTRUCTION_STAGES.length - 1) {
        const next = h('button', { class: 't-btn' }, 'Next stage');
        next.addEventListener('click', () => { this.index++; this.scrub.value = String(this.index + 1); this.renderTimeline(); this.renderDetail(); });
        box.append(next);
      }
    } else box.append(submit);
    return box;
  }
}
