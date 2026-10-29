import { ConfidenceLevel, LevelDefinition, StrataLayer } from '../types';

/**
 * Sadar Bazar Tunnel Training Simulator - Station Specification Data
 * 
 * PRIMARY SOURCES:
 * 1. Singh & Banerjee, "Concept Design of Sadar Bazar Underground MRTS Station in Congested Area, Delhi" (ITA-AITES WTC 2022) [WTC Fig 15]
 * 2. Gall Zeidler Consultants DC-05 project sheet [GZ Fig 2]
 * 3. Sadar Bazar Tunnel Data and Measurements document (corrected 27 Oct 2026)
 * 
 * RULE: Any value not directly sourced from the documents above is tagged as ASSUMED.
 */

export const STATION_SPEC = {
  // Ground & Datum
  groundLevelRL: {
    value: 220.00,
    unit: 'm RL',
    source: 'WTC Fig 15',
    confidence: 'Verified' as ConfidenceLevel,
    notes: 'Ground datum reference level'
  },

  // Station Box Outer Geometry
  stationBox: {
    width: {
      value: 13.40,
      unit: 'm',
      source: 'WTC Fig 15',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Grid lines D to A: 6.70 m + 2.63 m + 4.07 m'
    },
    gridSpacings: [
      { name: 'Grid D to C', width: 6.70, confidence: 'Verified' as ConfidenceLevel },
      { name: 'Grid C to B', width: 2.63, confidence: 'Verified' as ConfidenceLevel },
      { name: 'Grid B to A', width: 4.07, confidence: 'Verified' as ConfidenceLevel },
    ],
    length: {
      value: 200.00,
      unit: 'm',
      source: 'WTC Fig 15 annotation',
      confidence: 'Provisional' as ConfidenceLevel,
      notes: 'About 200 m (10 m structural grid; overall drawing label ~201 m, blurry)'
    },
    soilCoverAboveRoof: {
      value: 4.36,
      unit: 'm',
      source: 'WTC Fig 15 annotation',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Thickness of soil overburden directly above the station roof slab'
    },
    roofSlabThickness: {
      value: 1.00,
      unit: 'm',
      source: 'WTC Fig 15 annotation',
      confidence: 'Provisional' as ConfidenceLevel,
      notes: 'Roof slab about 1.0 m thick (calculated from RL 215.64 to 214.64)'
    },
    slabThicknessStandard: {
      value: 0.50,
      unit: 'm',
      source: 'Structural typical practice',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Intermediate suspended slab thickness not annotated'
    },
    wallThickness: {
      value: 0.80,
      unit: 'm',
      source: 'Diaphragm wall typical practice',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Perimeter diaphragm wall thickness assumed for box enclosure'
    }
  },

  // Key Reduced Levels (RL) and Depths
  levels: [
    {
      id: 'ground',
      name: 'Ground Surface',
      shortName: 'GND',
      rl: 220.00,
      depthBelowGround: 0.00,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Existing road and footpath grade'
    },
    {
      id: 'roof_top',
      name: 'Station Box Roof Slab Top',
      shortName: 'ROOF-T',
      rl: 215.64,
      depthBelowGround: 4.36,
      isWalkable: false,
      source: 'Derived (220.00 - 4.36 soil cover)',
      confidence: 'Provisional',
      description: 'Extrados of the reinforced concrete station box roof'
    },
    {
      id: 'roof_underside',
      name: 'Station Box Roof Underside',
      shortName: 'ROOF-U',
      rl: 214.64,
      depthBelowGround: 5.36,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Soffit of top roof slab'
    },
    {
      id: 'concourse',
      name: 'Concourse Level',
      shortName: 'L1-CONC',
      rl: 209.84,
      depthBelowGround: 10.16,
      isWalkable: true,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Passenger concourse, ticket gates, customer service & unpaid/paid areas'
    },
    {
      id: 'upper_platform',
      name: 'Upper Platform Level',
      shortName: 'L2-UPLAT',
      rl: 203.69,
      depthBelowGround: 16.31,
      isWalkable: true,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Upper passenger platform servicing the Upper Running Line'
    },
    {
      id: 'upper_rail',
      name: 'Upper Rail Level',
      shortName: 'L2-URAIL',
      rl: 202.60,
      depthBelowGround: 17.40,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Top of rail for the upper line (1.09 m below platform floor)'
    },
    {
      id: 'upper_undercroft',
      name: 'Upper Undercroft Level',
      shortName: 'L2-UUND',
      rl: 201.54,
      depthBelowGround: 18.46,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Cable trays, ventilation ducts, and drainage beneath upper track slab'
    },
    {
      id: 'intermediate',
      name: 'Intermediate Level / Plant Level',
      shortName: 'L3-INT',
      rl: 195.54,
      depthBelowGround: 24.46,
      isWalkable: true,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Intermediate technical service level between upper undercroft and lower platform'
    },
    {
      id: 'lower_platform',
      name: 'Lower Platform Level',
      shortName: 'L4-LPLAT',
      rl: 188.99,
      depthBelowGround: 31.01,
      isWalkable: true,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Deep lower passenger platform servicing the Lower Running Line'
    },
    {
      id: 'lower_rail',
      name: 'Lower Rail Level',
      shortName: 'L4-LRAIL',
      rl: 187.90,
      depthBelowGround: 32.10,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Top of rail for deep lower line (32.10 m below ground surface)'
    },
    {
      id: 'lower_undercroft',
      name: 'Lower Undercroft / Base Slab',
      shortName: 'L5-LUND',
      rl: 186.09,
      depthBelowGround: 33.91,
      isWalkable: false,
      source: 'WTC Fig 15',
      confidence: 'Verified',
      description: 'Lowest station foundation base slab, sump pits, and deep drainage channels'
    }
  ] as LevelDefinition[],

  // Storey Heights
  storeyHeights: {
    roofUndersideToConcourse: { value: 4.80, unit: 'm', source: '214.64 - 209.84', confidence: 'Verified' as ConfidenceLevel },
    concourseToUpperPlatform: { value: 6.15, unit: 'm', source: '209.84 - 203.69', confidence: 'Verified' as ConfidenceLevel },
    upperUndercroftToIntermediate: { value: 6.00, unit: 'm', source: '201.54 - 195.54', confidence: 'Verified' as ConfidenceLevel },
    intermediateToLowerPlatform: { value: 6.55, unit: 'm', source: '195.54 - 188.99', confidence: 'Verified' as ConfidenceLevel },
    lowerPlatformToRail: { value: 1.09, unit: 'm', source: '188.99 - 187.90', confidence: 'Verified' as ConfidenceLevel },
    lowerRailToUndercroft: { value: 1.81, unit: 'm', source: '187.90 - 186.09', confidence: 'Verified' as ConfidenceLevel }
  },

  // TBM Bored Running Tunnels
  tbmTunnels: {
    outerDiameter: {
      value: 6.35,
      unit: 'm',
      source: 'Gall Zeidler Consultants DC-05 project sheet',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Bored diameter of TBM shield'
    },
    innerDiameter: {
      value: 5.80,
      unit: 'm',
      source: 'GZ Fig 2 (label Ø5800)',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Internal finished diameter inside precast concrete segmental lining'
    },
    liningThickness: {
      value: 0.275,
      unit: 'm',
      source: 'Derived ((6.35 - 5.80) / 2 = 0.275 m = 275 mm)',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Precast segment wall thickness'
    },
    trackOffsetFromTunnelCenter: {
      value: 1.885,
      unit: 'm',
      source: 'Sadar Bazar Tunnel Data and Measurements document',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Centre of tunnel to centre of track'
    },
    tunnelExtensionLength: {
      value: 60.00,
      unit: 'm',
      source: 'Visual representation requirement',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Tunnel extension beyond station boundary'
    },
    // The Known Conflict
    conflictNote: {
      topic: 'Stacked Tunnel Vertical Clearance Discrepancy',
      statedInText: 'Clear gap between stacked tunnels is under one tunnel diameter (< 6.35 m)',
      statedInDrawings: 'Upper rail at +202.60 m RL, Lower rail at +187.90 m RL (differential = 14.70 m)',
      handling: 'Model the rails at exact verified RLs (+202.60 m and +187.90 m). Add visible note: "Gap unverified - ask authors/DMRC."',
      confidence: 'Provisional' as ConfidenceLevel
    }
  },

  // NATM Cross-Passage
  crossPassage: {
    outerDiameter: {
      value: 4.10,
      unit: 'm',
      source: 'Gall Zeidler Consultants DC-05 project sheet',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Mined NATM cross-passage outer profile'
    },
    liningThickness: {
      value: 0.30,
      unit: 'm',
      source: 'Typical NATM primary shotcrete + membrane + cast-in-place lining',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Lining thickness not given in source documents'
    },
    length: {
      value: 12.00,
      unit: 'm',
      source: 'Geometric requirement to connect tunnels/egress',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Illustrative cross-passage connecting emergency routes'
    },
    locationAlongTunnel: {
      value: 35.00,
      unit: 'm from station headwall',
      source: 'Illustrative placement',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Cross-passage count, spacing, and position are unknown in source'
    }
  },

  // Surface Context & Surrounding Buildings
  surfaceContext: {
    roadWidth: {
      value: 17.00,
      unit: 'm',
      source: 'WTC paper text',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Width between opposite footpaths along congested corridor'
    },
    buildingLineDistance: {
      value: 20.50, // Midpoint of 20 - 21 m
      unit: 'm',
      source: 'WTC paper text (20-21 m)',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Clearance between adjacent heritage building facades'
    },
    buildingAges: {
      value: '> 100 years',
      unit: 'years',
      source: 'WTC paper text',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Fragile heritage brick/masonry structures requiring settlement protection'
    },
    buildingHeights: {
      value: [12.0, 15.0, 18.0], // 3 to 5 storeys
      unit: 'm',
      source: 'Schematic urban contextual envelope',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Low-poly massing blocks only'
    }
  },

  // Geotechnical & Hydrogeology Profile
  geology: {
    waterTableDepth: {
      value: 5.50, // Midpoint of 5 - 6 m
      unit: 'm below ground',
      source: 'WTC paper text (5-6 m below ground)',
      confidence: 'Verified' as ConfidenceLevel,
      notes: 'Static groundwater table reference level'
    },
    strata: [
      {
        name: 'Sandy Silt Overburden',
        depthStart: 0.00,
        depthEnd: 4.50,
        color: '#8c7d6b',
        opacity: 0.65,
        description: 'Loose to medium dense surface alluvial sandy silt',
        source: 'WTC paper geotechnical summary (4-5 m sandy silt)',
        confidence: 'Verified'
      },
      {
        name: 'Weathered Quartzite',
        depthStart: 4.50,
        depthEnd: 21.50,
        color: '#5c544e',
        opacity: 0.60,
        description: 'Moderately to highly weathered fractured Delhi quartzite',
        source: 'WTC paper geotechnical summary (weathered quartzite to 20-23 m)',
        confidence: 'Verified'
      },
      {
        name: 'Fresh Quartzite Bedrock',
        depthStart: 21.50,
        depthEnd: 42.00,
        color: '#363a45',
        opacity: 0.75,
        description: 'Hard, sound, massive Delhi quartzite bedrock',
        source: 'WTC paper geotechnical summary (fresher rock below)',
        confidence: 'Verified'
      }
    ] as StrataLayer[],
    oldSewer: {
      depth: 10.00,
      unit: 'm below ground',
      outerDiameter: 1.80,
      description: 'Historical heritage brick sewer crossing just past the station boundary',
      source: 'WTC paper text (~10 m depth crossing just after station)',
      confidence: 'Provisional' as ConfidenceLevel,
      exactLocationNote: 'Exact alignment and vertical clearance unknown; rendered with ASSUMED marker'
    }
  },

  // Architectural Assumptions (Rendered dashed/ghosted with ASSUMED tags)
  assumedArchitectural: {
    platformLength: {
      value: 140.00,
      unit: 'm',
      source: 'Estimated standard 6-car metro platform (standard DMRC Phase IV)',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Station length is ~200 m; platform occupies central portion'
    },
    platformWidth: {
      value: 4.80,
      unit: 'm',
      source: 'Estimated single-sided platform width in stacked configuration',
      confidence: 'Assumed' as ConfidenceLevel,
      notes: 'Exact platform width not given in source drawings'
    },
    staircaseWidth: {
      value: 2.20,
      unit: 'm',
      source: 'Standard transit egress calculation assumption',
      confidence: 'Assumed' as ConfidenceLevel
    },
    liftFootprint: {
      width: 2.40,
      length: 2.40,
      unit: 'm',
      source: 'Standard transit elevator shaft dimension',
      confidence: 'Assumed' as ConfidenceLevel
    },
    concourseLayout: {
      fareGateCount: 8,
      ticketCounterCount: 2,
      source: 'Schematic operational layout',
      confidence: 'Assumed' as ConfidenceLevel
    }
  }
} as const;

/**
 * Coordinate System Utility:
 * - World origin (0, 0, 0):
 *   X = Station transverse axis (across 13.4m box width, Grid C is at X = 0)
 *   Y = Ground Level RL (+220.00 m RL is Y = 0.00) -> underground levels have negative Y!
 *   Z = Station longitudinal axis along 200m length (Z = 0 is station center)
 */
export function rlToWorldY(rl: number): number {
  return rl - STATION_SPEC.groundLevelRL.value;
}

export function depthToWorldY(depth: number): number {
  return -depth;
}

export function worldYToRL(y: number): number {
  return STATION_SPEC.groundLevelRL.value + y;
}

export function worldYToDepth(y: number): number {
  return -y;
}

/**
 * Where the stacked TBM tunnels meet the station box. Shared by the headwall openings
 * (StationBuilder), the bored-tunnel lining and approach track (TunnelBuilder) so they line up
 * with the in-station track at X = 3.0 (StationInterior).
 */
export const TUNNEL_LAYOUT = {
  centerX: 3.0,
  /** Bored tunnels exist only outside the station box: from the headwall out to this |Z|. */
  outerEndZ: 130,
  /** Tunnel centre height (world Y) for each running line. */
  centers(): { upper: number; lower: number } {
    const innerR = STATION_SPEC.tbmTunnels.innerDiameter.value / 2;
    const rail = (id: string) => -(STATION_SPEC.levels.find((l) => l.id === id)!.depthBelowGround);
    return { upper: rail('upper_rail') + innerR - 0.6, lower: rail('lower_rail') + innerR - 0.6 };
  }
};
