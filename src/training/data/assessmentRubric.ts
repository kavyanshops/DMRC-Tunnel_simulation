/** Scoring weights. Weights are training-design choices (ASSUMED), not engineering data. */
export const RUBRIC = {
  moduleWeights: { sequence: 0.35, monitoring: 0.25, fire: 0.2, flood: 0.2 } as Record<string, number>,
  sequence: { checkpointWeight: 0.7, orderWeight: 0.3 },
  monitoring: { detectionWeight: 0.8, falseAlarmPenaltyEach: 0.1 },
  scenario: { correctWeight: 0.8, orderWeight: 0.2 },
};

export const REVISION_TOPICS: Record<string, string> = {
  'CS-01': 'Geotechnical investigation and baseline monitoring',
  'CS-02': 'Utility diversion and protection',
  'CS-03': 'Traffic, railway and metro coordination',
  'CS-04': 'Ground improvement / TAM grouting',
  'CS-05': 'Monitoring instrumentation',
  'CS-06': 'Launch pit excavation hazards',
  'CS-07': 'TBM launch and initial advance',
  'CS-08': 'Segmental lining',
  'CS-09': 'Annular grouting',
  'CS-10': 'TBM breakthrough hazards',
  'CS-11': 'NATM cross-passage',
  'CS-12': 'Fit-out systems',
  'MON-ANOMALY': 'Reading trends against warning/critical thresholds',
  'FIRE-DP-01': 'Initial fire detection and worker evacuation direction',
  'FIRE-DP-02': 'Tunnel ventilation smoke back-layering control and critical velocity',
  'FIRE-DP-03': 'Cross-passage pressurisation and door egress management',
  'FIRE-DP-04': '25kV traction earthing and fire service intervention',
  'FIRE-DP-05': 'Post-fire gas clearance and environmental verification',
  'FLOOD-DP-01': 'Sudden groundwater inflow detection and sump pump staging',
  'FLOOD-DP-02': 'Soil fines wash-out risk and TAM grout stabilization',
  'FLOOD-DP-03': 'Deep rail inundation, track isolation, and power trip',
  'FLOOD-DP-04': 'Polyurethane chemical grouting and hydraulic pressure relief',
  'FLOOD-DP-05': 'Safe recovery, structural inspection, and silt clearance',
};

