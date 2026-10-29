import * as THREE from 'three';
import type { FirstPersonControls, PlayerTelemetry } from './FirstPersonControls';

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

  private controls: FirstPersonControls;
  private onToggleMode: () => void;

  constructor(controls: FirstPersonControls, onToggleMode: () => void) {
    this.controls = controls;
    this.onToggleMode = onToggleMode;

    this.root = document.createElement('div');
    this.root.id = 'walk-hud-root';
    this.root.className = 'walk-hud hidden';

    // 1. Center Reticle
    this.reticle = document.createElement('div');
    this.reticle.className = 'walk-reticle';
    this.reticle.innerHTML = `<span class="reticle-dot"></span>`;

    // 2. Top Compass
    this.compass = document.createElement('div');
    this.compass.className = 'walk-compass';
    this.compass.innerHTML = `
      <div class="compass-marker">▼</div>
      <div class="compass-val" id="compass-val">180° S</div>
    `;
    this.compassVal = this.compass.querySelector('#compass-val')!;

    // 3. Top-Left Level & Depth Telemetry
    const telemCard = document.createElement('div');
    telemCard.className = 'walk-telem-card';
    telemCard.innerHTML = `
      <div class="walk-level-badge" id="walk-level-title">CONCOURSE (L1)</div>
      <div class="walk-level-stats" id="walk-level-stats">Depth: 10.2 m · RL: +209.8 m</div>
    `;
    this.levelTitle = telemCard.querySelector('#walk-level-title')!;
    this.levelStats = telemCard.querySelector('#walk-level-stats')!;

    // 4. Top-Right Controls & Fast-Travel
    const topNav = document.createElement('div');
    topNav.className = 'walk-top-nav';

    const tabBtn = document.createElement('button');
    tabBtn.className = 'hud-tab-btn';
    tabBtn.innerHTML = `<span>Overview (Tab)</span>`;
    tabBtn.addEventListener('click', () => this.onToggleMode());

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

    topNav.append(ftLabel, this.fastTravelSelect, tabBtn);

    // 5. Interactive Elevator Call Panel (appears when inside elevator)
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

    // 6. Bottom-Right 2D Minimap
    const mapWrap = document.createElement('div');
    mapWrap.className = 'walk-minimap-wrap';
    mapWrap.innerHTML = `<div class="minimap-title">STATION RADAR · 200m PLAN</div>`;

    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.className = 'walk-minimap';
    this.minimapCanvas.width = 200;
    this.minimapCanvas.height = 70;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    mapWrap.append(this.minimapCanvas);

    // 7. Bottom Key Hints
    this.hintBar = document.createElement('div');
    this.hintBar.className = 'walk-hints';
    this.hintBar.innerHTML = `
      <span class="hint-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
      <span class="hint-item"><kbd>Shift</kbd> Sprint</span>
      <span class="hint-item"><kbd>Mouse</kbd> Look (Click to Lock)</span>
      <span class="hint-item"><kbd>Tab</kbd> Toggle Overview</span>
      <span class="hint-item"><kbd>Esc</kbd> Unlock Cursor</span>
    `;

    this.root.append(
      this.reticle,
      this.compass,
      telemCard,
      topNav,
      this.elevatorPanel,
      mapWrap,
      this.hintBar
    );

    document.getElementById('app')?.append(this.root);
  }

  public setVisible(visible: boolean) {
    if (visible) {
      this.root.classList.remove('hidden');
    } else {
      this.root.classList.add('hidden');
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

    // 5. Draw 2D Minimap
    this.drawMinimap(feetPos, yaw);
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
    // Scale: map width 180px for 200m Z axis, map height 50px for 13.4m X axis
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

    // Staircase zones on minimap
    // Stair 1 (Z: -8 to 8, X: -2.8 to -0.2)
    const toMapX = (z: number) => padX + ((z + 100) / 200) * boxW;
    const toMapY = (x: number) => padY + ((x + 6.7) / 13.4) * boxH;

    ctx.fillStyle = '#facc15';
    // S1
    ctx.fillRect(toMapX(-8), toMapY(-2.8), toMapX(8) - toMapX(-8), toMapY(-0.2) - toMapY(-2.8));
    // S2
    ctx.fillRect(toMapX(18), toMapY(-2.8), toMapX(36) - toMapX(18), toMapY(-0.2) - toMapY(-2.8));
    // S3
    ctx.fillRect(toMapX(-34), toMapY(-2.8), toMapX(-18) - toMapX(-34), toMapY(-0.2) - toMapY(-2.8));

    // Elevator shaft (Z: -3.1 to -0.9, X: -5.6 to -3.4)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(toMapX(-3.1), toMapY(-5.6), toMapX(-0.9) - toMapX(-3.1), toMapY(-3.4) - toMapY(-5.6));

    // Player position
    const pX = toMapX(feetPos.z);
    const pY = toMapY(feetPos.x);

    // View direction frustum cone
    const coneAngle = Math.PI / 4;
    const coneLen = 14;
    // Map orientation: Z corresponds to map X, X corresponds to map Y
    // yaw = 0 faces South (+Z, to right)
    const mapYaw = -yaw + Math.PI / 2;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.moveTo(pX, pY);
    ctx.arc(pX, pY, coneLen, mapYaw - coneAngle, mapYaw + coneAngle);
    ctx.closePath();
    ctx.fill();

    // Player central dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pX, pY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
