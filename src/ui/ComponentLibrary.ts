import componentsData from '../data/components.json';

export interface ComponentRecord {
  id: string;
  name: string;
  nameHindi: string;
  category: 'Structural' | 'Track & Tunnel' | 'Geotechnical' | 'Transit Systems' | 'Life Safety';
  confidence: 'Verified' | 'Provisional' | 'Assumed';
  source: string;
  levelId: string;
  levelName: string;
  coordinates: { x: number; y: number; z: number };
  depthBelowGround: number;
  rl: number;
  description: string;
  specifications: Record<string, string>;
  inspectionProtocol: string[];
  safetyNotice?: string;
}

const STORAGE_KEY = 'dmrc_explored_components_v1';

export class ComponentLibrary {
  public root: HTMLElement;
  public components: ComponentRecord[] = (componentsData as unknown) as ComponentRecord[];
  private exploredIds: Set<string> = new Set();

  private searchInput: HTMLInputElement;
  private categoryFilter: string = 'all';
  private confidenceFilter: string = 'all';
  private cardsContainer: HTMLElement;
  private progressFill: HTMLElement;
  private progressText: HTMLElement;
  private inspectDetailModal: HTMLElement;

  private onNavigateCallback: ((comp: ComponentRecord) => void) | null = null;

  constructor(onNavigate: (comp: ComponentRecord) => void) {
    this.onNavigateCallback = onNavigate;
    this.loadExploredState();

    this.root = document.createElement('div');
    this.root.id = 'component-library-root';
    this.root.className = 'comp-lib-modal-overlay hidden';

    this.root.innerHTML = `
      <div class="comp-lib-card">
        <!-- Header -->
        <div class="comp-lib-header">
          <div class="comp-lib-title-group">
            <div class="comp-lib-badge">DMRC PHASE IV · ENGINEERING REPOSITORY</div>
            <h2 class="comp-lib-title">Station & Tunnel Component Library</h2>
            <div class="comp-lib-sub">18 verified, provisional & assumed architectural, structural & safety components</div>
          </div>
          <button class="comp-lib-close" id="comp-lib-close-btn" title="Close Library (Esc)">&times;</button>
        </div>

        <!-- Explored Progress Bar -->
        <div class="comp-lib-progress-wrap">
          <div class="comp-lib-progress-label">
            <span class="progress-title">Exploration Progress</span>
            <span class="progress-stats" id="comp-lib-progress-text">0 / 18 Explored (0%)</span>
          </div>
          <div class="comp-lib-progress-bar">
            <div class="comp-lib-progress-fill" id="comp-lib-progress-fill" style="width: 0%"></div>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div class="comp-lib-toolbar">
          <div class="comp-lib-search-wrap">
            <span class="search-icon">🔍</span>
            <input type="text" id="comp-lib-search" class="comp-lib-search-input" placeholder="Search by name, Hindi, category, or technical specification..." />
          </div>
          <div class="comp-lib-filters">
            <div class="filter-group">
              <span class="filter-label">Category:</span>
              <button class="filter-pill active" data-cat="all">All</button>
              <button class="filter-pill" data-cat="Structural">Structural</button>
              <button class="filter-pill" data-cat="Track & Tunnel">Track & Tunnel</button>
              <button class="filter-pill" data-cat="Transit Systems">Transit Systems</button>
              <button class="filter-pill" data-cat="Life Safety">Life Safety</button>
              <button class="filter-pill" data-cat="Geotechnical">Geotechnical</button>
            </div>
            <div class="filter-group">
              <span class="filter-label">Confidence:</span>
              <button class="filter-pill conf-pill active" data-conf="all">All</button>
              <button class="filter-pill conf-pill" data-conf="Verified">Verified</button>
              <button class="filter-pill conf-pill" data-conf="Provisional">Provisional</button>
              <button class="filter-pill conf-pill" data-conf="Assumed">Assumed</button>
            </div>
          </div>
        </div>

        <!-- Cards Grid -->
        <div class="comp-lib-grid" id="comp-lib-grid"></div>

        <!-- Detail Sub-Modal -->
        <div class="comp-detail-overlay hidden" id="comp-detail-overlay">
          <div class="comp-detail-card">
            <div class="comp-detail-header">
              <div class="comp-detail-badge" id="cd-badge">Category</div>
              <button class="comp-lib-close" id="cd-close-btn">&times;</button>
            </div>
            <div class="comp-detail-body">
              <h3 class="cd-title" id="cd-title">Component Name</h3>
              <div class="cd-hindi" id="cd-hindi">नाम</div>
              <div class="cd-meta">
                <span class="cd-conf" id="cd-conf">Verified</span>
                <span class="cd-source" id="cd-source">Source</span>
                <span class="cd-coords" id="cd-coords">Coords</span>
              </div>
              <p class="cd-desc" id="cd-desc">Description</p>
              
              <div class="cd-section-title">Technical Specifications</div>
              <div class="cd-specs-table" id="cd-specs"></div>

              <div class="cd-section-title">Safety Inspection Protocol</div>
              <ul class="cd-inspection-list" id="cd-inspection"></ul>

              <div class="cd-safety-notice hidden" id="cd-safety"></div>
            </div>
            <div class="comp-detail-footer">
              <button class="btn-navigate-model" id="cd-nav-btn">📍 Show in 3D Model</button>
              <button class="btn-dismiss-detail" id="cd-dismiss-btn">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('app')?.append(this.root);

    // Elements
    this.searchInput = this.root.querySelector('#comp-lib-search')!;
    this.cardsContainer = this.root.querySelector('#comp-lib-grid')!;
    this.progressFill = this.root.querySelector('#comp-lib-progress-fill')!;
    this.progressText = this.root.querySelector('#comp-lib-progress-text')!;
    this.inspectDetailModal = this.root.querySelector('#comp-detail-overlay')!;

    this.bindEvents();
    this.render();
    this.updateProgressUI();
  }

  private loadExploredState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.exploredIds = new Set(arr);
        }
      }
    } catch {
      this.exploredIds = new Set();
    }
  }

  private saveExploredState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.exploredIds)));
    } catch {
      // ignore
    }
  }

  public markAsExplored(componentId: string) {
    if (!this.exploredIds.has(componentId)) {
      this.exploredIds.add(componentId);
      this.saveExploredState();
      this.updateProgressUI();
      this.render();
    }
  }

  public getExploredStats(): { count: number; total: number; percentage: number } {
    const total = this.components.length;
    const count = this.exploredIds.size;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, total, percentage };
  }

  private updateProgressUI() {
    const { count, total, percentage } = this.getExploredStats();
    this.progressText.textContent = `${count} / ${total} Explored (${percentage}%)`;
    this.progressFill.style.width = `${percentage}%`;

    // Update floating HUD badge if present
    const hudBadge = document.getElementById('hud-explored-badge');
    if (hudBadge) {
      hudBadge.textContent = `Library: ${count}/${total}`;
    }
  }

  private bindEvents() {
    // Close button
    this.root.querySelector('#comp-lib-close-btn')?.addEventListener('click', () => this.setVisible(false));
    this.root.querySelector('#cd-close-btn')?.addEventListener('click', () => this.closeDetailModal());
    this.root.querySelector('#cd-dismiss-btn')?.addEventListener('click', () => this.closeDetailModal());

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (!this.inspectDetailModal.classList.contains('hidden')) {
          this.closeDetailModal();
        } else if (!this.root.classList.contains('hidden')) {
          this.setVisible(false);
        }
      }
      // Shortcut Key C opens Library
      if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        const isHidden = this.root.classList.contains('hidden');
        this.setVisible(isHidden);
      }
    });

    // Search input live filter
    this.searchInput.addEventListener('input', () => this.render());

    // Category filter pills
    this.root.querySelectorAll<HTMLElement>('.filter-pill[data-cat]').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.root.querySelectorAll('.filter-pill[data-cat]').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.categoryFilter = pill.getAttribute('data-cat') || 'all';
        this.render();
      });
    });

    // Confidence filter pills
    this.root.querySelectorAll<HTMLElement>('.filter-pill[data-conf]').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.root.querySelectorAll('.filter-pill[data-conf]').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.confidenceFilter = pill.getAttribute('data-conf') || 'all';
        this.render();
      });
    });
  }

  public setVisible(visible: boolean) {
    if (visible) {
      this.root.classList.remove('hidden');
      this.searchInput.focus();
    } else {
      this.root.classList.add('hidden');
      this.closeDetailModal();
    }
  }

  public toggleVisible() {
    this.setVisible(this.root.classList.contains('hidden'));
  }

  private render() {
    const query = this.searchInput.value.toLowerCase().trim();

    const filtered = this.components.filter((c) => {
      // Category match
      if (this.categoryFilter !== 'all' && c.category !== this.categoryFilter) return false;
      // Confidence match
      if (this.confidenceFilter !== 'all' && c.confidence !== this.confidenceFilter) return false;
      // Search query match
      if (query) {
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesHindi = c.nameHindi.toLowerCase().includes(query);
        const matchesDesc = c.description.toLowerCase().includes(query);
        const matchesLevel = c.levelName.toLowerCase().includes(query);
        const matchesSpecs = Object.values(c.specifications).some((val) => val.toLowerCase().includes(query));
        if (!matchesName && !matchesHindi && !matchesDesc && !matchesLevel && !matchesSpecs) {
          return false;
        }
      }
      return true;
    });

    this.cardsContainer.innerHTML = '';

    if (filtered.length === 0) {
      this.cardsContainer.innerHTML = `
        <div class="comp-lib-empty">
          <div class="empty-icon">🔎</div>
          <div class="empty-text">No components match your search and filter criteria.</div>
          <button class="empty-reset-btn" id="comp-empty-reset">Reset Filters</button>
        </div>
      `;
      this.cardsContainer.querySelector('#comp-empty-reset')?.addEventListener('click', () => {
        this.searchInput.value = '';
        this.categoryFilter = 'all';
        this.confidenceFilter = 'all';
        this.root.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
        this.root.querySelector('.filter-pill[data-cat="all"]')?.classList.add('active');
        this.root.querySelector('.filter-pill[data-conf="all"]')?.classList.add('active');
        this.render();
      });
      return;
    }

    filtered.forEach((comp) => {
      const isExplored = this.exploredIds.has(comp.id);
      const confClass = comp.confidence.toLowerCase();

      const card = document.createElement('div');
      card.className = `comp-card ${isExplored ? 'is-explored' : ''}`;
      card.innerHTML = `
        <div class="comp-card-top">
          <span class="comp-category-tag">${comp.category}</span>
          <span class="comp-conf-badge conf-${confClass}">${comp.confidence}</span>
        </div>
        <div class="comp-card-title">${comp.name}</div>
        <div class="comp-card-hindi">${comp.nameHindi}</div>
        <div class="comp-card-location">📍 ${comp.levelName} · Depth ${comp.depthBelowGround.toFixed(1)}m</div>
        <p class="comp-card-desc">${comp.description.slice(0, 110)}...</p>
        <div class="comp-card-bottom">
          <div class="explored-status">
            ${isExplored ? '<span class="status-explored">✓ Explored</span>' : '<span class="status-unexplored">○ Unexplored</span>'}
          </div>
          <div class="comp-card-actions">
            <button class="btn-inspect-specs" data-id="${comp.id}">Inspect Specs</button>
            <button class="btn-show-model" data-id="${comp.id}" title="Jump to this component in the 3D model">Show in Model ➔</button>
          </div>
        </div>
      `;

      card.querySelector('.btn-inspect-specs')?.addEventListener('click', () => {
        this.openDetailModal(comp);
      });

      card.querySelector('.btn-show-model')?.addEventListener('click', () => {
        this.markAsExplored(comp.id);
        this.setVisible(false);
        if (this.onNavigateCallback) {
          this.onNavigateCallback(comp);
        }
      });

      this.cardsContainer.appendChild(card);
    });
  }

  private openDetailModal(comp: ComponentRecord) {
    const overlay = this.inspectDetailModal;
    const badgeEl = overlay.querySelector('#cd-badge')!;
    const titleEl = overlay.querySelector('#cd-title')!;
    const hindiEl = overlay.querySelector('#cd-hindi')!;
    const confEl = overlay.querySelector('#cd-conf')!;
    const sourceEl = overlay.querySelector('#cd-source')!;
    const coordsEl = overlay.querySelector('#cd-coords')!;
    const descEl = overlay.querySelector('#cd-desc')!;
    const specsEl = overlay.querySelector('#cd-specs')!;
    const inspEl = overlay.querySelector('#cd-inspection')!;
    const safetyEl = overlay.querySelector('#cd-safety')!;
    const navBtn = overlay.querySelector('#cd-nav-btn')!;

    badgeEl.textContent = comp.category.toUpperCase();
    titleEl.textContent = comp.name;
    hindiEl.textContent = comp.nameHindi;
    confEl.textContent = comp.confidence;
    confEl.className = `cd-conf conf-${comp.confidence.toLowerCase()}`;
    sourceEl.textContent = `Source: ${comp.source}`;
    coordsEl.textContent = `Coords: [X: ${comp.coordinates.x.toFixed(1)}m, Y: ${comp.coordinates.y.toFixed(1)}m, Z: ${comp.coordinates.z.toFixed(1)}m]`;
    descEl.textContent = comp.description;

    // Specs
    specsEl.innerHTML = '';
    Object.entries(comp.specifications).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'cd-spec-row';
      row.innerHTML = `<span class="spec-k">${k}</span><span class="spec-v">${v}</span>`;
      specsEl.appendChild(row);
    });

    // Inspection
    inspEl.innerHTML = '';
    comp.inspectionProtocol.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      inspEl.appendChild(li);
    });

    // Safety
    if (comp.safetyNotice) {
      safetyEl.classList.remove('hidden');
      safetyEl.textContent = `⚠️ Safety Notice: ${comp.safetyNotice}`;
    } else {
      safetyEl.classList.add('hidden');
    }

    // Nav button
    navBtn.replaceWith(navBtn.cloneNode(true));
    overlay.querySelector('#cd-nav-btn')?.addEventListener('click', () => {
      this.markAsExplored(comp.id);
      this.closeDetailModal();
      this.setVisible(false);
      if (this.onNavigateCallback) {
        this.onNavigateCallback(comp);
      }
    });

    // Mark as explored upon inspection
    this.markAsExplored(comp.id);

    overlay.classList.remove('hidden');
  }

  private closeDetailModal() {
    this.inspectDetailModal.classList.add('hidden');
  }
}
