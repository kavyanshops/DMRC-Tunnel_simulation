import { MONITORING_PARAMS, SIM_TICKS, alertState } from '../data/monitoringThresholds';
import { CONSTRUCTION_STAGES } from '../data/constructionSequence';
import { DISCLAIMER_SIMULATED } from '../data/constants';
import type { AlertState, MonitoringParam } from '../data/types';
import { session } from '../assessment/session';
import { clear, confidenceBadge, h, simulatedBadge } from '../ui';
import { firstWarningTick, seriesUpTo, valueAt } from './simulation';

const W = 320, H = 110, PAD = 6;

function chartSVG(p: MonitoringParam, tick: number): string {
  const x = (i: number) => PAD + (i / SIM_TICKS) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - p.chartMin) / (p.chartMax - p.chartMin)) * (H - 2 * PAD);
  const series = seriesUpTo(p, tick);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(Math.min(p.chartMax, Math.max(p.chartMin, v))).toFixed(1)}`).join(' ');
  const warnY = y(p.warning).toFixed(1), critY = y(p.critical).toFixed(1);
  const bandWarn = p.worse === 'higher'
    ? `<rect x="${PAD}" y="${critY}" width="${W - 2 * PAD}" height="${Math.max(0, +warnY - +critY)}" fill="#f59e0b" opacity=".12"/><rect x="${PAD}" y="${PAD}" width="${W - 2 * PAD}" height="${Math.max(0, +critY - PAD)}" fill="#f43f5e" opacity=".14"/>`
    : `<rect x="${PAD}" y="${warnY}" width="${W - 2 * PAD}" height="${Math.max(0, +critY - +warnY)}" fill="#f59e0b" opacity=".12"/><rect x="${PAD}" y="${critY}" width="${W - 2 * PAD}" height="${Math.max(0, H - PAD - +critY)}" fill="#f43f5e" opacity=".14"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="mon-chart" role="img" aria-label="${p.label} trend, simulated">
    ${bandWarn}
    <line x1="${PAD}" x2="${W - PAD}" y1="${warnY}" y2="${warnY}" stroke="#f59e0b" stroke-dasharray="4 3"/>
    <line x1="${PAD}" x2="${W - PAD}" y1="${critY}" y2="${critY}" stroke="#f43f5e" stroke-dasharray="4 3"/>
    <polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="2"/>
    <line x1="${x(tick)}" x2="${x(tick)}" y1="${PAD}" y2="${H - PAD}" stroke="#94a3b8" opacity=".5"/>
  </svg>`;
}

export class MonitoringDashboard {
  readonly el = h('section', { class: 't-panel', 'aria-label': 'Site Monitoring Dashboard' });
  private tick = 0;
  private timer: number | null = null;
  private grid = h('div', { class: 'mon-grid' });
  private summary = h('div', { class: 'mon-summary' });
  private slider!: HTMLInputElement;
  private playBtn!: HTMLButtonElement;
  private focusId: string | null = null;

  constructor(private onOpenStage: (stageId: string) => void) { this.build(); }

  destroy() { this.stop(); }

  focus(paramId: string) { this.focusId = paramId; this.renderCards(); }

  private build() {
    clear(this.el);
    this.slider = h('input', { type: 'range', min: '0', max: String(SIM_TICKS), value: '0', class: 'mon-slider', 'aria-label': 'Simulated time' }) as HTMLInputElement;
    this.slider.addEventListener('input', () => { this.tick = parseInt(this.slider.value, 10); this.renderCards(); });
    this.playBtn = h('button', { class: 't-btn' }, 'Play') as HTMLButtonElement;
    this.playBtn.addEventListener('click', () => (this.timer === null ? this.play() : this.stop()));
    const reset = h('button', { class: 't-btn t-btn-ghost' }, 'Reset');
    reset.addEventListener('click', () => { this.stop(); this.tick = 0; this.slider.value = '0'; this.renderCards(); });
    this.el.append(
      h('div', { class: 't-panel-head' }, h('h2', {}, 'Site Monitoring'), h('p', { class: 't-sim' }, DISCLAIMER_SIMULATED),
        h('p', { class: 't-muted' }, 'Play or scrub simulated time (1 tick = 1 simulated hour). Compare each trend with its warning and critical thresholds and press "Flag anomaly" when you think a reading has left its normal range. Thresholds are illustrative (ASSUMED).')),
      h('div', { class: 'mon-controls' }, this.playBtn, reset, this.slider, h('span', { class: 't-muted', id: 'mon-tick' }, '')),
      this.summary, this.grid,
    );
    this.renderCards();
  }

  private play() {
    this.playBtn.textContent = 'Pause';
    this.timer = window.setInterval(() => {
      if (this.tick >= SIM_TICKS) { this.stop(); return; }
      this.tick++; this.slider.value = String(this.tick); this.renderCards();
    }, 120);
  }

  stop() {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (this.playBtn) this.playBtn.textContent = 'Play';
  }

  private renderCards() {
    clear(this.grid);
    const tickLabel = this.el.querySelector('#mon-tick');
    if (tickLabel) tickLabel.textContent = `t = ${this.tick} h (simulated)`;
    const counts: Record<AlertState, number> = { normal: 0, warning: 0, critical: 0 };
    for (const p of MONITORING_PARAMS) {
      const v = valueAt(p, this.tick);
      const st = alertState(p, v);
      counts[st]++;
      const card = h('article', { class: `mon-card state-${st}${this.focusId === p.id ? ' is-focus' : ''}`, id: `card-${p.id}` });
      const stageChips = p.linkedStageIds.map((sid) => {
        const st2 = CONSTRUCTION_STAGES.find((s) => s.id === sid)!;
        const b = h('button', { class: 't-chip', title: st2.title }, `Stage ${st2.order}`);
        b.addEventListener('click', () => this.onOpenStage(sid));
        return b;
      });
      const flagged = session.anomalies.filter((a) => a.paramId === p.id).length;
      const flag = h('button', { class: 't-btn t-btn-small' }, flagged ? `Flag anomaly (${flagged})` : 'Flag anomaly');
      flag.addEventListener('click', () => {
        const abnormal = alertState(p, valueAt(p, this.tick)) !== 'normal';
        session.flagAnomaly(p.id, this.tick, abnormal, firstWarningTick(p, (x) => alertState(p, x) !== 'normal'));
        const msg = card.querySelector('.mon-feedback');
        if (msg) msg.textContent = abnormal ? 'Correct — this reading is outside its normal range.' : 'No anomaly here: this reading is still in its normal range.';
      });
      const extra = p.id === 'MON-TBM'
        ? h('p', { class: 't-muted' }, `Simulated ring count: ${Math.round(Array.from({ length: this.tick + 1 }, (_, t) => valueAt(p, t) / 24).reduce((a, b) => a + b, 0))}`)
        : null;
      card.append(
        h('div', { class: 'mon-head' }, h('h3', {}, p.label), simulatedBadge()),
        h('div', { class: 'mon-value' }, `${v.toFixed(p.unit === '%' || p.unit === 'rings/day' || p.unit === 'mm' ? 1 : 2)} ${p.unit}`, h('span', { class: `mon-state ${st}` }, st.toUpperCase())),
      );
      const chart = h('div', {}); chart.innerHTML = chartSVG(p, this.tick);
      card.append(chart,
        extra ?? "",
        h('p', { class: 't-muted' }, `Normal ${p.worse === 'higher' ? '≤' : '≥'} ${p.normalMax} · Warning ${p.worse === 'higher' ? '≥' : '≤'} ${p.warning} · Critical ${p.worse === 'higher' ? '≥' : '≤'} ${p.critical} ${p.unit}`),
        h('div', { class: 'mon-tags' }, confidenceBadge(p.confidence), ...stageChips),
        h('div', { class: 'mon-actions' }, flag, h('span', { class: 'mon-feedback t-muted' }, '')),
      );
      this.grid.append(card);
    }
    clear(this.summary);
    this.summary.append(
      h('span', { class: 'mon-pill normal' }, `${counts.normal} normal`),
      h('span', { class: 'mon-pill warning' }, `${counts.warning} warning`),
      h('span', { class: 'mon-pill critical' }, `${counts.critical} critical`),
      h('span', { class: 't-sim' }, DISCLAIMER_SIMULATED),
    );
    if (this.focusId) document.getElementById(`card-${this.focusId}`)?.scrollIntoView({ block: 'nearest' });
  }
}
