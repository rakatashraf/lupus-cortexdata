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
  },
  {
    index_name: "Air Quality Health Impact (AQHI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "PM10 Concentration",
    point_range: "1-3 points (<50 μg/m³ = 1pt, >150 μg/m³ = 3pts)",
    measurement_description: "PM10 Concentration assessment within Air Quality Health Impact (AQHI)"
  },
  {
    index_name: "Air Quality Health Impact (AQHI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "O3 Concentration",
    point_range: "1-3 points (<120 μg/m³ = 1pt, >240 μg/m³ = 3pts)",
    measurement_description: "O3 Concentration assessment within Air Quality Health Impact (AQHI)"
  },
  // Water Security Indicator (WSI)
  {
    index_name: "Water Security Indicator (WSI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Water Supply Reliability",
    point_range: "0-25 points",
    measurement_description: "Water Supply Reliability assessment within Water Security Indicator (WSI)"
  },
  {
    index_name: "Water Security Indicator (WSI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Water Quality Standards",
    point_range: "0-25 points",
    measurement_description: "Water Quality Standards assessment within Water Security Indicator (WSI)"
  },
  {
    index_name: "Water Security Indicator (WSI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Infrastructure Resilience",
    point_range: "0-20 points",
    measurement_description: "Infrastructure Resilience assessment within Water Security Indicator (WSI)"
  },
  {
    index_name: "Water Security Indicator (WSI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Access Equity",
    point_range: "0-20 points",
    measurement_description: "Access Equity assessment within Water Security Indicator (WSI)"
  },
  {
    index_name: "Water Security Indicator (WSI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Conservation Efficiency",
    point_range: "0-10 points",
    measurement_description: "Conservation Efficiency assessment within Water Security Indicator (WSI)"
  },
  // Green Equity Assessment (GEA)
  {
    index_name: "Green Equity Assessment (GEA)",
    category: "Environmental Justice & Equity Indices",
    component: "Park Access Distribution",
    point_range: "0-25 points",
    measurement_description: "Park Access Distribution assessment within Green Equity Assessment (GEA)"
  },
  {
    index_name: "Green Equity Assessment (GEA)",
    category: "Environmental Justice & Equity Indices",
    component: "Green Space Per Capita",
    point_range: "0-25 points",
    measurement_description: "Green Space Per Capita assessment within Green Equity Assessment (GEA)"
  },
  {
    index_name: "Green Equity Assessment (GEA)",
    category: "Environmental Justice & Equity Indices",
    component: "Tree Canopy Coverage",
    point_range: "0-20 points",
    measurement_description: "Tree Canopy Coverage assessment within Green Equity Assessment (GEA)"
  },
  {
    index_name: "Green Equity Assessment (GEA)",
    category: "Environmental Justice & Equity Indices",
    component: "Environmental Justice Score",
    point_range: "0-20 points",
    measurement_description: "Environmental Justice Score assessment within Green Equity Assessment (GEA)"
  },
  {
    index_name: "Green Equity Assessment (GEA)",
    category: "Environmental Justice & Equity Indices",
    component: "Community Garden Access",
    point_range: "0-10 points",
    measurement_description: "Community Garden Access assessment within Green Equity Assessment (GEA)"
  },
  // Social Cohesion Metrics (SCM)
  {
    index_name: "Social Cohesion Metrics (SCM)",
    category: "Social & Economic Well-being Indices",
    component: "Community Trust Level",
    point_range: "0-25 points",
    measurement_description: "Community Trust Level assessment within Social Cohesion Metrics (SCM)"
  },
  {
    index_name: "Social Cohesion Metrics (SCM)",
    category: "Social & Economic Well-being Indices",
    component: "Social Network Density",
    point_range: "0-20 points",
    measurement_description: "Social Network Density assessment within Social Cohesion Metrics (SCM)"
  },
  {
    index_name: "Social Cohesion Metrics (SCM)",
    category: "Social & Economic Well-being Indices",
    component: "Civic Participation Rate",
    point_range: "0-20 points",
    measurement_description: "Civic Participation Rate assessment within Social Cohesion Metrics (SCM)"
  },
  {
    index_name: "Social Cohesion Metrics (SCM)",
    category: "Social & Economic Well-being Indices",
    component: "Neighborhood Safety Perception",
    point_range: "0-20 points",
    measurement_description: "Neighborhood Safety Perception assessment within Social Cohesion Metrics (SCM)"
  },
  {
    index_name: "Social Cohesion Metrics (SCM)",
    category: "Social & Economic Well-being Indices",
    component: "Cultural Diversity Index",
    point_range: "0-15 points",
    measurement_description: "Cultural Diversity Index assessment within Social Cohesion Metrics (SCM)"
  },
  // Environmental Justice Tracker (EJT)
  {
    index_name: "Environmental Justice Tracker (EJT)",
    category: "Environmental Justice & Equity Indices",
    component: "Pollution Burden Distribution",
    point_range: "0-25 points",
    measurement_description: "Pollution Burden Distribution assessment within Environmental Justice Tracker (EJT)"
  },
  {
    index_name: "Environmental Justice Tracker (EJT)",
    category: "Environmental Justice & Equity Indices",
    component: "Environmental Health Disparities",
    point_range: "0-25 points",
    measurement_description: "Environmental Health Disparities assessment within Environmental Justice Tracker (EJT)"
  },
  {
    index_name: "Environmental Justice Tracker (EJT)",
    category: "Environmental Justice & Equity Indices",
    component: "Resource Access Equity",
    point_range: "0-20 points",
    measurement_description: "Resource Access Equity assessment within Environmental Justice Tracker (EJT)"
  },
  {
    index_name: "Environmental Justice Tracker (EJT)",
    category: "Environmental Justice & Equity Indices",
    component: "Community Voice Representation",
    point_range: "0-20 points",
    measurement_description: "Community Voice Representation assessment within Environmental Justice Tracker (EJT)"
  },
  {
    index_name: "Environmental Justice Tracker (EJT)",
    category: "Environmental Justice & Equity Indices",
    component: "Cumulative Impact Assessment",
    point_range: "0-10 points",
    measurement_description: "Cumulative Impact Assessment assessment within Environmental Justice Tracker (EJT)"
  },
  // Transportation Accessibility Score (TAS)
  {
    index_name: "Transportation Accessibility Score (TAS)",
    category: "Social & Economic Well-being Indices",
    component: "Public Transit Coverage",
    point_range: "0-25 points",
    measurement_description: "Public Transit Coverage assessment within Transportation Accessibility Score (TAS)"
  },
  {
    index_name: "Transportation Accessibility Score (TAS)",
    category: "Social & Economic Well-being Indices",
    component: "Job Accessibility Index",
    point_range: "0-25 points",
    measurement_description: "Job Accessibility Index assessment within Transportation Accessibility Score (TAS)"
  },
  {
    index_name: "Transportation Accessibility Score (TAS)",
    category: "Social & Economic Well-being Indices",
    component: "Service Access Score",
    point_range: "0-20 points",
    measurement_description: "Service Access Score assessment within Transportation Accessibility Score (TAS)"
  },
  {
    index_name: "Transportation Accessibility Score (TAS)",
    category: "Social & Economic Well-being Indices",
    component: "Mobility Equity Index",
    point_range: "0-20 points",
    measurement_description: "Mobility Equity Index assessment within Transportation Accessibility Score (TAS)"
  },
  {
    index_name: "Transportation Accessibility Score (TAS)",
    category: "Social & Economic Well-being Indices",
    component: "Active Transportation Infrastructure",
    point_range: "0-10 points",
    measurement_description: "Active Transportation Infrastructure assessment within Transportation Accessibility Score (TAS)"
  },
  // Disaster Preparedness Index (DPI)
  {
    index_name: "Disaster Preparedness Index (DPI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Emergency Response Capacity",
    point_range: "0-25 points",
    measurement_description: "Emergency Response Capacity assessment within Disaster Preparedness Index (DPI)"
  },
  {
    index_name: "Disaster Preparedness Index (DPI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Infrastructure Resilience",
    point_range: "0-25 points",
    measurement_description: "Infrastructure Resilience assessment within Disaster Preparedness Index (DPI)"
  },
  {
    index_name: "Disaster Preparedness Index (DPI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Community Preparedness Level",
    point_range: "0-20 points",
    measurement_description: "Community Preparedness Level assessment within Disaster Preparedness Index (DPI)"
  },
  {
    index_name: "Disaster Preparedness Index (DPI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Early Warning Systems",
    point_range: "0-15 points",
    measurement_description: "Early Warning Systems assessment within Disaster Preparedness Index (DPI)"
  },
  {
    index_name: "Disaster Preparedness Index (DPI)",
    category: "Physical Health & Environmental Quality Indices",
    component: "Recovery Planning",
    point_range: "0-15 points",
    measurement_description: "Recovery Planning assessment within Disaster Preparedness Index (DPI)"
  }
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
  dpi: { target: 70, label: "Well-Prepared for Disasters" }
};