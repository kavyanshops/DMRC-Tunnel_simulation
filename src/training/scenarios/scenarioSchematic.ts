/**
 * Low-poly, responsive SVG schematics for Fire and Flooding decision scenarios.
 * Visualises tunnel cross-section / long-section geometry (Sadar Bazar RLs),
 * hazard sources, worker positions, air/water flows, and intervention states per step (1-5).
 * 
 * NOTE: Schematic representation only (NOT TO SCALE).
 */

export function fireScenarioSchematic(stepNumber: number): string {
  const parts: string[] = [];
  const W = 800, H = 260;

  // Background tunnel strata
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0b1220"/>`);
  parts.push(`<rect x="0" y="30" width="${W}" height="70" fill="#1e293b" opacity=".5"/>`);
  parts.push(`<rect x="0" y="100" width="${W}" height="40" fill="#0f172a" opacity=".7"/>`);
  parts.push(`<rect x="0" y="140" width="${W}" height="70" fill="#1e293b" opacity=".5"/>`);

  // Station box headwall (left side)
  parts.push(`<rect x="20" y="20" width="80" height="200" fill="#111c30" stroke="#38bdf8" stroke-width="2"/>`);
  parts.push(`<text x="30" y="125" class="sch-lbl" fill="#7dd3fc" font-size="11" font-weight="bold">Station Box</text>`);
  parts.push(`<text x="25" y="140" class="sch-lbl" fill="#94a3b8" font-size="9">Headwall (Ch 75)</text>`);

  // Upper tunnel bore (RL +202.60m)
  parts.push(`<rect x="100" y="30" width="680" height="70" fill="#070c16" stroke="#94a3b8" stroke-width="2"/>`);
  parts.push(`<line x1="100" x2="780" y1="90" y2="90" stroke="#475569" stroke-width="2" stroke-dasharray="6 4"/>`);
  parts.push(`<text x="680" y="48" class="sch-lbl" fill="#cbd5e1" font-size="10">Upper Tunnel (+202.60m RL)</text>`);

  // Lower tunnel bore (RL +187.90m)
  parts.push(`<rect x="100" y="140" width="680" height="70" fill="#070c16" stroke="#64748b" stroke-width="1.5"/>`);
  parts.push(`<line x1="100" x2="780" y1="200" y2="200" stroke="#334155" stroke-width="2" stroke-dasharray="6 4"/>`);
  parts.push(`<text x="680" y="158" class="sch-lbl" fill="#94a3b8" font-size="10">Lower Tunnel (+187.90m RL)</text>`);

  // NATM Cross-Passage CP-01 (Ø4.10m connecting upper and lower)
  const cpX = 380, cpW = 55;
  parts.push(`<rect x="${cpX}" y="98" width="${cpW}" height="44" fill="#0c1829" stroke="#facc15" stroke-width="2"/>`);
  parts.push(`<text x="${cpX + 4}" y="124" class="sch-lbl" fill="#facc15" font-size="9" font-weight="bold">CP-01</text>`);

  // 25kV OHE line indicator
  const oheColor = stepNumber >= 4 ? '#22c55e' : '#f59e0b';
  parts.push(`<line x1="100" x2="780" y1="38" y2="38" stroke="${oheColor}" stroke-width="2" stroke-dasharray="8 4"/>`);
  parts.push(`<text x="110" y="35" class="sch-lbl" fill="${oheColor}" font-size="9">25kV Traction OHE ${stepNumber >= 4 ? '[EARTHED]' : '[ACTIVE]'}</text>`);

  // Battery Flatcar at Ch 120 (45m north of headwall: x ~ 230)
  const carX = 230, carY = 70;
  parts.push(`<rect x="${carX - 25}" y="${carY}" width="50" height="18" rx="2" fill="#475569" stroke="#94a3b8"/>`);
  parts.push(`<circle cx="${carX - 16}" cy="${carY + 18}" r="4" fill="#64748b"/>`);
  parts.push(`<circle cx="${carX + 16}" cy="${carY + 18}" r="4" fill="#64748b"/>`);
  parts.push(`<text x="${carX - 22}" y="${carY + 13}" class="sch-lbl" fill="#f8fafc" font-size="9">Flatcar</text>`);

  // Fire flame & smoke effects depending on step
  if (stepNumber <= 4) {
    // Fire flames
    parts.push(`<polygon points="${carX - 10},${carY} ${carX},${carY - 24} ${carX + 10},${carY}" fill="#ef4444"/>`);
    parts.push(`<polygon points="${carX - 6},${carY} ${carX},${carY - 16} ${carX + 6},${carY}" fill="#f59e0b"/>`);
    parts.push(`<polygon points="${carX - 3},${carY} ${carX},${carY - 9} ${carX + 3},${carY}" fill="#fef08a"/>`);
  }

  // Smoke layer dynamic behavior
  if (stepNumber === 1) {
    // Step 1: Smoke moving toward workers
    parts.push(`<path d="M ${carX} ${carY - 12} Q ${carX + 60} 35, ${carX + 140} 45 T ${carX + 220} 50 L ${carX + 220} 85 L ${carX} 85 Z" fill="#64748b" fill-opacity="0.6"/>`);
    // 3 Workers downstream (x ~ 330)
    [310, 325, 340].forEach((wx) => {
      parts.push(`<circle cx="${wx}" cy="82" r="5" fill="#f59e0b"/>`);
      parts.push(`<text x="${wx - 3}" y="73" fill="#f59e0b" font-size="8">▲</text>`);
    });
    parts.push(`<text x="290" y="65" class="sch-lbl" fill="#f59e0b" font-size="9">3 Track Workers</text>`);
    parts.push(`<path d="M 330 60 L 370 60" stroke="#ef4444" stroke-width="2" marker-end="url(#arrow)"/>`);
  } else if (stepNumber === 2) {
    // Step 2: Back-layering smoke plume controlled by Jet Fans
    parts.push(`<path d="M ${carX - 70} 40 Q ${carX} 32, ${carX + 280} 42 L ${carX + 280} 85 L ${carX - 70} 85 Z" fill="#475569" fill-opacity="0.75"/>`);
    // Jet fan arrows forcing airflow forward
    parts.push(`<text x="130" y="65" class="sch-lbl" fill="#38bdf8" font-size="10">Jet Fans ➔ ➔ 2.4 m/s (Critical Velocity)</text>`);
    parts.push(`<line x1="120" x2="200" y1="52" y2="52" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 3"/>`);
    // Workers moving into CP-01
    [cpX - 20, cpX - 10, cpX].forEach((wx) => {
      parts.push(`<circle cx="${wx}" cy="82" r="5" fill="#22c55e"/>`);
    });
    parts.push(`<text x="${cpX - 35}" y="72" class="sch-lbl" fill="#22c55e" font-size="9">Egress to CP-01</text>`);
  } else if (stepNumber === 3) {
    // Step 3: Workers safe in CP-01, Upper door sealed with +25Pa pressurisation
    parts.push(`<rect x="${cpX}" y="98" width="${cpW}" height="44" fill="#14532d" stroke="#22c55e" stroke-width="2"/>`);
    parts.push(`<text x="${cpX + 6}" y="116" class="sch-lbl" fill="#86efac" font-size="9" font-weight="bold">+25 Pa</text>`);
    parts.push(`<text x="${cpX + 4}" y="132" class="sch-lbl" fill="#86efac" font-size="8">PRESSURISED</text>`);
    // Workers descending to lower tunnel
    [155, 170, 185].forEach((wy, idx) => {
      parts.push(`<circle cx="${cpX + 15 + idx * 10}" cy="${wy}" r="5" fill="#22c55e"/>`);
    });
    parts.push(`<text x="${cpX + 70}" y="175" class="sch-lbl" fill="#22c55e" font-size="10">Safe in Lower Level ✓</text>`);
  } else if (stepNumber === 4) {
    // Step 4: DFS Crew arriving at headwall, traction grounded
    parts.push(`<rect x="85" y="65" width="25" height="25" fill="#ef4444" rx="2"/>`);
    parts.push(`<text x="88" y="81" fill="#fff" font-size="9" font-weight="bold">DFS</text>`);
    parts.push(`<path d="M 112 78 L 180 75" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4 2"/>`);
    parts.push(`<text x="120" y="98" class="sch-lbl" fill="#38bdf8" font-size="9">Water branch deployment (PTW active)</text>`);
    parts.push(`<circle cx="100" cy="38" r="6" fill="#22c55e"/>`);
    parts.push(`<text x="75" y="30" class="sch-lbl" fill="#22c55e" font-size="9">⏚ Grounded</text>`);
  } else if (stepNumber === 5) {
    // Step 5: Gas purge active, crown clear
    parts.push(`<rect x="${carX - 25}" y="${carY}" width="50" height="18" rx="2" fill="#334155" stroke="#64748b"/>`);
    parts.push(`<text x="${carX - 24}" y="${carY - 8}" class="sch-lbl" fill="#94a3b8" font-size="9">Extinguished</text>`);
    parts.push(`<path d="M 100 50 L 780 50" stroke="#38bdf8" stroke-width="2" stroke-dasharray="12 6"/>`);
    parts.push(`<text x="320" y="46" class="sch-lbl" fill="#7dd3fc" font-size="10">High-rate Ventilation Purge (CO &lt; 25 ppm)</text>`);
    parts.push(`<text x="320" y="75" class="sch-lbl" fill="#86efac" font-size="10">Atmospheric Re-entry Survey ✓</text>`);
  }

  // Bottom legend bar
  parts.push(`<rect x="0" y="235" width="${W}" height="25" fill="#050811"/>`);
  parts.push(`<text x="12" y="251" class="sch-lbl" fill="#64748b" font-size="9">Schematic Fire Simulation — NOT TO SCALE · Upper Tunnel Ch 120 · Step ${stepNumber}/5</text>`);

  return `<svg viewBox="0 0 ${W} ${H}" class="scenario-svg" role="img" aria-label="Fire scenario schematic step ${stepNumber}">${parts.join('')}</svg>`;
}

export function floodingScenarioSchematic(stepNumber: number): string {
  const parts: string[] = [];
  const W = 800, H = 260;

  // Background
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#0b1220"/>`);

  // Ground surface & Heritage buildings
  parts.push(`<rect x="0" y="20" width="${W}" height="6" fill="#1e293b"/>`);
  // Century-old heritage facade
  parts.push(`<rect x="290" y="2" width="70" height="18" fill="#475569" stroke="#94a3b8"/>`);
  parts.push(`<text x="294" y="14" class="sch-lbl" fill="#e2e8f0" font-size="8">Heritage Bldg</text>`);
  // Tiltmeter TM-03 indicator
  const tiltColor = stepNumber === 2 ? '#ef4444' : stepNumber >= 3 ? '#f59e0b' : '#22c55e';
  parts.push(`<polygon points="365,18 360,25 370,25" fill="${tiltColor}"/>`);
  parts.push(`<text x="375" y="15" class="sch-lbl" fill="${tiltColor}" font-size="8">TM-03 ${stepNumber === 2 ? '1.85mm ⚠' : 'STABLE'}</text>`);

  // Groundwater table (depth ~5.5m)
  parts.push(`<line x1="0" x2="${W}" y1="45" y2="45" stroke="#38bdf8" stroke-dasharray="6 3" stroke-width="1.5"/>`);
  parts.push(`<text x="10" y="42" class="sch-lbl" fill="#7dd3fc" font-size="9">Water Table (2.8 bar / 28m head)</text>`);

  // Station box & Deep Lower Undercroft (+186.09m RL)
  parts.push(`<rect x="20" y="30" width="130" height="195" fill="#0b1220" stroke="#38bdf8" stroke-width="2"/>`);
  parts.push(`<text x="30" y="70" class="sch-lbl" fill="#7dd3fc" font-size="10" font-weight="bold">Sadar Bazar Box</text>`);
  parts.push(`<text x="30" y="85" class="sch-lbl" fill="#94a3b8" font-size="8">Base RL +186.09m</text>`);

  // Sump Pit at RL +186.09m
  const sumpW = 80, sumpH = 35;
  const sumpWaterH = stepNumber === 1 ? 16 : stepNumber === 2 ? 26 : stepNumber === 3 ? 32 : stepNumber === 4 ? 12 : 6;
  parts.push(`<rect x="40" y="185" width="${sumpW}" height="${sumpH}" fill="#0f172a" stroke="#64748b"/>`);
  parts.push(`<rect x="40" y="${185 + sumpH - sumpWaterH}" width="${sumpW}" height="${sumpWaterH}" fill="#0284c7" opacity="0.8"/>`);
  parts.push(`<text x="45" y="198" class="sch-lbl" fill="#e0f2fe" font-size="8">Sump Pit</text>`);
  // Pump indicators
  parts.push(`<circle cx="58" cy="205" r="7" fill="${stepNumber >= 1 ? '#22c55e' : '#475569'}"/>`);
  parts.push(`<text x="54" y="208" fill="#fff" font-size="7">P1</text>`);
  parts.push(`<circle cx="95" cy="205" r="7" fill="${stepNumber >= 1 ? '#22c55e' : '#64748b'}"/>`);
  parts.push(`<text x="91" y="208" fill="#fff" font-size="7">P2</text>`);

  // Stacked TBM Tunnels
  // Upper tunnel
  parts.push(`<rect x="150" y="60" width="630" height="50" fill="#070c16" stroke="#475569" stroke-width="1.5"/>`);
  parts.push(`<text x="680" y="78" class="sch-lbl" fill="#64748b" font-size="9">Upper Tunnel</text>`);
  // Lower tunnel (RL +187.90m)
  parts.push(`<rect x="150" y="145" width="630" height="55" fill="#070c16" stroke="#94a3b8" stroke-width="2"/>`);
  parts.push(`<line x1="150" x2="780" y1="192" y2="192" stroke="#64748b" stroke-width="2"/>`);
  parts.push(`<text x="660" y="160" class="sch-lbl" fill="#cbd5e1" font-size="9">Lower Rail (+187.90m)</text>`);

  // NATM Cross-passage CP-01
  const cpX = 330, cpW = 45;
  parts.push(`<rect x="${cpX}" y="110" width="${cpW}" height="35" fill="#0c1829" stroke="#facc15" stroke-width="1.5"/>`);
  parts.push(`<text x="${cpX + 4}" y="130" class="sch-lbl" fill="#facc15" font-size="8">CP-01</text>`);

  // Joint breach location at CP-01 annular ring (x: cpX + 20, y: 145)
  const leakX = cpX + 22, leakY = 145;

  if (stepNumber === 1) {
    // Step 1: Inflow into sump pit
    parts.push(`<path d="M ${leakX} ${leakY} Q 250 170, 120 190" stroke="#0284c7" stroke-width="3" stroke-dasharray="4 2"/>`);
    parts.push(`<text x="200" y="165" class="sch-lbl" fill="#38bdf8" font-size="9">Inflow 195 L/min ➔ Sump</text>`);
  } else if (stepNumber === 2) {
    // Step 2: Turbid silt wash-out plume under heritage building
    parts.push(`<ellipse cx="${leakX}" cy="${leakY}" rx="20" ry="12" fill="#78350f" opacity="0.8"/>`);
    parts.push(`<path d="M ${leakX} ${leakY} Q 320 80, 325 30" stroke="#b45309" stroke-width="2" stroke-dasharray="5 3"/>`);
    parts.push(`<text x="210" y="115" class="sch-lbl" fill="#fbbf24" font-size="9" font-weight="bold">⚠ Soil Fines Wash-Out</text>`);
    parts.push(`<path d="M ${leakX} ${leakY} L 180 185" stroke="#b45309" stroke-width="3"/>`);
    parts.push(`<text x="180" y="175" class="sch-lbl" fill="#f59e0b" font-size="9">310 L/min Turbid Runoff</text>`);
  } else if (stepNumber === 3) {
    // Step 3: Track water depth 125mm covering lower rail slab
    parts.push(`<rect x="150" y="184" width="450" height="15" fill="#0284c7" opacity="0.7"/>`);
    parts.push(`<text x="220" y="180" class="sch-lbl" fill="#ef4444" font-size="9" font-weight="bold">Track Inundated (125mm over rail)</text>`);
    // Train approaching and stopped
    parts.push(`<rect x="620" y="168" width="60" height="22" rx="2" fill="#ef4444"/>`);
    parts.push(`<text x="625" y="182" fill="#fff" font-size="8" font-weight="bold">TRAIN 801 [HALT]</text>`);
    parts.push(`<circle cx="610" cy="180" r="5" fill="#ef4444"/>`);
    parts.push(`<text x="590" y="170" fill="#ef4444" font-size="8">Red Signal</text>`);
  } else if (stepNumber === 4) {
    // Step 4: Polyurethane chemical grouting injection
    parts.push(`<line x1="${leakX - 18}" y1="${leakY - 12}" x2="${leakX + 12}" y2="${leakY + 12}" stroke="#22c55e" stroke-width="4"/>`);
    parts.push(`<circle cx="${leakX}" cy="${leakY}" r="10" fill="#22c55e" opacity="0.6"/>`);
    parts.push(`<text x="${leakX + 18}" y="${leakY + 5}" class="sch-lbl" fill="#86efac" font-size="9" font-weight="bold">PU Injection Packers</text>`);
    parts.push(`<text x="${leakX + 18}" y="${leakY + 18}" class="sch-lbl" fill="#86efac" font-size="8">Hydrophobic Foam Seal</text>`);
    // Residual drainage clearing track
    parts.push(`<rect x="150" y="190" width="450" height="5" fill="#0284c7" opacity="0.3"/>`);
  } else if (stepNumber === 5) {
    // Step 5: Sealed joint, dry track, megger verification
    parts.push(`<circle cx="${leakX}" cy="${leakY}" r="7" fill="#15803d"/>`);
    parts.push(`<text x="${leakX + 12}" y="${leakY + 4}" class="sch-lbl" fill="#4ade80" font-size="8">Sealed (&lt;2 L/min)</text>`);
    parts.push(`<text x="240" y="180" class="sch-lbl" fill="#86efac" font-size="9">Track Dry · Megger Testing Passed ✓</text>`);
    parts.push(`<text x="240" y="195" class="sch-lbl" fill="#7dd3fc" font-size="8">72-Hour Geotechnical Monitoring Active</text>`);
  }

  // Bottom legend
  parts.push(`<rect x="0" y="235" width="${W}" height="25" fill="#050811"/>`);
  parts.push(`<text x="12" y="251" class="sch-lbl" fill="#64748b" font-size="9">Schematic Water Ingress Simulation — NOT TO SCALE · Base RL +186.09m · Step ${stepNumber}/5</text>`);

  return `<svg viewBox="0 0 ${W} ${H}" class="scenario-svg" role="img" aria-label="Flooding scenario schematic step ${stepNumber}">${parts.join('')}</svg>`;
}
