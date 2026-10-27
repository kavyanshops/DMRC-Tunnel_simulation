export type ConfidenceLevel = 'Verified' | 'Provisional' | 'Assumed';

export interface DimensionMeta<T> {
  value: T;
  unit: string;
  source: string;
  confidence: ConfidenceLevel;
  notes?: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  shortName: string;
  rl: number;              // Reduced Level in metres (+220.00 datum)
  depthBelowGround: number;// Metres below ground surface (220.00 - rl)
  isWalkable: boolean;
  source: string;
  confidence: ConfidenceLevel;
  description: string;
}

export interface StrataLayer {
  name: string;
  depthStart: number;      // Depth from ground level (m)
  depthEnd: number;        // Depth from ground level (m)
  color: string;
  opacity: number;
  description: string;
  source: string;
  confidence: ConfidenceLevel;
}

export type AppMode = 'home' | 'explorer' | 'library' | 'sim_fire' | 'sim_flood';

export type CameraViewMode = 'overview' | 'walk' | 'birdseye';

export interface LayerVisibilityState {
  ground: boolean;
  stationBox: boolean;
  tunnels: boolean;
  tracks: boolean;
  systems: boolean;
  assumedTags: boolean;
  surfaceContext: boolean;
}

export interface ComponentRecord {
  id: string;
  name: string;
  category: 'Civil structure' | 'Tunnel lining' | 'Track' | 'Electrical' | 'Ventilation' | 'Drainage' | 'Fire/life safety' | 'Safety equipment';
  purpose: string;
  features: string;
  size?: string;
  location: string;
  trainingRelevance: string;
  source: string;
  confidence: ConfidenceLevel;
  isSafetyCritical: boolean;
  explored?: boolean;
  position?: [number, number, number];
}
