import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Thermometer, Droplets, Wind, Shield, TreePine, Users, Scale, Car, AlertTriangle, Heart } from 'lucide-react';
import { CityHealthData, UrbanIndex } from '@/types/urban-indices';
import { n8nService } from '@/services/n8n-service';
import { cn } from '@/lib/utils';
import { IndexDetailModal } from './IndexDetailModal';
import { IndexMeasurementsList } from './IndexMeasurementsList';
import { HumanWellbeingCard } from './HumanWellbeingCard';
import { RecommendationsBanner } from './RecommendationsBanner';

interface HealthDashboardProps {
  latitude?: number;
  longitude?: number;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

const INDEX_ICONS = {
  cri: Thermometer,
  uhvi: Thermometer,
  aqhi: Wind,
  wsi: Droplets,
  gea: TreePine,
  scm: Users,
  ejt: Scale,
  tas: Car,
  dpi: Shield,
  hwi: Heart
};

const INDEX_COLORS = {
  cri: 'chart-cri',
  uhvi: 'chart-uhvi',
  aqhi: 'chart-aqhi',
  wsi: 'chart-wsi',
  gea: 'chart-gea',
  scm: 'chart-scm',
  ejt: 'chart-ejt',
  tas: 'chart-tas',
  dpi: 'chart-dpi',
  hwi: 'chart-hwi'
};

export function HealthDashboard({ latitude = 23.8103, longitude = 90.4125, onLocationUpdate }: HealthDashboardProps) {
  const [healthData, setHealthData] = useState<CityHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<{ index: UrbanIndex; key: string } | null>(null);

  useEffect(() => {
    loadHealthData();
  }, [latitude, longitude]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await n8nService.getDashboardData(latitude, longitude);
      setHealthData(data);
      
      if (onLocationUpdate) {
        onLocationUpdate(latitude, longitude);
      }
    } catch (err) {
      console.error('Error loading health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (score: number, target: number) => {
    if (score >= target) return 'default';
    if (score >= target * 0.8) return 'secondary';
    return 'destructive';
  };

  const getHealthStatusColor = (status: string) => {
    if (status.includes('Healthy')) return 'text-success';
    if (status.includes('Moderately')) return 'text-warning';
    if (status.includes('Needs Improvement')) return 'text-warning';
    return 'text-danger';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading city health data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={loadHealthData} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!healthData) {
    return null;
  }

  // Filter out HWI from the regular grid
  const regularIndices = Object.entries(healthData.indices).filter(([key]) => key !== 'hwi');
  const hwiIndex = healthData.indices.hwi;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header Section - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Index Measurements Overview - Left */}
        <div className="lg:col-span-1">
          <IndexMeasurementsList />
        </div>
        
        {/* City Health Overview - Center */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-hero shadow-glow border-0 text-white h-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-center">
                City Health Overview
              </CardTitle>
              <p className="text-center text-white/80 text-sm">
                {healthData.location.latitude.toFixed(4)}°, {healthData.location.longitude.toFixed(4)}°
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center space-y-3">
                <div className="text-4xl sm:text-5xl font-bold">
                  {healthData.overall_score}
                </div>
                <div className="text-base sm:text-lg">
                  Overall Health Score
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-sm px-3 py-1 sm:px-4 sm:py-2 bg-white/20 text-white border-white/30",
                    getHealthStatusColor(healthData.city_health_status)
                  )}
                >
                  {healthData.city_health_status}
                </Badge>
                <div className="text-xs text-white/70 mt-2">
                  Last updated: {new Date(healthData.last_updated).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Human Well-being Index - Right */}
        <div className="lg:col-span-1 flex justify-center lg:justify-end">
          <HumanWellbeingCard 
            index={hwiIndex}
            onClick={() => setSelectedIndex({ index: hwiIndex, key: 'hwi' })}
            className="w-full max-w-[200px] lg:max-w-none"
          />
        </div>
      </div>

      {/* Recommendations Banner */}
      <RecommendationsBanner healthData={healthData} />

      {/* Remaining Indices Grid - 9 indices (excluding HWI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {regularIndices.map(([key, index]) => {
          const Icon = INDEX_ICONS[key as keyof typeof INDEX_ICONS];
          const colorClass = INDEX_COLORS[key as keyof typeof INDEX_COLORS];
          
          return (
            <Card 
              key={key} 
              className="bg-gradient-card shadow-card hover:shadow-interactive transition-all duration-300 hover:scale-105 cursor-pointer group min-h-[200px] touch-manipulation"
              onClick={() => setSelectedIndex({ index, key })}
            >
              <CardHeader className="pb-3 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-110 transition-transform", `text-${colorClass}`)} />
                  <Badge 
                    variant={getStatusVariant(index.total_score, index.target)}
                    className="text-xs"
                  >
                    {index.total_score}/{index.target}
                  </Badge>
                </div>
                <CardTitle className="text-base sm:text-lg leading-tight group-hover:text-primary transition-colors">
                  {index.index_name}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {index.category}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Progress to Target</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {Math.round((index.total_score / index.target) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(index.total_score / index.target) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status:</p>
                  <p className={cn("text-sm font-semibold", getHealthStatusColor(index.status))}>
                    {index.status}
                  </p>
                </div>

                {/* Component Breakdown */}
                {index.components && Object.keys(index.components).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Components:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      {Object.entries(index.components).map(([component, score]) => (
                        <div key={component} className="flex justify-between">
                          <span className="truncate pr-1" title={component}>
                            {component.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="font-medium">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Click to view detailed analysis, satellite data, and formulas
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          onClick={loadHealthData} 
          disabled={loading}
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Index Detail Modal */}
      <IndexDetailModal
        index={selectedIndex?.index || null}
        indexKey={selectedIndex?.key || ''}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        iconClass={selectedIndex ? `text-${INDEX_COLORS[selectedIndex.key as keyof typeof INDEX_COLORS]}` : ''}
      />
    </div>
  );
}

function getRecommendation(indexKey: string, index: UrbanIndex): string {
  const recommendations: Record<string, {
    description: string;
    policies: string[];
    penalties: string[];
    incentives: string[];
    actions: string[];
  }> = {
    cri: {
      description: "Focus on improving green infrastructure and heat wave preparedness systems.",
      policies: [
        "Mandate 30% green roof coverage for new buildings >1000 sqm",
        "Establish Urban Heat Island Reduction Standards",
        "Require Climate Adaptation Plans for critical infrastructure"
      ],
      penalties: [
        "₹50,000-5 lakh fines for non-compliance with green building codes",
        "Development permit suspension for projects without climate assessment",
        "Carbon tax of ₹2000/tonne CO2 for high-emission industries"
      ],
      incentives: [
        "50% property tax reduction for LEED Gold/Platinum buildings",
        "Fast-track permits for climate-resilient infrastructure projects",
        "Subsidies up to ₹10 lakh for rooftop solar + green roof combinations"
      ],
      actions: [
        "Install 1000 smart weather monitoring stations",
        "Create climate resilience fund of ₹500 crores",
        "Train 5000 urban planners in climate adaptation strategies"
      ]
    },
    uhvi: {
      description: "Implement cooling infrastructure and reduce urban heat island effects through vegetation.",
      policies: [
        "Minimum 40% tree canopy coverage in residential areas",
        "Cool roof standards for commercial buildings",
        "Ban on dark-colored pavements in high-heat zones"
      ],
      penalties: [
        "₹1-10 lakh fines for unauthorized tree removal",
        "₹25,000/day penalties for exceeding surface temperature limits",
        "Project delays for developments without cooling infrastructure"
      ],
      incentives: [
        "₹1000/tree planted in verified urban forestry programs",
        "Tax credits for installing cool roofs and reflective surfaces",
        "Free permit processing for projects with >50% green coverage"
      ],
      actions: [
        "Plant 100,000 native trees in heat-vulnerable neighborhoods",
        "Retrofit 500 buildings with cool roof technology",
        "Create 50 new pocket parks with water features"
      ]
    },
    aqhi: {
      description: "Address air pollution sources and improve air quality monitoring systems.",
      policies: [
        "Mandatory air quality impact assessments for industries",
        "Phase-out of diesel vehicles in city center by 2030",
        "Real-time emission monitoring for all industrial facilities"
      ],
      penalties: [
        "₹10-50 lakh fines for exceeding emission standards",
        "Closure orders for repeat pollution violators",
        "₹5000/day penalties for operating without valid pollution certificates"
      ],
      incentives: [
        "50% subsidy for electric vehicle conversion",
        "Tax breaks for industries adopting clean technology",
        "₹20,000 scrappage bonus for old vehicles"
      ],
      actions: [
        "Deploy 200 real-time air quality monitoring stations",
        "Establish 10 electric vehicle charging hubs",
        "Implement odd-even vehicle policy during high pollution days"
      ]
    },
    wsi: {
      description: "Enhance water security through better infrastructure and quality management.",
      policies: [
        "Mandatory rainwater harvesting for buildings >200 sqm",
        "Water recycling requirements for industries using >1000L/day",
        "Groundwater extraction limits with digital monitoring"
      ],
      penalties: [
        "₹2-20 lakh fines for groundwater over-extraction",
        "₹1000/KL charges for exceeding water allocation limits",
        "Permit cancellation for industries polluting water sources"
      ],
      incentives: [
        "₹50,000 subsidy for rainwater harvesting systems",
        "Reduced water tariffs for buildings with water recycling",
        "Free water audits and efficiency consulting"
      ],
      actions: [
        "Upgrade 15 water treatment plants with advanced technology",
        "Install smart water meters in 100,000 households",
        "Construct 25 community water storage and recycling facilities"
      ]
    },
    gea: {
      description: "Improve equitable access to green spaces across all neighborhoods.",
      policies: [
        "Minimum 9 sqm green space per resident requirement",
        "Mandatory green corridors connecting parks and natural areas",
        "Community participation requirements in green space planning"
      ],
      penalties: [
        "₹5-25 lakh penalties for unauthorized green space conversion",
        "Development restrictions in areas below green space thresholds",
        "₹10,000/sqm compensation for lost green areas"
      ],
      incentives: [
        "Land value capture bonuses for green space development",
        "Community grants up to ₹5 lakh for neighborhood gardens",
        "Property tax exemptions for maintaining private green spaces"
      ],
      actions: [
        "Create 30 new neighborhood parks in underserved areas",
        "Establish community gardening programs in 100 locations",
        "Develop green corridors along 50km of urban waterways"
      ]
    },
    scm: {
      description: "Strengthen community facilities and enhance public space connectivity.",
      policies: [
        "Community facility requirements for new residential developments",
        "Public space accessibility standards compliance",
        "Mandatory community consultation for major urban projects"
      ],
      penalties: [
        "₹1-10 lakh fines for inadequate community facility provision",
        "Project approval delays without community impact assessments",
        "₹25,000/month penalties for poorly maintained public spaces"
      ],
      incentives: [
        "FAR bonuses for developments with community facilities",
        "Grants up to ₹25 lakh for community center upgrades",
        "Tax incentives for businesses supporting local community programs"
      ],
      actions: [
        "Upgrade 50 community centers with modern facilities",
        "Create 20 multi-purpose community hubs",
        "Establish neighborhood committees in 200 areas"
      ]
    },
    ejt: {
      description: "Address environmental justice issues and ensure equitable resource distribution.",
      policies: [
        "Environmental justice impact assessments for all major projects",
        "Mandatory community benefit agreements for industrial developments",
        "Polluting facility location restrictions near vulnerable communities"
      ],
      penalties: [
        "₹25-100 lakh fines for environmental justice violations",
        "Project cancellation for inadequate community consultation",
        "₹50,000/day penalties for operating in non-compliant locations"
      ],
      incentives: [
        "Priority funding for environmental improvements in disadvantaged areas",
        "Community ownership opportunities in renewable energy projects",
        "Enhanced services and infrastructure investment in vulnerable neighborhoods"
      ],
      actions: [
        "Relocate 10 polluting industries away from residential areas",
        "Establish environmental justice monitoring in 25 vulnerable communities",
        "Create community-controlled environmental improvement fund"
      ]
    },
    tas: {
      description: "Expand public transit coverage and improve multi-modal transportation options.",
      policies: [
        "Transit-oriented development requirements within 500m of stations",
        "Complete streets design standards for all new roads",
        "Public transport accessibility standards for all developments"
      ],
      penalties: [
        "₹10-50 lakh fines for developments without adequate transit access",
        "Parking levy surcharges in areas with poor public transport",
        "₹1000/day penalties for blocking cycling or pedestrian infrastructure"
      ],
      incentives: [
        "Development bonuses for transit-oriented projects",
        "Subsidized public transport passes for low-income residents",
        "₹10,000 incentive for purchasing e-bikes or e-scooters"
      ],
      actions: [
        "Extend metro/BRT network by 100km",
        "Create 500km of protected cycling lanes",
        "Deploy 1000 electric buses with real-time tracking"
      ]
    },
    dpi: {
      description: "Strengthen disaster preparedness infrastructure and emergency response capabilities.",
      policies: [
        "Mandatory disaster risk assessments for all new constructions",
        "Building code updates incorporating climate change projections",
        "Community disaster preparedness training requirements"
      ],
      penalties: [
        "₹5-50 lakh fines for non-compliant disaster-resistant construction",
        "₹2000/day penalties for inadequate emergency equipment maintenance",
        "Project suspension for developments in high-risk areas without mitigation"
      ],
      incentives: [
        "Insurance premium reductions for disaster-resilient buildings",
        "Tax credits for installing emergency backup systems",
        "Grants up to ₹1 crore for community disaster preparedness programs"
      ],
      actions: [
        "Establish 100 community disaster response centers",
        "Upgrade early warning systems with AI-powered predictions",
        "Train 10,000 community disaster response volunteers"
      ]
    },
    hwi: {
      description: "Improve overall human well-being by addressing heat vulnerability, air quality, water security, social cohesion, transportation accessibility, and disaster preparedness holistically.",
      policies: [
        "Integrated Human Well-being Standards for all urban planning",
        "Health impact assessments mandatory for major developments",
        "Community well-being indicators in all policy evaluations"
      ],
      penalties: [
        "₹50-200 lakh fines for projects negatively impacting human well-being",
        "Development moratoriums in areas with declining well-being indices",
        "₹1 lakh/month penalties for inadequate well-being infrastructure maintenance"
      ],
      incentives: [
        "Well-being bonds with returns linked to community health improvements",
        "Priority investment for projects demonstrating well-being co-benefits",
        "Recognition and awards for developers exceeding well-being standards"
      ],
      actions: [
        "Launch integrated well-being improvement program across 50 neighborhoods",
        "Establish well-being monitoring dashboard with real-time community feedback",
        "Create cross-sector well-being task force with community representatives"
      ]
    }
  };
  
  const recommendation = recommendations[indexKey];
  if (!recommendation) {
    return "Continue monitoring and implementing improvement strategies.";
  }

  return `${recommendation.description}

**Policy Guidelines:**
${recommendation.policies.map(policy => `• ${policy}`).join('\n')}

**Penalties for Non-Compliance:**
${recommendation.penalties.map(penalty => `• ${penalty}`).join('\n')}

**Incentives for Industries/Developers:**
${recommendation.incentives.map(incentive => `• ${incentive}`).join('\n')}

**Required Actions:**
${recommendation.actions.map(action => `• ${action}`).join('\n')}`;
}