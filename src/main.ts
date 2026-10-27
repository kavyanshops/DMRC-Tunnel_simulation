import { SceneManager } from './core/SceneManager';
import { AppMode, LayerVisibilityState } from './types';

class App {
  private sceneManager!: SceneManager;
  private currentMode: AppMode = 'home';

  // Parallax state for scene_7.mp4 hero
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  private heroVideoEl!: HTMLVideoElement | null;
  private heroContentEl!: HTMLElement | null;
  private heroPortalRayEl!: HTMLElement | null;
  private heroContainerEl!: HTMLElement | null;

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
    this.initHeroParallax();
    this.initNavigation();
    this.initLayerControls();
    this.initTelemetryHUD();
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
   * Smooth, cursor-reactive multi-layer parallax inspired by scene_7.mp4
   */
  private initHeroParallax() {
    this.heroVideoEl = document.getElementById('hero-video') as HTMLVideoElement;
    this.heroContentEl = document.getElementById('hero-content-layer');
    this.heroPortalRayEl = document.getElementById('hero-portal-ray');
    this.heroContainerEl = document.getElementById('home-hero');

    if (!this.heroContainerEl) return;

    // Track mouse position relative to window center
    window.addEventListener('mousemove', (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      this.mouse.targetX = (e.clientX - halfW) / halfW; // Range: -1 to 1
      this.mouse.targetY = (e.clientY - halfH) / halfH; // Range: -1 to 1
    });

    // Reset smoothly when mouse leaves
    window.addEventListener('mouseleave', () => {
      this.mouse.targetX = 0;
      this.mouse.targetY = 0;
    });

    // Parallax animation loop with smooth lerp
    const updateParallax = () => {
      if (this.currentMode === 'home') {
        const lerpFactor = 0.05;
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * lerpFactor;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * lerpFactor;

        // Depth Layer 1: Background Tunnel Video (scene_7.mp4)
        if (this.heroVideoEl) {
          const moveX = -this.mouse.x * 24;
          const moveY = -this.mouse.y * 18;
          this.heroVideoEl.style.transform = `translate(calc(-50% + ${moveX.toFixed(2)}px), calc(-50% + ${moveY.toFixed(2)}px)) scale(1.06)`;
        }

        // Depth Layer 2: Portal Light Ray Glow
        if (this.heroPortalRayEl) {
          const glowX = -this.mouse.x * 40;
          const glowY = -this.mouse.y * 30;
          this.heroPortalRayEl.style.transform = `translate(calc(-50% + ${glowX.toFixed(2)}px), calc(-50% + ${glowY.toFixed(2)}px))`;
        }

        // Depth Layer 3: Foreground Content
        if (this.heroContentEl) {
          const contentX = this.mouse.x * 12;
          const contentY = this.mouse.y * 8;
          this.heroContentEl.style.transform = `translate(${contentX.toFixed(2)}px, ${contentY.toFixed(2)}px)`;
        }
      }

      requestAnimationFrame(updateParallax);
    };

    requestAnimationFrame(updateParallax);
  }

  /**
   * Mode navigation and start page interactions
   */
  private initNavigation() {
    const heroEl = document.getElementById('home-hero');
    const hudOverlay = document.getElementById('hud-overlay');

    const setMode = (mode: AppMode) => {
      this.currentMode = mode;

      // Update Nav Buttons
      document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
      const activeBtn = document.getElementById(
        mode === 'home' ? 'btn-nav-home' :
        mode === 'explorer' ? 'btn-nav-overview' :
        mode === 'library' ? 'btn-nav-library' :
        mode === 'sim_fire' ? 'btn-nav-fire' : 'btn-nav-flood'
      );
      if (activeBtn) activeBtn.classList.add('active');

      if (mode === 'home') {
        heroEl?.classList.remove('hidden');
        if (hudOverlay) hudOverlay.style.display = 'none';
      } else {
        // Entering 3D Overview or simulation
        heroEl?.classList.add('hidden');
        if (hudOverlay) hudOverlay.style.display = 'block';

        if (mode === 'explorer') {
          this.sceneManager.overviewControls.resetView();
        } else {
          // Milestone notification for future modes
          const modeTitles: Record<string, string> = {
            library: 'Component Library (Scheduled for Milestone 3)',
            sim_fire: 'Tunnel Fire & Smoke Emergency (Scheduled for Milestone 5)',
            sim_flood: 'Water Ingress Emergency (Scheduled for Milestone 6)'
          };
          const title = modeTitles[mode] || mode;
          alert(`${title}\n\nCurrent focus: Milestone 1 (3D Scaled Model & Overview Mode). Click "3D Overview (M1)" to explore.`);
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

    // Hero buttons
    document.getElementById('btn-hero-enter')?.addEventListener('click', () => setMode('explorer'));
    document.getElementById('btn-hero-library')?.addEventListener('click', () => setMode('library'));

    // Hero four PRD tiles
    document.getElementById('tile-explore')?.addEventListener('click', () => setMode('explorer'));
    document.getElementById('tile-library')?.addEventListener('click', () => setMode('library'));
    document.getElementById('tile-fire')?.addEventListener('click', () => setMode('sim_fire'));
    document.getElementById('tile-flood')?.addEventListener('click', () => setMode('sim_flood'));
  }

  /**
   * Layer controls & soil excavation cutaway slider
   */
  private initLayerControls() {
    // Cutaway Slider
    const cutawaySlider = document.getElementById('slider-cutaway') as HTMLInputElement;
    const cutawayLabel = document.getElementById('cutaway-val');

    cutawaySlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (cutawayLabel) {
        cutawayLabel.textContent = val === 0 ? 'Excavated' : `${val}%`;
      }
      this.sceneManager.setSoilCutaway(val);
    });

    // Checkbox Toggles
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
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
