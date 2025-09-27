// Type definitions for Urban Intelligence Dashboard

export interface UrbanIndex {
  index_name: string;
  category: string;
  components: Record<string, number>;
  total_score: number;
  target: number;
  status: string;
  measurement_range?: string;
  healthy_city_target?: string;
  satellite_data?: SatelliteDataSource[];
  technology?: TechnologySpec;
  formula?: IndexFormula;
}

export interface SatelliteDataSource {
  name: string;
  provider: string;
  resolution: string;
  frequency: string;
  parameters: string[];
}

export interface TechnologySpec {
  algorithm: string;
  processing_method: string;
  data_fusion: string[];
  ai_models?: string[];
}

export interface IndexFormula {
  equation: string;
  variables: Record<string, string>;
  weighting: Record<string, number>;
  normalization: string;
}

export interface IndexComponent {
  index_name: string;
  category: string;
  component: string;
  point_range: string;
  measurement_description: string;
}

export interface CityHealthData {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  overall_score: number;
  city_health_status: string;
  indices: {
    cri: UrbanIndex;
    uhvi: UrbanIndex;
    aqhi: UrbanIndex;
    wsi: UrbanIndex;
    gea: UrbanIndex;
    scm: UrbanIndex;
    ejt: UrbanIndex;
    tas: UrbanIndex;
    dpi: UrbanIndex;
    hwi: UrbanIndex;
  };
  data_quality: string;
  last_updated: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  index: string;
}

export interface MapSelectionBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AIMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
  };
}

export interface APIConfig {
  gemini: {
    apiKey: string;
    enabled: boolean;
  };
  nasa: {
    apiKey: string;
  };
  n8n: {
    endpoint: string;
    enabled: boolean;
  };
}

// Index measurement definitions
export const INDEX_MEASUREMENTS: IndexComponent[] = [
  // Climate Resilience Index (CRI)
  {
    index_name: "Climate Resilience Index (CRI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Temperature Adaptation Capacity",
    point_range: "0-25 points",
    measurement_description: "Temperature Adaptation Capacity assessment within Climate Resilience Index (CRI)"
  },
  {
    index_name: "Climate Resilience Index (CRI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Heat Wave Preparedness",
    point_range: "0-20 points",
    measurement_description: "Heat Wave Preparedness assessment within Climate Resilience Index (CRI)"
  },
  {
    index_name: "Climate Resilience Index (CRI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Flood Risk Management",
    point_range: "0-20 points",
    measurement_description: "Flood Risk Management assessment within Climate Resilience Index (CRI)"
  },
  {
    index_name: "Climate Resilience Index (CRI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Air Quality Resilience",
    point_range: "0-20 points",
    measurement_description: "Air Quality Resilience assessment within Climate Resilience Index (CRI)"
  },
  {
    index_name: "Climate Resilience Index (CRI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Green Infrastructure Coverage",
    point_range: "0-15 points",
    measurement_description: "Green Infrastructure Coverage assessment within Climate Resilience Index (CRI)"
  },
  // Urban Heat Vulnerability Index (UHVI)
  {
    index_name: "Urban Heat Vulnerability Index (UHVI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Land Surface Temperature",
    point_range: "0-30 points (>45°C = 30pts)",
    measurement_description: "Land Surface Temperature assessment within Urban Heat Vulnerability Index (UHVI)"
  },
  {
    index_name: "Urban Heat Vulnerability Index (UHVI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Air Temperature",
    point_range: "0-20 points (>40°C = 20pts)",
    measurement_description: "Air Temperature assessment within Urban Heat Vulnerability Index (UHVI)"
  },
  {
    index_name: "Urban Heat Vulnerability Index (UHVI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Heat Island Intensity",
    point_range: "0-25 points (>5°C difference = 25pts)",
    measurement_description: "Heat Island Intensity assessment within Urban Heat Vulnerability Index (UHVI)"
  },
  {
    index_name: "Urban Heat Vulnerability Index (UHVI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Cooling Infrastructure",
    point_range: "0-15 points (inverse score)",
    measurement_description: "Cooling Infrastructure assessment within Urban Heat Vulnerability Index (UHVI)"
  },
  {
    index_name: "Urban Heat Vulnerability Index (UHVI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Population Vulnerability",
    point_range: "0-10 points",
    measurement_description: "Population Vulnerability assessment within Urban Heat Vulnerability Index (UHVI)"
  },
  // Air Quality Health Impact (AQHI)
  {
    index_name: "Air Quality Health Impact (AQHI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "NO2 Concentration",
    point_range: "1-3 points (<40 μg/m³ = 1pt, >100 μg/m³ = 3pts)",
    measurement_description: "NO2 Concentration assessment within Air Quality Health Impact (AQHI)"
  },
  {
    index_name: "Air Quality Health Impact (AQHI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "PM2.5 Concentration",
    point_range: "1-3 points (<15 μg/m³ = 1pt, >35 μg/m³ = 3pts)",
    measurement_description: "PM2.5 Concentration assessment within Air Quality Health Impact (AQHI)"
  }
  // ... Additional components truncated for brevity
];

// Healthy city targets
export const HEALTHY_CITY_TARGETS = {
  cri: { target: 75, label: "Highly Resilient" },
  uhvi: { target: 30, label: "Low to Moderate Heat Risk" },
  aqhi: { target: 4, label: "Low to Moderate Health Risk" },
  wsi: { target: 70, label: "Water Secure" },
  gea: { target: 75, label: "High Equity in Green Access" },
  scm: { target: 70, label: "Strong Community Cohesion" },
  ejt: { target: 80, label: "High Environmental Justice" },
  tas: { target: 75, label: "Excellent Transportation Access" },
  dpi: { target: 70, label: "Well-Prepared for Disasters" },
  hwi: { target: 80, label: "Excellent Human Well-being" }
};