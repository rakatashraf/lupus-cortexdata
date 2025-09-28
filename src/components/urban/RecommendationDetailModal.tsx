import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Building2, 
  Users, 
  Calendar, 
  TrendingUp, 
  MapPin,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { UrbanIndex } from '@/types/urban-indices';
import { cn } from '@/lib/utils';

interface RecommendationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  indexKey: string;
  index: UrbanIndex;
}

interface RecommendationData {
  problemAnalysis: string;
  policyGuidance: {
    municipal: string[];
    regional: string[];
    federal: string[];
  };
  industryRegulations: {
    penalties: string[];
    compliance: string[];
    reporting: string[];
  };
  industryIncentives: {
    financial: string[];
    tax: string[];
    grants: string[];
  };
  individualActions: {
    immediate: string[];
    ongoing: string[];
    community: string[];
  };
  timeline: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  successMetrics: string[];
  caseStudies: {
    location: string;
    description: string;
    impact: string;
  }[];
}

const RECOMMENDATION_DATA: Record<string, RecommendationData> = {
  cri: {
    problemAnalysis: "Climate resilience is critical for urban sustainability. Low scores indicate vulnerability to extreme weather events, inadequate green infrastructure, and insufficient adaptation measures.",
    policyGuidance: {
      municipal: [
        "Implement Climate Action Plans with specific resilience targets",
        "Update building codes to require climate-adaptive design",
        "Create green infrastructure mandates for new developments",
        "Establish urban forest protection and expansion policies"
      ],
      regional: [
        "Coordinate watershed management across jurisdictions",
        "Develop regional climate risk assessment protocols",
        "Create inter-municipal emergency response frameworks",
        "Establish regional carbon pricing mechanisms"
      ],
      federal: [
        "Align with national climate adaptation strategies",
        "Access federal climate resilience funding programs",
        "Implement national building performance standards",
        "Participate in federal climate monitoring networks"
      ]
    },
    industryRegulations: {
      penalties: [
        "Carbon emission fines for high-polluting industries: $50-500 per ton CO2",
        "Non-compliance penalties for environmental impact assessments",
        "Mandatory climate risk disclosure requirements with fines up to $100,000",
        "Water usage restrictions with progressive penalty structure"
      ],
      compliance: [
        "Annual greenhouse gas reporting for facilities >25,000 tons CO2",
        "Climate risk assessments for critical infrastructure projects",
        "Mandatory energy efficiency audits every 3 years",
        "Green building certification requirements for new construction"
      ],
      reporting: [
        "Quarterly emission monitoring and public disclosure",
        "Annual sustainability reporting aligned with TCFD framework",
        "Real-time air quality data sharing for industrial facilities",
        "Water usage and quality monitoring with monthly reporting"
      ]
    },
    industryIncentives: {
      financial: [
        "Green bonds at 2-3% below market rates for climate projects",
        "Low-interest loans for renewable energy installations",
        "Climate resilience grants up to $5M for innovative projects",
        "Insurance premium reductions for climate-adapted facilities"
      ],
      tax: [
        "30% tax credit for renewable energy systems installation",
        "Accelerated depreciation for green infrastructure investments",
        "Property tax reductions for LEED-certified buildings",
        "Carbon offset tax deductions for verified sequestration projects"
      ],
      grants: [
        "Climate Innovation Fund: $100K-$2M for R&D projects",
        "Green Infrastructure Grants: Up to $10M for large-scale projects",
        "Community Resilience Grants: $50K-$500K for local initiatives",
        "Clean Technology Deployment Grants with 50% cost-sharing"
      ]
    },
    individualActions: {
      immediate: [
        "Install smart thermostats and LED lighting systems",
        "Choose renewable energy plans from utility providers",
        "Implement water conservation measures (low-flow fixtures, rain barrels)",
        "Start composting and reduce food waste by 30%"
      ],
      ongoing: [
        "Use public transportation, cycling, or walking for 50% of trips",
        "Support businesses with strong climate commitments",
        "Participate in community tree planting and maintenance programs",
        "Advocate for climate policies in local government meetings"
      ],
      community: [
        "Join or organize neighborhood climate action groups",
        "Participate in community solar or energy-sharing programs",
        "Support local climate adaptation planning processes",
        "Volunteer for environmental monitoring and restoration projects"
      ]
    },
    timeline: {
      shortTerm: [
        "Emergency preparedness system upgrades (6-12 months)",
        "Green infrastructure pilot projects in vulnerable areas",
        "Climate risk mapping and vulnerability assessments",
        "Community education and engagement campaigns"
      ],
      mediumTerm: [
        "Major green infrastructure deployment (2-3 years)",
        "Building retrofit programs for climate resilience",
        "Urban forest expansion and biodiversity enhancement",
        "Renewable energy transition for municipal operations"
      ],
      longTerm: [
        "Complete neighborhood resilience transformations (5-10 years)",
        "Carbon neutrality achievement by 2050",
        "Advanced climate monitoring and early warning systems",
        "Regional climate adaptation corridor development"
      ]
    },
    successMetrics: [
      "25% reduction in climate-related damages and losses",
      "50% increase in green infrastructure coverage",
      "30% improvement in community preparedness scores",
      "20% reduction in urban heat island effect intensity"
    ],
    caseStudies: [
      {
        location: "Rotterdam, Netherlands",
        description: "Implemented comprehensive water management and climate-proof planning",
        impact: "90% reduction in flood damage, became global model for climate adaptation"
      },
      {
        location: "Singapore",
        description: "Created 'City in a Garden' with extensive urban greening and water security",
        impact: "30% reduction in ambient temperature, 100% water self-sufficiency by 2061"
      }
    ]
  },
  uhvi: {
    problemAnalysis: "Urban heat vulnerability threatens public health and energy security. High UHVI scores indicate inadequate cooling infrastructure, limited green coverage, and vulnerable populations at risk.",
    policyGuidance: {
      municipal: [
        "Mandate cool roof and wall requirements for new buildings",
        "Create urban heat island reduction targets and action plans",
        "Establish tree canopy coverage requirements by neighborhood",
        "Implement cooling center network expansion policies"
      ],
      regional: [
        "Coordinate heat emergency response across municipalities",
        "Develop regional urban forestry management programs",
        "Create shared cooling infrastructure investment strategies",
        "Establish regional heat monitoring and alert systems"
      ],
      federal: [
        "Support national urban heat reduction initiatives",
        "Access federal infrastructure funding for cooling projects",
        "Align with national public health heat protection standards",
        "Participate in federal urban climate research programs"
      ]
    },
    industryRegulations: {
      penalties: [
        "Heat contribution penalties for high-emission industries",
        "Mandatory cool surface requirements with non-compliance fines",
        "Excessive energy usage penalties during peak heat periods",
        "Urban heat mitigation requirements for large developments"
      ],
      compliance: [
        "Cool roof installation requirements for commercial buildings >10,000 sq ft",
        "Mandatory shade structure requirements for employee outdoor areas",
        "Energy efficiency standards during extreme heat events",
        "Heat emergency response plan requirements for essential services"
      ],
      reporting: [
        "Annual heat island contribution assessments",
        "Real-time surface temperature monitoring for large facilities",
        "Employee heat stress incident reporting requirements",
        "Energy usage reporting during heat wave events"
      ]
    },
    industryIncentives: {
      financial: [
        "Cool roof installation rebates up to $2 per square foot",
        "Green roof incentive programs with 40% cost coverage",
        "Urban forestry partnership funding opportunities",
        "Energy efficiency upgrade loans at reduced interest rates"
      ],
      tax: [
        "Cool surface tax credits up to 25% of installation costs",
        "Property tax reductions for buildings with green cooling systems",
        "Accelerated depreciation for heat mitigation infrastructure",
        "Tree planting and maintenance tax deductions"
      ],
      grants: [
        "Urban Cooling Innovation Grants up to $1M",
        "Community Heat Reduction Grants for neighborhood projects",
        "Green Infrastructure Grants with focus on cooling benefits",
        "Research and development grants for cool technology innovations"
      ]
    },
    individualActions: {
      immediate: [
        "Install reflective window films and insulation improvements",
        "Create shade with awnings, umbrellas, or temporary structures",
        "Use fans and natural ventilation instead of AC when possible",
        "Plant trees and shrubs around homes for natural cooling"
      ],
      ongoing: [
        "Maintain and expand personal green spaces and gardens",
        "Choose light-colored, reflective materials for outdoor surfaces",
        "Support community tree planting and maintenance initiatives",
        "Reduce heat-generating activities during peak temperature hours"
      ],
      community: [
        "Advocate for more shade structures in public spaces",
        "Participate in neighborhood cooling corridor development",
        "Support vulnerable neighbors during heat waves",
        "Join community gardening and urban forestry programs"
      ]
    },
    timeline: {
      shortTerm: [
        "Emergency cooling center network expansion (3-6 months)",
        "Cool surface pilot projects in high-risk areas",
        "Community heat vulnerability mapping and outreach",
        "Rapid tree planting in heat-affected neighborhoods"
      ],
      mediumTerm: [
        "Comprehensive cool roof retrofit programs (1-3 years)",
        "Major urban forestry expansion and maintenance programs",
        "Green corridor development connecting cool spaces",
        "Advanced heat monitoring and early warning systems"
      ],
      longTerm: [
        "Complete neighborhood heat resilience transformation (5-10 years)",
        "Achievement of optimal urban forest canopy coverage",
        "Integration of smart cooling systems throughout the city",
        "Development of climate-adapted urban design standards"
      ]
    },
    successMetrics: [
      "5°C reduction in average urban heat island intensity",
      "40% increase in tree canopy coverage",
      "50% reduction in heat-related health incidents",
      "30% decrease in peak cooling energy demand"
    ],
    caseStudies: [
      {
        location: "Phoenix, Arizona",
        description: "Cool Pavement Program and urban forestry expansion",
        impact: "10°F surface temperature reduction, 23% increase in tree canopy"
      },
      {
        location: "Paris, France",
        description: "Green corridors and cool island creation during heat waves",
        impact: "Prevented estimated 435 heat-related deaths during 2019 heat wave"
      }
    ]
  },
  // ... add similar comprehensive data for other indices
  aqhi: {
    problemAnalysis: "Poor air quality poses severe health risks and environmental challenges. Low AQHI scores indicate high pollution levels, inadequate monitoring, and insufficient emission controls.",
    policyGuidance: {
      municipal: [
        "Implement Low Emission Zones with vehicle restrictions",
        "Mandate air quality monitoring in all neighborhoods",
        "Create buffer zones around schools and healthcare facilities",
        "Establish industrial emission reduction targets"
      ],
      regional: [
        "Coordinate emission reduction strategies across jurisdictions",
        "Develop regional air quality monitoring networks",
        "Create joint enforcement mechanisms for pollution control",
        "Establish regional clean air action plans"
      ],
      federal: [
        "Align with national air quality standards and regulations",
        "Access federal funding for air quality improvement projects",
        "Implement national vehicle emission standards",
        "Participate in federal air quality research initiatives"
      ]
    },
    industryRegulations: {
      penalties: [
        "Air pollution fines: $1,000-$50,000 per violation depending on severity",
        "Excess emission penalties with escalating fee structure",
        "Operating permit revocation for repeated violations",
        "Mandatory pollution control equipment upgrade requirements"
      ],
      compliance: [
        "Continuous emission monitoring for facilities >250 employees",
        "Annual air quality impact assessments",
        "Mandatory pollution prevention plan updates every 2 years",
        "Real-time emission reporting requirements"
      ],
      reporting: [
        "Daily emission data submission to regulatory authorities",
        "Public disclosure of air quality impact data",
        "Incident reporting within 24 hours of exceedances",
        "Annual community air quality impact reports"
      ]
    },
    industryIncentives: {
      financial: [
        "Clean air technology grants up to $3M per facility",
        "Low-interest loans for pollution control equipment",
        "Air quality improvement bonds with favorable terms",
        "Insurance premium reductions for clean technology adoption"
      ],
      tax: [
        "50% tax credit for installation of advanced pollution control systems",
        "Accelerated depreciation for clean air technology investments",
        "Emission reduction tax credits based on verified improvements",
        "Green technology research and development tax deductions"
      ],
      grants: [
        "Clean Air Innovation Fund: $500K-$5M for breakthrough technologies",
        "Community Air Quality Grants for local improvement projects",
        "Industrial Transition Grants for clean technology adoption",
        "Air Quality Monitoring Enhancement Grants"
      ]
    },
    individualActions: {
      immediate: [
        "Use public transit, walk, or bike instead of driving",
        "Choose electric or hybrid vehicles for necessary car travel",
        "Avoid outdoor activities during high pollution alerts",
        "Install air purifiers in homes and workplaces"
      ],
      ongoing: [
        "Support clean energy choices and renewable electricity plans",
        "Reduce energy consumption through efficiency improvements",
        "Choose locally-produced goods to reduce transportation emissions",
        "Participate in car-free days and sustainable transportation initiatives"
      ],
      community: [
        "Advocate for clean air policies and enforcement",
        "Participate in community air quality monitoring programs",
        "Support public transit expansion and active transportation infrastructure",
        "Join environmental justice advocacy for clean air in all neighborhoods"
      ]
    },
    timeline: {
      shortTerm: [
        "Enhanced air quality monitoring network deployment (6-12 months)",
        "Emergency air quality alert system implementation",
        "Industrial emission inspection and enforcement intensification",
        "Community education and health protection programs"
      ],
      mediumTerm: [
        "Low emission zone implementation and expansion (2-4 years)",
        "Major industrial emission reduction program completion",
        "Public transit electrification and expansion",
        "Green space expansion for natural air filtration"
      ],
      longTerm: [
        "Achievement of WHO air quality guidelines (5-10 years)",
        "Complete transition to clean transportation systems",
        "Zero-emission industrial zones development",
        "Advanced air quality prediction and management systems"
      ]
    },
    successMetrics: [
      "50% reduction in PM2.5 concentrations",
      "75% decrease in nitrogen dioxide levels",
      "30% reduction in respiratory health incidents",
      "90% of population living in areas meeting air quality standards"
    ],
    caseStudies: [
      {
        location: "Beijing, China",
        description: "Comprehensive air pollution control with industrial restructuring",
        impact: "35% reduction in PM2.5 levels from 2013-2020, improved public health outcomes"
      },
      {
        location: "London, UK",
        description: "Ultra Low Emission Zone implementation with congestion charging",
        impact: "46% reduction in roadside NO2 concentrations, cleaner air for 4 million residents"
      }
    ]
  }
};

export function RecommendationDetailModal({ 
  isOpen, 
  onClose, 
  indexKey, 
  index 
}: RecommendationDetailModalProps) {
  const data = RECOMMENDATION_DATA[indexKey];
  const gap = index.target - index.total_score;
  const priority = gap > 10 ? 'high' : gap > 5 ? 'medium' : 'low';

  if (!data) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {index.index_name} - Improvement Strategy
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    priority === 'high' && "bg-destructive/20 text-destructive border-destructive/30",
                    priority === 'medium' && "bg-warning/20 text-warning border-warning/30",
                    priority === 'low' && "bg-info/20 text-info border-info/30"
                  )}
                >
                  {priority} priority
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Gap: {gap} points • Target: {index.target}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Plan
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="success">Success</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Problem Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{data.problemAnalysis}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Case Studies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.caseStudies.map((study, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h4 className="font-medium">{study.location}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{study.description}</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <p className="text-sm font-medium text-success">{study.impact}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Success Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.successMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm">{metric}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policy" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Municipal Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.policyGuidance.municipal.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Regional Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.policyGuidance.regional.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Federal Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.policyGuidance.federal.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="industry" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Penalties & Regulations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Financial Penalties</h4>
                      <ul className="space-y-1">
                        {data.industryRegulations.penalties.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Compliance Requirements</h4>
                      <ul className="space-y-1">
                        {data.industryRegulations.compliance.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Reporting Requirements</h4>
                      <ul className="space-y-1">
                        {data.industryRegulations.reporting.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <TrendingUp className="h-5 w-5" />
                    Incentives & Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Financial Incentives</h4>
                      <ul className="space-y-1">
                        {data.industryIncentives.financial.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Tax Benefits</h4>
                      <ul className="space-y-1">
                        {data.industryIncentives.tax.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Grants & Funding</h4>
                      <ul className="space-y-1">
                        {data.industryIncentives.grants.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Immediate Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.individualActions.immediate.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Ongoing Commitments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.individualActions.ongoing.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Community Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.individualActions.community.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <Calendar className="h-5 w-5" />
                    Short-term (6 months - 2 years)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.timeline.shortTerm.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <Calendar className="h-5 w-5" />
                    Medium-term (2-5 years)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.timeline.mediumTerm.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    Long-term (5+ years)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.timeline.longTerm.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="success" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.successMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">{metric}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Implementation Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Access Implementation Toolkit
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Download Progress Tracking Template
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Connect with Local Implementation Partners
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}