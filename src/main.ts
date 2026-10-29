import { SceneManager } from './core/SceneManager';
import { AppMode, LayerVisibilityState } from './types';

class App {
  private sceneManager!: SceneManager;
  private currentMode: AppMode = 'home';

  // Layer visibility state
  private layerVisibility: LayerVisibilityState = {
    ground: true,
    stationBox: true,
    tunnels: true,
    tracks: true,
    systems: true,
    assumedTags: true,
    surfaceContext: true
  };

  constructor() {
    this.initScene();
    this.initCursorTracking();
    this.initInteractiveCards();
    this.initNavigation();
    this.initLayerControls();
    this.initTelemetryHUD();
    this.initTraining();

    // Start with assumed tags hidden on Home cinematic view
    this.sceneManager.setLayerVisibility('assumedTags', false);
  }

  private initScene() {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Three.js canvas not found');
      return;
    }
    this.sceneManager = new SceneManager(canvas);
  }

  /**
   * Continuous cursor tracking that drives real 3D perspective shifts in Three.js
   */
  private initCursorTracking() {
    const heroContentEl = document.getElementById('hero-content-layer');

    window.addEventListener('mousemove', (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      const normX = (e.clientX - halfW) / halfW; // -1 to 1
      const normY = (e.clientY - halfH) / halfH; // -1 to 1

      // Drive 3D scene camera parallax
      if (this.sceneManager) {
        this.sceneManager.updateMouseParallax(normX, normY);
      }

      // Subtle foreground typography counter-shift
      if (heroContentEl && this.currentMode === 'home') {
        const textX = normX * 8;
        const textY = normY * 5;
        heroContentEl.style.transform = `translate(${textX.toFixed(1)}px, ${textY.toFixed(1)}px)`;
      }
    });

    window.addEventListener('mouseleave', () => {
      if (this.sceneManager) {
        this.sceneManager.updateMouseParallax(0, 0);
      }
      if (heroContentEl) {
        heroContentEl.style.transform = 'translate(0px, 0px)';
      }
    });
  }

  /**
   * High-end 3D card tilt & dynamic spotlight border effect
   */
  private initInteractiveCards() {
    const cards = document.querySelectorAll<HTMLElement>('.hero-tile');

    cards.forEach((card) => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within element
        const y = e.clientY - rect.top;  // y position within element

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg tilt
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
        card.style.borderColor = 'rgba(56, 189, 248, 0.45)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        card.style.borderColor = 'var(--border-card)';
      });
    });
  }

  /**
   * Mode navigation and start page interactions
   */
  private initNavigation() {
    const heroEl = document.getElementById('home-hero');
    const hudOverlay = document.getElementById('hud-overlay');

    const setMode = (mode: AppMode) => {
      this.currentMode = mode;
      this.closeTraining();

      // Update Nav Buttons
      document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
      const activeBtn = document.getElementById(
        mode === 'home' ? 'btn-nav-home' :
        mode === 'explorer' ? 'btn-nav-overview' :
        mode === 'library' ? 'btn-nav-library' :
        mode === 'sim_fire' ? 'btn-nav-fire' : 'btn-nav-flood'
      );
      if (activeBtn) activeBtn.classList.add('active');

      // Update 3D scene camera mode
      this.sceneManager.setMode(mode);

      if (mode === 'home') {
        heroEl?.classList.remove('hidden');
        if (hudOverlay) hudOverlay.style.display = 'none';
        this.sceneManager.setLayerVisibility('assumedTags', false);
      } else {
        // Entering 3D Overview or simulation
        heroEl?.classList.add('hidden');
        if (hudOverlay) hudOverlay.style.display = 'block';
        this.sceneManager.setLayerVisibility('assumedTags', this.layerVisibility.assumedTags);

        if (mode === 'explorer') {
          this.sceneManager.overviewControls.resetView();
        } else {
          const modeTitles: Record<string, string> = {
            library: 'Component Library (Scheduled for Milestone 3)',
            sim_fire: 'Tunnel Fire & Smoke Emergency (Scheduled for Milestone 5)',
            sim_flood: 'Water Ingress Emergency (Scheduled for Milestone 6)'
          };
          const title = modeTitles[mode] || mode;
          alert(`${title}\n\nCurrent active: Milestone 1 (3D Scaled Model & Overview Mode). Click "3D Overview (M1)" to explore.`);
        }
      }
    };

    // Navigation bar links
    document.getElementById('nav-brand')?.addEventListener('click', () => setMode('home'));
    document.getElementById('btn-nav-home')?.addEventListener('click', () => setMode('home'));
    document.getElementById('btn-nav-overview')?.addEventListener('click', () => setMode('explorer'));
    document.getElementById('btn-nav-library')?.addEventListener('click', () => setMode('library'));
    document.getElementById('btn-nav-fire')?.addEventListener('click', () => setMode('sim_fire'));
    document.getElementById('btn-nav-flood')?.addEventListener('click', () => setMode('sim_flood'));

    // Hero main CTA
    document.getElementById('btn-hero-enter')?.addEventListener('click', () => setMode('explorer'));

    // Hero 4 PRD experience tiles
    document.getElementById('tile-explore')?.addEventListener('click', () => setMode('explorer'));
    document.getElementById('tile-library')?.addEventListener('click', () => setMode('library'));
    document.getElementById('tile-fire')?.addEventListener('click', () => setMode('sim_fire'));
    document.getElementById('tile-flood')?.addEventListener('click', () => setMode('sim_flood'));

    // Walk Mode enter button in Overview HUD
    document.getElementById('btn-enter-walk')?.addEventListener('click', () => {
      this.sceneManager.setCameraView('walk');
    });
  }


  /**
   * Layer controls & soil cutaway slider
   */
  private initLayerControls() {
    const cutawaySlider = document.getElementById('slider-cutaway') as HTMLInputElement;
    const cutawayLabel = document.getElementById('cutaway-val');

    cutawaySlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (cutawayLabel) {
        cutawayLabel.textContent = val === 0 ? 'Excavated' : `${val}%`;
      }
      this.sceneManager.setSoilCutaway(val);
    });

    const setupToggle = (id: string, layerKey: keyof LayerVisibilityState) => {
      const checkbox = document.getElementById(id) as HTMLInputElement;
      checkbox?.addEventListener('change', () => {
        this.layerVisibility[layerKey] = checkbox.checked;
        this.sceneManager.setLayerVisibility(layerKey, checkbox.checked);
      });
    };

    setupToggle('toggle-ground', 'ground');
    setupToggle('toggle-station', 'stationBox');
    setupToggle('toggle-tunnels', 'tunnels');
    setupToggle('toggle-crosspassage', 'systems');
    setupToggle('toggle-sewer', 'systems');
    setupToggle('toggle-surface', 'surfaceContext');
    setupToggle('toggle-assumed-tags', 'assumedTags');
  }

  /**
   * Live station telemetry updating level title, depth in metres and RL
   */
  private initTelemetryHUD() {
    const levelTitle = document.getElementById('hud-active-level');
    const depthVal = document.getElementById('hud-depth-val');
    const rlVal = document.getElementById('hud-rl-val');

    setInterval(() => {
      if (this.currentMode !== 'home' && this.sceneManager) {
        const tel = this.sceneManager.getFocusTelemetry();
        if (levelTitle) levelTitle.textContent = tel.name;
        if (depthVal) depthVal.textContent = `${tel.depth.toFixed(2)} m`;
        if (rlVal) rlVal.textContent = `(RL ${tel.rl >= 0 ? '+' : ''}${tel.rl.toFixed(2)} m)`;
      }
    }, 150);
  }
  /**
   * Construction Training (isolated module in src/training, lazy-loaded).
   * Opens at #construction-training. Does not touch scene state or existing modes.
   */
  private trainingOpen = false;

  private initTraining() {
    document.getElementById('tile-training')?.addEventListener('click', () => { location.hash = 'construction-training'; });
    const sync = async () => {
      if (location.hash === '#construction-training') {
        const mod = await import('./training/TrainingApp');
        document.getElementById('home-hero')?.classList.add('hidden');
        const hud = document.getElementById('hud-overlay');
        if (hud) hud.style.display = 'none';
        document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
        mod.openTraining(document.getElementById('app') as HTMLElement);
        this.trainingOpen = true;
      } else if (this.trainingOpen) {
        this.closeTraining();
        if (this.currentMode === 'home') document.getElementById('home-hero')?.classList.remove('hidden');
      }
    };
    window.addEventListener('hashchange', sync);
    void sync();
  }

  private closeTraining() {
    if (!this.trainingOpen) return;
    this.trainingOpen = false;
    if (location.hash === '#construction-training') history.replaceState(null, '', location.pathname + location.search);
    void import('./training/TrainingApp').then((m) => m.closeTraining());
  }
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
