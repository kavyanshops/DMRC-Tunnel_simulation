// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { ComponentLibrary, ComponentRecord } from '../ComponentLibrary';
import componentsData from '../../data/components.json';

describe('Milestone 3 - Component Library & Interaction System', () => {
  let lib: ComponentLibrary;
  let lastNavigated: ComponentRecord | null = null;

  beforeEach(() => {
    sessionStorage.clear();
    lastNavigated = null;
    lib = new ComponentLibrary((comp) => {
      lastNavigated = comp;
    });
  });

  describe('1. Data Integrity & Traceability', () => {
    it('contains at least 15 engineering components (spec requires 15+)', () => {
      expect(componentsData.length).toBeGreaterThanOrEqual(15);
      expect(lib.components.length).toBe(18);
    });

    it('ensures every component has complete engineering metadata and valid coordinates', () => {
      lib.components.forEach((comp) => {
        expect(comp.id).toBeTruthy();
        expect(comp.name).toBeTruthy();
        expect(comp.nameHindi).toBeTruthy();
        expect(['Structural', 'Track & Tunnel', 'Geotechnical', 'Transit Systems', 'Life Safety']).toContain(comp.category);
        expect(['Verified', 'Provisional', 'Assumed']).toContain(comp.confidence);
        expect(comp.source).toBeTruthy();
        expect(typeof comp.coordinates.x).toBe('number');
        expect(typeof comp.coordinates.y).toBe('number');
        expect(typeof comp.coordinates.z).toBe('number');
        expect(comp.depthBelowGround).toBeGreaterThanOrEqual(0);
        expect(comp.inspectionProtocol.length).toBeGreaterThan(0);
      });
    });

    it('verifies that WTC 2022 and Gall Zeidler verified elements are accurately tagged', () => {
      const dWall = lib.components.find((c) => c.id === 'comp-dwall');
      expect(dWall?.confidence).toBe('Verified');
      expect(dWall?.source).toContain('WTC 2022');

      const upperTunnel = lib.components.find((c) => c.id === 'comp-upper-tbm-tunnel');
      expect(upperTunnel?.confidence).toBe('Verified');
      expect(upperTunnel?.source).toContain('Gall Zeidler');

      const psd = lib.components.find((c) => c.id === 'comp-psd-system');
      expect(psd?.confidence).toBe('Assumed');
    });
  });

  describe('2. Exploration Progression Tracking', () => {
    it('starts with 0 explored components and updates stats as components are explored', () => {
      expect(lib.getExploredStats()).toEqual({ count: 0, total: 18, percentage: 0 });

      lib.markAsExplored('comp-dwall');
      expect(lib.getExploredStats()).toEqual({ count: 1, total: 18, percentage: 6 });

      // Duplicate exploration is idempotent
      lib.markAsExplored('comp-dwall');
      expect(lib.getExploredStats().count).toBe(1);

      lib.markAsExplored('comp-roof-slab');
      expect(lib.getExploredStats().count).toBe(2);
    });

    it('persists explored state in sessionStorage', () => {
      lib.markAsExplored('comp-afc-gates');
      lib.markAsExplored('comp-tvm-kiosk');

      // Create a fresh instance to simulate session reload
      const newLib = new ComponentLibrary(() => {});
      expect(newLib.getExploredStats().count).toBe(2);
    });
  });

  describe('3. Navigation & Modal Interactions', () => {
    it('triggers onNavigateCallback when Show in 3D Model is clicked', () => {
      const targetComp = lib.components[0];
      const navBtn = lib.root.querySelector(`.btn-show-model[data-id="${targetComp.id}"]`) as HTMLButtonElement | null;
      expect(navBtn).toBeTruthy();

      navBtn?.click();
      expect(lastNavigated).toEqual(targetComp);
      expect(lib.getExploredStats().count).toBe(1); // auto-marks as explored
    });

    it('toggles visibility and responds to Escape key', () => {
      expect(lib.root.classList.contains('hidden')).toBe(true);
      lib.setVisible(true);
      expect(lib.root.classList.contains('hidden')).toBe(false);

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      expect(lib.root.classList.contains('hidden')).toBe(true);
    });
  });
});
