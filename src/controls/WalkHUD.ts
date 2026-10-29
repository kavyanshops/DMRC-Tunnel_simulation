import * as THREE from 'three';
import type { FirstPersonControls, PlayerTelemetry } from './FirstPersonControls';
import type { StationInteractable } from '../scene/StationInterior';
import type { ComponentLibrary } from '../ui/ComponentLibrary';

export class WalkHUD {
  public root: HTMLElement;
  private reticle: HTMLElement;
  private compass: HTMLElement;
  private compassVal: HTMLElement;
  private levelTitle: HTMLElement;
  private levelStats: HTMLElement;
  private fastTravelSelect: HTMLSelectElement;
  private elevatorPanel: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D | null;
  private hintBar: HTMLElement;

  // Interactivity UI
  private interactPrompt: HTMLElement;
  private modalOverlay: HTMLElement;
  private currentModalItem: StationInteractable | null = null;

  private controls: FirstPersonControls;
  private onToggleMode: () => void;
  private componentLibrary?: ComponentLibrary;

  constructor(controls: FirstPersonControls, onToggleMode: () => void, componentLibrary?: ComponentLibrary) {
    this.controls = controls;
    this.onToggleMode = onToggleMode;
    this.componentLibrary = componentLibrary;

    this.root = document.createElement('div');
    this.root.id = 'walk-hud-root';
    this.root.className = 'walk-hud hidden';

    // 1. Center Reticle
    this.reticle = document.createElement('div');
    this.reticle.className = 'walk-reticle';
    this.reticle.innerHTML = `<span class="reticle-dot"></span><div class="reticle-ring"></div>`;

    // 2. Dynamic Interaction Prompt Pill
    this.interactPrompt = document.createElement('div');
    this.interactPrompt.className = 'walk-interact-prompt hidden';
    this.interactPrompt.innerHTML = `<span class="interact-key">E</span><span class="interact-text">Interact</span>`;

    // 3. Top Compass
    this.compass = document.createElement('div');
    this.compass.className = 'walk-compass';
    this.compass.innerHTML = `
      <div class="compass-marker">▼</div>
      <div class="compass-val" id="compass-val">180° S</div>
    `;
    this.compassVal = this.compass.querySelector('#compass-val')!;

    // 4. Top-Left Level & Depth Telemetry
    const telemCard = document.createElement('div');
    telemCard.className = 'walk-telem-card';
    telemCard.innerHTML = `
      <div class="walk-level-badge" id="walk-level-title">CONCOURSE (L1)</div>
      <div class="walk-level-stats" id="walk-level-stats">Depth: 10.2 m · RL: +209.8 m</div>
    `;
    this.levelTitle = telemCard.querySelector('#walk-level-title')!;
    this.levelStats = telemCard.querySelector('#walk-level-stats')!;

    // 5. Top-Right Controls & Fast-Travel
    const topNav = document.createElement('div');
    topNav.className = 'walk-top-nav';

    const tabBtn = document.createElement('button');
    tabBtn.className = 'hud-tab-btn';
    tabBtn.innerHTML = `<span>Overview (Tab)</span>`;
    tabBtn.addEventListener('click', () => this.onToggleMode());

    const libBtn = document.createElement('button');
    libBtn.className = 'hud-tab-btn';
    libBtn.innerHTML = `<span>Library (C)</span>`;
    libBtn.addEventListener('click', () => {
      this.componentLibrary?.toggleVisible();
    });

    const ftLabel = document.createElement('span');
    ftLabel.className = 'ft-label';
    ftLabel.textContent = 'Jump to:';

    this.fastTravelSelect = document.createElement('select');
    this.fastTravelSelect.className = 'fast-travel-select';
    this.fastTravelSelect.innerHTML = `
      <option value="concourse">Concourse (L1, -10.16m)</option>
      <option value="upper_platform">Upper Platform (L2, -16.31m)</option>
      <option value="intermediate">Intermediate Plant (L3, -24.46m)</option>
      <option value="lower_platform">Lower Platform (L4, -31.01m)</option>
      <option value="ground">Ground Surface (0.00m)</option>
    `;
    this.fastTravelSelect.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      this.controls.teleportToLevel(val);
      this.controls.domElement.focus();
    });

    topNav.append(ftLabel, this.fastTravelSelect, libBtn, tabBtn);

    // 6. Interactive Elevator Call Panel (appears when inside elevator)
    this.elevatorPanel = document.createElement('div');
    this.elevatorPanel.className = 'walk-elevator-panel hidden';
    this.elevatorPanel.innerHTML = `
      <div class="elev-head">Elevator Control Panel</div>
      <div class="elev-btns">
        <button class="elev-btn" data-stop="0">L1 Concourse (-10.2m)</button>
        <button class="elev-btn" data-stop="1">L2 Upper Plat (-16.3m)</button>
        <button class="elev-btn" data-stop="2">L3 Intermediate (-24.5m)</button>
        <button class="elev-btn" data-stop="3">L4 Lower Plat (-31.0m)</button>
      </div>
    `;
    this.elevatorPanel.querySelectorAll('.elev-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const stopIdx = parseInt((e.target as HTMLElement).getAttribute('data-stop') || '0', 10);
        this.controls.callElevatorToStop(stopIdx);
      });
    });

    // 7. Bottom-Right 2D Minimap
    const mapWrap = document.createElement('div');
    mapWrap.className = 'walk-minimap-wrap';
    mapWrap.innerHTML = `<div class="minimap-title">STATION RADAR · 200m PLAN</div>`;

    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.className = 'walk-minimap';
    this.minimapCanvas.width = 200;
    this.minimapCanvas.height = 70;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    mapWrap.append(this.minimapCanvas);

    // 8. Bottom Key Hints
    this.hintBar = document.createElement('div');
    this.hintBar.className = 'walk-hints';
    this.hintBar.innerHTML = `
      <span class="hint-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
      <span class="hint-item"><kbd>Shift</kbd> Sprint</span>
      <span class="hint-item"><kbd>E</kbd> Interact</span>
      <span class="hint-item"><kbd>C</kbd> Library</span>
      <span class="hint-item"><kbd>Mouse</kbd> Look</span>
      <span class="hint-item"><kbd>Tab</kbd> Overview</span>
      <span class="hint-item"><kbd>Esc</kbd> Unlock</span>
    `;

    // 9. Interactive Detail Modal Overlay
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.className = 'walk-modal-overlay hidden';
    this.modalOverlay.innerHTML = `
      <div class="walk-modal-card">
        <div class="walk-modal-header">
          <div class="walk-modal-badge">DELHI METRO RAIL CORPORATION</div>
          <button class="walk-modal-close" id="walk-modal-close">&times;</button>
        </div>
        <div class="walk-modal-body">
          <h2 class="walk-modal-title" id="walk-modal-title">Station Component</h2>
          <div class="walk-modal-sub" id="walk-modal-sub">Subsystem Specification</div>
          <p class="walk-modal-desc" id="walk-modal-desc">Detailed operational description.</p>
          <ul class="walk-modal-bullets" id="walk-modal-bullets"></ul>
        </div>
        <div class="walk-modal-footer">
          <button class="walk-modal-action-btn" id="walk-modal-action-btn">EXECUTE</button>
          <button class="walk-modal-dismiss-btn" id="walk-modal-dismiss-btn">Close (Esc)</button>
        </div>
      </div>
    `;

    this.modalOverlay.querySelector('#walk-modal-close')?.addEventListener('click', () => this.closeModal());
    this.modalOverlay.querySelector('#walk-modal-dismiss-btn')?.addEventListener('click', () => this.closeModal());
    this.modalOverlay.querySelector('#walk-modal-action-btn')?.addEventListener('click', () => this.handleModalAction());

    this.root.append(
      this.reticle,
      this.interactPrompt,
      this.compass,
      telemCard,
      topNav,
      this.elevatorPanel,
      mapWrap,
      this.hintBar,
      this.modalOverlay
    );

    document.getElementById('app')?.append(this.root);

    // Bind interaction callback
    this.controls.onInteractCallback = (item) => {
      this.openModal(item);
    };

    // Close modal on Esc
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.modalOverlay.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  public setVisible(visible: boolean) {
    if (visible) {
      this.root.classList.remove('hidden');
    } else {
      this.root.classList.add('hidden');
      this.closeModal();
    }
  }

  public update(telemetry: PlayerTelemetry, feetPos: THREE.Vector3, yaw: number) {
    // 1. Compass Update
    this.compassVal.textContent = `${telemetry.headingDegrees.toString().padStart(3, '0')}° ${telemetry.cardinal}`;

    // 2. Telemetry Card
    this.levelTitle.textContent = `${telemetry.levelName.toUpperCase()}`;
    this.levelStats.textContent = `Depth: ${telemetry.depth.toFixed(1)} m · RL: +${telemetry.rl.toFixed(2)} m`;

    // 3. Fast-Travel select sync if level changed
    if (this.fastTravelSelect.value !== telemetry.levelId) {
      this.fastTravelSelect.value = telemetry.levelId;
    }

    // 4. Elevator Panel Toggle
    if (telemetry.inElevator) {
      this.elevatorPanel.classList.remove('hidden');
    } else {
      this.elevatorPanel.classList.add('hidden');
    }

    // 5. Dynamic Interaction Reticle & Prompt
    const interactable = this.controls.activeInteractable;
    if (interactable && this.modalOverlay.classList.contains('hidden')) {
      this.reticle.classList.add('has-target');
      this.interactPrompt.classList.remove('hidden');
      const textSpan = this.interactPrompt.querySelector('.interact-text');
      if (textSpan) textSpan.textContent = interactable.actionText;
    } else {
      this.reticle.classList.remove('has-target');
      this.interactPrompt.classList.add('hidden');
    }

    // 6. Draw 2D Minimap
    this.drawMinimap(feetPos, yaw);
  }

  private openModal(item: StationInteractable) {
    this.currentModalItem = item;
    const titleEl = this.modalOverlay.querySelector('#walk-modal-title');
    const subEl = this.modalOverlay.querySelector('#walk-modal-sub');
    const descEl = this.modalOverlay.querySelector('#walk-modal-desc');
    const bulletsEl = this.modalOverlay.querySelector('#walk-modal-bullets');
    const actionBtn = this.modalOverlay.querySelector('#walk-modal-action-btn') as HTMLButtonElement | null;

    if (titleEl) titleEl.textContent = item.details.title;
    if (subEl) subEl.textContent = item.details.subtitle;
    if (descEl) descEl.textContent = item.details.description;

    if (bulletsEl) {
      bulletsEl.innerHTML = '';
      if (item.details.bulletPoints) {
        item.details.bulletPoints.forEach((bp) => {
          const li = document.createElement('li');
          li.textContent = bp;
          bulletsEl.appendChild(li);
        });
      }
    }

    if (actionBtn) {
      actionBtn.textContent = item.details.actionLabel || 'EXECUTE ACTION';
    }

    this.modalOverlay.classList.remove('hidden');
    this.controls.unlock();
  }

  private closeModal() {
    this.modalOverlay.classList.add('hidden');
    this.currentModalItem = null;
    this.controls.domElement.focus();
  }

  private handleModalAction() {
    if (!this.currentModalItem) return;

    if (this.currentModalItem.type === 'faregate') {
      this.closeModal();
    } else if (this.currentModalItem.type === 'tvm') {
      const actionBtn = this.modalOverlay.querySelector('#walk-modal-action-btn');
      if (actionBtn) {
        actionBtn.textContent = '✓ RECHARGED ₹100';
        setTimeout(() => this.closeModal(), 700);
      }
    } else {
      this.closeModal();
    }
  }

  private drawMinimap(feetPos: THREE.Vector3, yaw: number) {
    const ctx = this.minimapCtx;
    if (!ctx) return;

    const W = this.minimapCanvas.width;
    const H = this.minimapCanvas.height;

    // Clear background
    ctx.fillStyle = '#070c14';
    ctx.fillRect(0, 0, W, H);

    // Station Box outer bounds: Z from -100 to +100 (200m), X from -6.7 to +6.7 (13.4m)
    const padX = 10;
    const padY = 10;
    const boxW = W - padX * 2;
    const boxH = H - padY * 2;

    // Station outline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, padY, boxW, boxH);

    // Trackway corridor along East side (X > 0)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padX, padY + boxH * 0.55, boxW, boxH * 0.45);

    // Track rail line
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(padX, padY + boxH * 0.75);
    ctx.lineTo(padX + boxW, padY + boxH * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);

    // Structural columns (X = -0.5)
    ctx.fillStyle = '#475569';
    for (let colZ = -80; colZ <= 80; colZ += 20) {
      const colMapZ = padX + ((colZ + 100) / 200) * boxW;
      const colMapX = padY + ((-0.5 + 6.7) / 13.4) * boxH;
      ctx.beginPath();
      ctx.arc(colMapZ, colMapX, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elevator shaft marker
    const liftMapZ = padX + ((-2.0 + 100) / 200) * boxW;
    const liftMapX = padY + ((-4.5 + 6.7) / 13.4) * boxH;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(liftMapZ - 2, liftMapX - 2, 4, 4);

    // Interactive target markers (small yellow dots)
    if (this.controls.stationInterior) {
      ctx.fillStyle = '#f59e0b';
      for (const item of this.controls.stationInterior.interactables) {
        if (Math.abs(item.position.y - feetPos.y) < 3.0) {
          const itemZ = padX + ((item.position.z + 100) / 200) * boxW;
          const itemX = padY + ((item.position.x + 6.7) / 13.4) * boxH;
          ctx.beginPath();
          ctx.arc(itemZ, itemX, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Player position
    const normZ = Math.max(0, Math.min(1, (feetPos.z + 100) / 200));
    const normX = Math.max(0, Math.min(1, (feetPos.x + 6.7) / 13.4));

    const playerMapZ = padX + normZ * boxW;
    const playerMapX = padY + normX * boxH;

    // Player vision cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.moveTo(playerMapZ, playerMapX);
    const coneAngle = 0.55;
    const coneDist = 16;
    const dirAngle = -yaw - Math.PI / 2;
    ctx.arc(playerMapZ, playerMapX, coneDist, dirAngle - coneAngle, dirAngle + coneAngle);
    ctx.closePath();
    ctx.fill();

    // Player blip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(playerMapZ, playerMapX, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
