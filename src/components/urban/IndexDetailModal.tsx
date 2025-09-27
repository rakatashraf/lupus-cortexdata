import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Satellite, 
  Cpu, 
  Calculator, 
  BarChart3, 
  Globe, 
  Database,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { UrbanIndex } from '@/types/urban-indices';
import { cn } from '@/lib/utils';

interface IndexDetailModalProps {
  index: UrbanIndex | null;
  indexKey: string;
  isOpen: boolean;
  onClose: () => void;
  iconClass?: string;
}

const INDEX_MOCK_DATA = {
  cri: {
    satellite_data: [
      {
        name: "Landsat 8/9 Surface Temperature",
        provider: "NASA/USGS",
        resolution: "30m",
        frequency: "16 days",
        parameters: ["Surface Temperature", "NDVI", "Built-up Index"]
      },
      {
        name: "MODIS Aqua/Terra",
        provider: "NASA",
        resolution: "1km",
        frequency: "Daily",
        parameters: ["Land Surface Temperature", "Vegetation Health"]
      }
    ],
    technology: {
      algorithm: "Multi-criteria Decision Analysis (MCDA)",
      processing_method: "Weighted Linear Combination",
      data_fusion: ["Thermal Infrared", "Optical", "SAR"],
      ai_models: ["Random Forest", "Neural Networks"]
    },
    formula: {
      equation: "CRI = Σ(Wi × Ci) / ΣWi",
      variables: {
        "Wi": "Weight for component i",
        "Ci": "Normalized score for component i",
        "TAC": "Temperature Adaptation Capacity",
        "HWP": "Heat Wave Preparedness",
        "FRM": "Flood Risk Management"
      },
      weighting: {
        "Temperature Adaptation": 0.25,
        "Heat Wave Preparedness": 0.20,
        "Flood Risk Management": 0.20,
        "Air Quality Resilience": 0.20,
        "Green Infrastructure": 0.15
      },
      normalization: "Min-Max scaling (0-100)"
    }
  },
  uhvi: {
    satellite_data: [
      {
        name: "Landsat 8/9 Thermal",
        provider: "NASA/USGS",
        resolution: "100m thermal",
        frequency: "16 days",
        parameters: ["Land Surface Temperature", "Urban Heat Island"]
      },
      {
        name: "Sentinel-3 SLSTR",
        provider: "ESA",
        resolution: "1km",
        frequency: "Daily",
        parameters: ["Sea/Land Surface Temperature"]
      }
    ],
    technology: {
      algorithm: "Heat Vulnerability Assessment Model",
      processing_method: "Spatial Autocorrelation Analysis",
      data_fusion: ["Thermal", "Multispectral", "Demographic"],
      ai_models: ["Support Vector Machine", "Deep Learning CNN"]
    },
    formula: {
      equation: "UHVI = (LST × 0.3) + (ATM × 0.2) + (HII × 0.25) + (CI × 0.15) + (PV × 0.1)",
      variables: {
        "LST": "Land Surface Temperature",
        "ATM": "Air Temperature",
        "HII": "Heat Island Intensity",
        "CI": "Cooling Infrastructure (inverse)",
        "PV": "Population Vulnerability"
      },
      weighting: {
        "Land Surface Temperature": 0.30,
        "Air Temperature": 0.20,
        "Heat Island Intensity": 0.25,
        "Cooling Infrastructure": 0.15,
        "Population Vulnerability": 0.10
      },
      normalization: "Z-score standardization"
    }
  },
  aqhi: {
    satellite_data: [
      {
        name: "Sentinel-5P TROPOMI",
        provider: "ESA",
        resolution: "3.5km × 7km",
        frequency: "Daily",
        parameters: ["NO2", "SO2", "CO", "Aerosol Index"]
      },
      {
        name: "MODIS Aerosol Optical Depth",
        provider: "NASA",
        resolution: "1km",
        frequency: "Daily",
        parameters: ["AOD 550nm", "PM2.5 estimates"]
      }
    ],
    technology: {
      algorithm: "Health Risk Assessment Model",
      processing_method: "Exposure-Response Functions",
      data_fusion: ["Atmospheric Chemistry", "Ground Monitoring", "Meteorological"],
      ai_models: ["Machine Learning Regression", "Time Series Analysis"]
    },
    formula: {
      equation: "AQHI = ((NO2/40)^2.42 + (PM2.5/15)^2.45) × 10/10.4",
      variables: {
        "NO2": "Nitrogen Dioxide concentration (μg/m³)",
        "PM2.5": "Fine Particulate Matter (μg/m³)",
        "O3": "Ozone concentration (μg/m³)"
      },
      weighting: {
        "NO2 Health Impact": 2.42,
        "PM2.5 Health Impact": 2.45,
        "O3 Health Impact": 1.85
      },
      normalization: "Health risk categories (1-10+ scale)"
    }
  },
  wsi: {
    satellite_data: [
      {
        name: "Sentinel-2 MSI",
        provider: "ESA",
        resolution: "10m",
        frequency: "5 days",
        parameters: ["Water Quality Index", "NDWI", "Turbidity"]
      },
      {
        name: "MODIS Aqua Water Quality",
        provider: "NASA",
        resolution: "1km",
        frequency: "Daily",
        parameters: ["Chlorophyll-a", "Water Temperature", "Suspended Sediments"]
      }
    ],
    technology: {
      algorithm: "Water Security Assessment Framework",
      processing_method: "Hydrological Modeling",
      data_fusion: ["Optical", "Radar", "Ground Sensors"],
      ai_models: ["Ensemble Learning", "Time Series Forecasting"]
    },
    formula: {
      equation: "WSI = (SWA × 0.25) + (GWS × 0.20) + (WQI × 0.27) + (AES × 0.16) + (CR × 0.12)",
      variables: {
        "SWA": "Surface Water Availability",
        "GWS": "Groundwater Sustainability",
        "WQI": "Water Quality Index",
        "AES": "Access Equity Score",
        "CR": "Climate Resilience"
      },
      weighting: {
        "Surface Water Availability": 0.25,
        "Groundwater Sustainability": 0.20,
        "Water Quality Index": 0.27,
        "Access Equity Score": 0.16,
        "Climate Resilience": 0.12
      },
      normalization: "Percentile ranking (0-100)"
    }
  },
  gea: {
    satellite_data: [
      {
        name: "Landsat 8/9 OLI",
        provider: "NASA/USGS",
        resolution: "30m",
        frequency: "16 days",
        parameters: ["NDVI", "Green Cover", "Built-up Index"]
      },
      {
        name: "Sentinel-2 MSI",
        provider: "ESA",
        resolution: "10m",
        frequency: "5 days",
        parameters: ["Vegetation Health", "Urban Green Spaces"]
      }
    ],
    technology: {
      algorithm: "Spatial Equity Analysis",
      processing_method: "Geographic Accessibility Modeling",
      data_fusion: ["Multispectral", "LiDAR", "Demographic"],
      ai_models: ["Spatial Clustering", "Accessibility Algorithms"]
    },
    formula: {
      equation: "GEA = (GSD × 0.28) + (PA × 0.25) + (QGI × 0.21) + (CUP × 0.14) + (MS × 0.12)",
      variables: {
        "GSD": "Green Space Distribution",
        "PA": "Park Accessibility",
        "QGI": "Quality of Green Infrastructure",
        "CUP": "Community Usage Patterns",
        "MS": "Maintenance and Safety"
      },
      weighting: {
        "Green Space Distribution": 0.28,
        "Park Accessibility": 0.25,
        "Quality of Green Infrastructure": 0.21,
        "Community Usage Patterns": 0.14,
        "Maintenance and Safety": 0.12
      },
      normalization: "Equity index scaling (0-100)"
    }
  },
  scm: {
    satellite_data: [
      {
        name: "Planet Labs Constellation",
        provider: "Planet Labs",
        resolution: "3m",
        frequency: "Daily",
        parameters: ["Social Infrastructure", "Public Spaces", "Community Facilities"]
      },
      {
        name: "WorldView-3",
        provider: "Maxar",
        resolution: "30cm",
        frequency: "Monthly",
        parameters: ["High-resolution Urban Analysis", "Building Types"]
      }
    ],
    technology: {
      algorithm: "Social Network Analysis",
      processing_method: "Community Connectivity Assessment",
      data_fusion: ["High-resolution Optical", "Social Media Data", "Survey Data"],
      ai_models: ["Graph Neural Networks", "Social Pattern Recognition"]
    },
    formula: {
      equation: "SCM = (CFA × 0.24) + (PSC × 0.20) + (EI × 0.19) + (CDS × 0.21) + (SS × 0.16)",
      variables: {
        "CFA": "Community Facility Access",
        "PSC": "Public Space Connectivity",
        "EI": "Economic Integration",
        "CDS": "Cultural Diversity Support",
        "SS": "Safety and Security"
      },
      weighting: {
        "Community Facility Access": 0.24,
        "Public Space Connectivity": 0.20,
        "Economic Integration": 0.19,
        "Cultural Diversity Support": 0.21,
        "Safety and Security": 0.16
      },
      normalization: "Social cohesion index (0-100)"
    }
  },
  ejt: {
    satellite_data: [
      {
        name: "Sentinel-5P Environmental Justice",
        provider: "ESA",
        resolution: "7km",
        frequency: "Daily",
        parameters: ["Pollution Distribution", "Environmental Burden"]
      },
      {
        name: "Landsat Environmental Equity",
        provider: "NASA/USGS",
        resolution: "30m",
        frequency: "16 days",
        parameters: ["Green Infrastructure Access", "Urban Heat Distribution"]
      }
    ],
    technology: {
      algorithm: "Environmental Justice Framework",
      processing_method: "Spatial Equity Analysis",
      data_fusion: ["Environmental", "Socioeconomic", "Demographic"],
      ai_models: ["Fairness Algorithms", "Bias Detection Models"]
    },
    formula: {
      equation: "EJT = (PBE × 0.23) + (GIA × 0.21) + (CRD × 0.20) + (HOE × 0.22) + (CVP × 0.14)",
      variables: {
        "PBE": "Pollution Burden Equity",
        "GIA": "Green Infrastructure Access",
        "CRD": "Climate Risk Distribution",
        "HOE": "Health Outcome Equity",
        "CVP": "Community Voice and Participation"
      },
      weighting: {
        "Pollution Burden Equity": 0.23,
        "Green Infrastructure Access": 0.21,
        "Climate Risk Distribution": 0.20,
        "Health Outcome Equity": 0.22,
        "Community Voice and Participation": 0.14
      },
      normalization: "Justice index scaling (0-100)"
    }
  },
  tas: {
    satellite_data: [
      {
        name: "OpenStreetMap Transit Data",
        provider: "OSM/Transit Agencies",
        resolution: "Vector",
        frequency: "Real-time",
        parameters: ["Transit Routes", "Stop Locations", "Service Frequency"]
      },
      {
        name: "Sentinel-1 SAR",
        provider: "ESA",
        resolution: "10m",
        frequency: "6 days",
        parameters: ["Transportation Infrastructure", "Traffic Flow Analysis"]
      }
    ],
    technology: {
      algorithm: "Multi-modal Accessibility Analysis",
      processing_method: "Network Analysis and Routing",
      data_fusion: ["Transit Data", "Road Networks", "Demographic"],
      ai_models: ["Route Optimization", "Accessibility Prediction"]
    },
    formula: {
      equation: "TAS = (PTC × 0.27) + (ATI × 0.24) + (MMC × 0.21) + (AE × 0.16) + (EP × 0.12)",
      variables: {
        "PTC": "Public Transit Coverage",
        "ATI": "Active Transportation Infrastructure",
        "MMC": "Multi-Modal Connectivity",
        "AE": "Affordability and Equity",
        "EP": "Environmental Performance"
      },
      weighting: {
        "Public Transit Coverage": 0.27,
        "Active Transportation Infrastructure": 0.24,
        "Multi-Modal Connectivity": 0.21,
        "Affordability and Equity": 0.16,
        "Environmental Performance": 0.12
      },
      normalization: "Accessibility index (0-100)"
    }
  },
  dpi: {
    satellite_data: [
      {
        name: "Emergency Response Satellites",
        provider: "NOAA/NASA",
        resolution: "1km",
        frequency: "Real-time",
        parameters: ["Disaster Monitoring", "Emergency Infrastructure", "Risk Assessment"]
      },
      {
        name: "Synthetic Aperture Radar",
        provider: "Multiple Agencies",
        resolution: "10m",
        frequency: "Daily",
        parameters: ["Infrastructure Resilience", "Flood Monitoring", "Damage Assessment"]
      }
    ],
    technology: {
      algorithm: "Disaster Risk Assessment Model",
      processing_method: "Multi-hazard Analysis",
      data_fusion: ["SAR", "Emergency Systems", "Historical Data"],
      ai_models: ["Risk Prediction", "Emergency Response Optimization"]
    },
    formula: {
      equation: "DPI = (NHE × 0.21) + (IR × 0.26) + (ERC × 0.23) + (CP × 0.20) + (RR × 0.10)",
      variables: {
        "NHE": "Natural Hazard Exposure",
        "IR": "Infrastructure Resilience",
        "ERC": "Emergency Response Capacity",
        "CP": "Community Preparedness",
        "RR": "Recovery Resources"
      },
      weighting: {
        "Natural Hazard Exposure": 0.21,
        "Infrastructure Resilience": 0.26,
        "Emergency Response Capacity": 0.23,
        "Community Preparedness": 0.20,
        "Recovery Resources": 0.10
      },
      normalization: "Preparedness scale (0-100)"
    }
  },
  hwi: {
    satellite_data: [
      {
        name: "Integrated Well-being Satellites",
        provider: "Multi-Agency Consortium",
        resolution: "Multi-scale",
        frequency: "Continuous",
        parameters: ["Heat Vulnerability", "Air Quality", "Water Security", "Social Cohesion"]
      },
      {
        name: "Comprehensive Urban Monitoring",
        provider: "Urban Observatory Network",
        resolution: "Variable",
        frequency: "Real-time",
        parameters: ["Transportation Access", "Disaster Preparedness", "Human Health Indicators"]
      }
    ],
    technology: {
      algorithm: "Integrated Well-being Assessment Framework",
      processing_method: "Multi-dimensional Health Analysis",
      data_fusion: ["All Environmental", "Social", "Infrastructure Data"],
      ai_models: ["Deep Learning Integration", "Holistic Health Prediction"]
    },
    formula: {
      equation: "HWI = (UHVI_inv × 0.20) + (AQHI_inv × 0.18) + (WSI × 0.17) + (SCM × 0.16) + (TAS × 0.15) + (DPI × 0.14)",
      variables: {
        "UHVI_inv": "Urban Heat Vulnerability (inverted)",
        "AQHI_inv": "Air Quality Health Impact (inverted)",
        "WSI": "Water Security Indicator",
        "SCM": "Social Cohesion Metrics",
        "TAS": "Transportation Accessibility Score",
        "DPI": "Disaster Preparedness Index"
      },
      weighting: {
        "Urban Heat Vulnerability": 0.20,
        "Air Quality Health": 0.18,
        "Water Security": 0.17,
        "Social Cohesion": 0.16,
        "Transportation Accessibility": 0.15,
        "Disaster Preparedness": 0.14
      },
      normalization: "Composite well-being scale (0-100)"
    }
  }
};

export function IndexDetailModal({ index, indexKey, isOpen, onClose, iconClass }: IndexDetailModalProps) {
  if (!index) return null;

  const mockData = INDEX_MOCK_DATA[indexKey as keyof typeof INDEX_MOCK_DATA];
  const indexData = { ...index, ...mockData };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className={cn("p-2 rounded-lg bg-primary/10", iconClass)}>
              <BarChart3 className="h-6 w-6" />
            </div>
            {index.index_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Overview Section */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Index Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{index.total_score}</div>
                  <div className="text-sm text-muted-foreground">Current Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{index.target}</div>
                  <div className="text-sm text-muted-foreground">Target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">
                    {Math.round((index.total_score / index.target) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-sm">
                    {index.status}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">Status</div>
                </div>
              </div>
              <Progress value={(index.total_score / index.target) * 100} className="h-3" />
            </CardContent>
          </Card>

          <Tabs defaultValue="components" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="components" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Components
              </TabsTrigger>
              <TabsTrigger value="satellites" className="flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                Data Sources
              </TabsTrigger>
              <TabsTrigger value="technology" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Technology
              </TabsTrigger>
              <TabsTrigger value="formula" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Formula
              </TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Component Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {Object.entries(index.components).map(([component, score], idx) => (
                      <div key={component} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium">
                            {component.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Component {idx + 1}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{score}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="satellites" className="space-y-4">
              <div className="grid gap-4">
                {indexData.satellite_data?.map((satellite, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-info" />
                        {satellite.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-muted-foreground">Provider</div>
                          <div className="font-semibold">{satellite.provider}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Resolution</div>
                          <div className="font-semibold">{satellite.resolution}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Frequency</div>
                          <div className="font-semibold">{satellite.frequency}</div>
                        </div>
                        <div>
                          <div className="font-medium text-muted-foreground">Parameters</div>
                          <div className="font-semibold">{satellite.parameters.length}</div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="font-medium text-muted-foreground mb-2">Measured Parameters</div>
                        <div className="flex flex-wrap gap-2">
                          {satellite.parameters.map((param, paramIdx) => (
                            <Badge key={paramIdx} variant="secondary" className="text-xs">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="technology" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" />
                    Technology Stack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="font-medium text-muted-foreground mb-2">Algorithm</div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="font-semibold">{indexData.technology?.algorithm}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground mb-2">Processing Method</div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="font-semibold">{indexData.technology?.processing_method}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Data Fusion Techniques</div>
                    <div className="flex flex-wrap gap-2">
                      {indexData.technology?.data_fusion.map((technique, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm">
                          <Database className="h-3 w-3 mr-1" />
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {indexData.technology?.ai_models && (
                    <div>
                      <div className="font-medium text-muted-foreground mb-2">AI Models</div>
                      <div className="flex flex-wrap gap-2">
                        {indexData.technology.ai_models.map((model, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm">
                            <Cpu className="h-3 w-3 mr-1" />
                            {model}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formula" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-success" />
                    Mathematical Formula
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="font-medium text-muted-foreground mb-2">Equation</div>
                    <div className="p-4 rounded-lg bg-muted/50 font-mono text-lg">
                      {indexData.formula?.equation}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="font-medium text-muted-foreground mb-3">Variables</div>
                    <div className="grid gap-2">
                      {Object.entries(indexData.formula?.variables || {}).map(([variable, description]) => (
                        <div key={variable} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                          <code className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-sm">
                            {variable}
                          </code>
                          <span className="text-sm">{description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="font-medium text-muted-foreground mb-3">Component Weights</div>
                    <div className="space-y-2">
                      {Object.entries(indexData.formula?.weighting || {}).map(([component, weight]) => (
                        <div key={component} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <span className="text-sm">{component}</span>
                          <Badge variant="outline">{(weight * 100).toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                    <div className="font-medium text-info mb-1">Normalization Method</div>
                    <div className="text-sm text-info/80">{indexData.formula?.normalization}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}