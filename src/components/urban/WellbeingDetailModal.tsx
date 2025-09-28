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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Clock,
  Heart,
  TreePine,
  Car,
  Home,
  ChevronDown,
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WellbeingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: string;
  score: number;
  status: string;
}

interface WellbeingData {
  icon: React.ReactNode;
  title: string;
  description: string;
  problemAnalysis: string;
  urbanPlannerSolutions: {
    technical: string[];
    policy: string[];
    implementation: string[];
    budget: string[];
  };
  residentPerspective: {
    impact: string;
    benefits: string[];
    timeline: string;
    actions: string[];
  };
  livingConsiderations: {
    familyImpact: string;
    longTermOutlook: string;
    hiddenCosts: string[];
    riskFactors: string[];
    lifestyleMatch: string;
  };
  buildingConsiderations: {
    permits: string[];
    constraints: string[];
    futureProofing: string[];
    investment: string;
    timeline: string;
    regulations: string[];
  };
  successMetrics: string[];
  caseStudies: {
    location: string;
    description: string;
    impact: string;
  }[];
}

const WELLBEING_DATA: Record<string, WellbeingData> = {
  'community-health': {
    icon: <Heart className="h-5 w-5" />,
    title: 'Community Health Score',
    description: 'Air quality, pollution levels, and environmental health factors',
    problemAnalysis: 'Poor air quality and environmental pollution create serious health risks, particularly affecting children, elderly residents, and those with respiratory conditions. High pollution levels increase healthcare costs and reduce quality of life.',
    urbanPlannerSolutions: {
      technical: [
        'Install air quality monitoring stations throughout neighborhoods',
        'Create green buffer zones around industrial areas and major roads',
        'Implement Low Emission Zones (LEZ) with vehicle restrictions',
        'Design wind corridors to improve natural air circulation',
        'Mandate green roofs and walls for new developments over 5 stories'
      ],
      policy: [
        'Establish maximum pollution thresholds with automatic enforcement',
        'Require Environmental Impact Assessments for all major developments',
        'Create car-free zones during high pollution days',
        'Implement congestion pricing to reduce vehicle emissions',
        'Mandate 30% green space requirement in all new developments'
      ],
      implementation: [
        'Phase 1 (6-12 months): Emergency air quality monitoring and alert systems',
        'Phase 2 (1-2 years): Green infrastructure pilot projects in worst-affected areas',
        'Phase 3 (3-5 years): Complete Low Emission Zone implementation',
        'Phase 4 (5-10 years): Achieve WHO air quality standards city-wide'
      ],
      budget: [
        'Air quality monitoring network: $2-5M initial investment',
        'Green infrastructure development: $10-20M over 5 years',
        'Low Emission Zone setup and enforcement: $5-8M',
        'Public health monitoring and programs: $3-5M annually'
      ]
    },
    residentPerspective: {
      impact: 'Clean air means your family can breathe easier and spend more time outdoors. Children can play outside safely, elderly family members have fewer health issues, and everyone enjoys better sleep and energy levels.',
      benefits: [
        'Reduced asthma and respiratory problems, especially in children',
        'Lower healthcare costs and fewer sick days from work/school',
        'More enjoyable outdoor activities and exercise opportunities',
        'Increased property values in cleaner, healthier neighborhoods',
        'Better sleep quality and overall mental wellbeing'
      ],
      timeline: 'You might notice improvements in air quality within 6-12 months as monitoring and green projects begin. Major health benefits typically become evident after 2-3 years of sustained improvements.',
      actions: [
        'Use public transit, walk, or bike instead of driving when possible',
        'Support local policies for cleaner air and green spaces',
        'Plant trees and maintain gardens to improve local air quality',
        'Choose energy-efficient appliances and renewable energy options',
        'Participate in community air quality monitoring and advocacy'
      ]
    },
    livingConsiderations: {
      familyImpact: "Children and elderly residents may experience respiratory issues. Consider air purifiers and limiting outdoor activities during high pollution days.",
      longTermOutlook: "Air quality is expected to improve significantly over the next 5-10 years with planned green corridors and emission controls.",
      hiddenCosts: ["Higher healthcare costs", "Air purification systems", "Indoor activities during poor air days", "Potential property value impacts"],
      riskFactors: ["Increased asthma and allergies", "Reduced property values", "Limited outdoor lifestyle", "Healthcare access needs"],
      lifestyleMatch: "Best suited for residents who spend most time indoors or have flexible schedules to avoid peak pollution hours."
    },
    buildingConsiderations: {
      permits: ["Environmental impact assessment", "Air quality compliance certification", "Green building permits"],
      constraints: ["Enhanced HVAC filtration required", "Sealed building envelope necessary", "Limited outdoor ventilation systems"],
      futureProofing: ["Install high-efficiency air filtration", "Design for natural ventilation when air improves", "Consider rooftop gardens", "Plan for EV charging infrastructure"],
      investment: "Property values may initially be lower but expected to increase 15-25% as air quality improves over next decade.",
      timeline: "Construction may face delays during high pollution days. Plan for 10-15% longer timeline.",
      regulations: ["New buildings must meet enhanced air quality standards", "Green roof requirements coming in 2025", "Emission control zones expanding"]
    },
    successMetrics: [
      '50% reduction in PM2.5 and NO2 concentrations',
      '30% decrease in respiratory health incidents',
      '25% increase in green space coverage',
      '40% reduction in vehicle emissions'
    ],
    caseStudies: [
      {
        location: 'London, UK',
        description: 'Ultra Low Emission Zone implementation with extensive monitoring',
        impact: '44% reduction in NO2 concentrations, 20% reduction in childhood asthma cases'
      },
      {
        location: 'Seoul, South Korea',
        description: 'Comprehensive air quality improvement with green infrastructure',
        impact: '30% improvement in air quality, 15% increase in outdoor recreation'
      }
    ]
  },
  'walkability': {
    icon: <Car className="h-5 w-5" />,
    title: 'Walkability Index',
    description: 'Pedestrian infrastructure, safety, and accessibility for walking',
    problemAnalysis: 'Poor walkability forces residents to rely heavily on cars, increasing traffic congestion, pollution, and social isolation. Lack of pedestrian infrastructure creates safety hazards and limits access to services for those without vehicles.',
    urbanPlannerSolutions: {
      technical: [
        'Design complete streets with protected bike lanes and wide sidewalks',
        'Install pedestrian-activated crossing signals and countdown timers',
        'Create pedestrian bridges and underpasses at major intersections',
        'Implement traffic calming measures like speed bumps and narrowed lanes',
        'Add street lighting, benches, and weather protection along walking routes'
      ],
      policy: [
        'Mandate minimum sidewalk widths (8ft) for all new developments',
        'Require mixed-use zoning to reduce travel distances',
        'Implement 15-minute neighborhood planning standards',
        'Create car-free zones around schools and community centers',
        'Establish maximum block lengths (300ft) to improve connectivity'
      ],
      implementation: [
        'Phase 1 (3-6 months): Safety improvements at high-traffic intersections',
        'Phase 2 (6-18 months): Complete streets retrofits on major corridors',
        'Phase 3 (2-4 years): Neighborhood-wide walkability improvements',
        'Phase 4 (5-8 years): Achieve comprehensive pedestrian network connectivity'
      ],
      budget: [
        'Intersection safety improvements: $50K-200K per location',
        'Complete streets retrofits: $1-3M per mile',
        'Pedestrian infrastructure: $500K-1M per neighborhood',
        'Maintenance and operations: $200K-500K annually'
      ]
    },
    residentPerspective: {
      impact: 'Great walkability means you can easily walk to the store, school, or work without worrying about safety. Children can walk to school independently, seniors can stay active and connected, and everyone saves money on transportation.',
      benefits: [
        'Save money on gas, parking, and car maintenance costs',
        'Get daily exercise naturally through walking for errands',
        'Stronger sense of community through more street-level interactions',
        'Safer streets for children to play and walk to school',
        'Better access to local businesses, services, and amenities'
      ],
      timeline: 'Initial safety improvements like better crosswalks appear within 3-6 months. Major walkability enhancements typically take 1-3 years to complete, with full neighborhood transformation occurring over 5-8 years.',
      actions: [
        'Advocate for better sidewalks and crosswalks in city council meetings',
        'Support local businesses within walking distance of your home',
        'Participate in community walks to identify problem areas',
        'Report dangerous intersections or missing infrastructure to city officials',
        'Join or organize neighborhood walking groups for safety and advocacy'
      ]
    },
    livingConsiderations: {
      familyImpact: "Car-dependent lifestyle necessary. Budget for vehicle costs, insurance, and gas. Children may need rides to activities and school.",
      longTermOutlook: "Major walkability improvements planned with new sidewalks, bike lanes, and mixed-use development over next 5 years.",
      hiddenCosts: ["Higher transportation costs", "Vehicle maintenance", "Parking fees", "Gas and insurance", "Uber/taxi for non-drivers"],
      riskFactors: ["Social isolation for elderly", "Limited independence for teenagers", "Safety concerns walking at night", "Weather-dependent mobility"],
      lifestyleMatch: "Ideal for car owners and families comfortable with suburban living. Challenging for those preferring walkable urban lifestyle."
    },
    buildingConsiderations: {
      permits: ["Parking space requirements", "Sidewalk connection permits", "Access road approvals"],
      constraints: ["Minimum parking spaces required", "Setback requirements from future sidewalks", "Limited public transit access"],
      futureProofing: ["Design for reduced parking needs", "Include bike storage", "Plan pedestrian access routes", "Consider mixed-use potential"],
      investment: "Properties near planned walkability improvements may see 20-30% value increase as infrastructure develops.",
      timeline: "Construction easier due to car access, but plan for future pedestrian infrastructure work affecting access.",
      regulations: ["New developments must include sidewalk connections", "Parking minimums being reduced", "Complete streets policy coming 2026"]
    },
    successMetrics: [
      '80% of residents living within 10-minute walk of daily services',
      '50% reduction in pedestrian accidents and injuries',
      '30% increase in walking trips for daily errands',
      '25% reduction in household transportation costs'
    ],
    caseStudies: [
      {
        location: 'Copenhagen, Denmark',
        description: 'Comprehensive pedestrian and cycling infrastructure development',
        impact: '41% of commuters walk or bike daily, 96% feel safe walking at night'
      },
      {
        location: 'Portland, Oregon',
        description: 'Complete streets policy with neighborhood walkability focus',
        impact: '70% increase in walking trips, 35% reduction in traffic fatalities'
      }
    ]
  },
  'living-comfort': {
    icon: <Home className="h-5 w-5" />,
    title: 'Living Comfort',
    description: 'Housing quality, utilities, and infrastructure reliability',
    problemAnalysis: 'Poor living comfort indicates inadequate housing quality, unreliable utilities, and insufficient infrastructure. This affects residents\' daily lives, health, and financial stability through high utility costs and maintenance issues.',
    urbanPlannerSolutions: {
      technical: [
        'Upgrade electrical grid to support modern energy demands',
        'Implement smart water management systems with leak detection',
        'Mandate energy-efficient building standards (LEED certification)',
        'Install district heating/cooling systems for improved efficiency',
        'Create resilient utility infrastructure with backup systems'
      ],
      policy: [
        'Establish mandatory energy efficiency standards for all buildings',
        'Require utility reliability targets (99.9% uptime minimum)',
        'Implement rent stabilization policies to ensure affordable quality housing',
        'Create housing quality inspection programs with enforcement',
        'Mandate green building standards for all new construction'
      ],
      implementation: [
        'Phase 1 (6-12 months): Critical infrastructure assessment and emergency repairs',
        'Phase 2 (1-3 years): Systematic utility upgrades and modernization',
        'Phase 3 (3-5 years): Housing quality improvement programs',
        'Phase 4 (5-10 years): Achieve modern infrastructure standards city-wide'
      ],
      budget: [
        'Utility infrastructure upgrades: $20-50M over 5 years',
        'Housing quality improvement programs: $10-25M',
        'Energy efficiency retrofit programs: $15-30M',
        'Smart infrastructure systems: $5-15M'
      ]
    },
    residentPerspective: {
      impact: 'Better living comfort means lower utility bills, more reliable electricity and water, comfortable indoor temperatures year-round, and homes that maintain their value. Families spend less on repairs and have more predictable monthly expenses.',
      benefits: [
        'Lower monthly electricity, gas, and water bills',
        'More reliable utilities with fewer outages and service interruptions',
        'Better indoor air quality and temperature control',
        'Increased property values and home equity',
        'Reduced stress from utility problems and home maintenance issues'
      ],
      timeline: 'Basic utility improvements may be noticeable within 6-12 months. Significant comfort improvements typically occur over 2-4 years as infrastructure upgrades are completed.',
      actions: [
        'Upgrade to energy-efficient appliances and LED lighting',
        'Improve home insulation and weatherproofing',
        'Participate in utility rebate programs for efficiency improvements',
        'Report utility problems promptly to service providers',
        'Support local policies for infrastructure investment and housing quality standards'
      ]
    },
    livingConsiderations: {
      familyImpact: "High utility bills strain family budgets. Inconsistent heating/cooling affects comfort and may impact health of vulnerable family members.",
      longTermOutlook: "City investing in smart grid and efficiency programs. Expect 30-40% reduction in utility costs over next 3-5 years.",
      hiddenCosts: ["Unexpectedly high utility bills", "Inefficient appliance replacement", "Backup heating/cooling systems", "Insulation improvements"],
      riskFactors: ["Power outages during extreme weather", "Aging utility infrastructure", "Rising energy costs", "HVAC system failures"],
      lifestyleMatch: "Suitable for energy-conscious residents willing to invest in efficiency. Challenging for those on fixed incomes."
    },
    buildingConsiderations: {
      permits: ["Energy efficiency compliance", "Solar panel permits", "HVAC upgrade permits", "Electrical system permits"],
      constraints: ["Aging electrical grid capacity", "Limited renewable energy connections", "Insulation requirements", "HVAC sizing restrictions"],
      futureProofing: ["Install solar-ready infrastructure", "Plan for battery storage", "Design for smart home integration", "Include EV charging capability"],
      investment: "Energy-efficient homes command 10-15% premium and have lower operating costs, improving long-term ROI.",
      timeline: "Utility connections may have delays. Plan for temporary power solutions during construction.",
      regulations: ["Net-zero energy requirements for new construction starting 2027", "Solar-ready requirements", "Enhanced insulation standards"]
    },
    successMetrics: [
      '30% reduction in average household utility costs',
      '99.5% utility reliability (less than 4 hours outage per year)',
      '50% of housing stock meets modern efficiency standards',
      '25% reduction in housing maintenance and repair costs'
    ],
    caseStudies: [
      {
        location: 'Vienna, Austria',
        description: 'Comprehensive social housing with high energy efficiency standards',
        impact: '60% of residents in high-quality, affordable housing with 40% lower energy costs'
      },
      {
        location: 'Singapore',
        description: 'Smart utility infrastructure with predictive maintenance',
        impact: '99.9% utility reliability, 30% reduction in infrastructure maintenance costs'
      }
    ]
  },
  'recreation': {
    icon: <TreePine className="h-5 w-5" />,
    title: 'Fun & Recreation',
    description: 'Access to parks, activities, and recreational opportunities',
    problemAnalysis: 'Limited recreational opportunities lead to reduced physical activity, social isolation, and decreased mental health. Lack of parks and community spaces particularly affects children\'s development and family well-being.',
    urbanPlannerSolutions: {
      technical: [
        'Design neighborhood parks within 10-minute walk of all residents',
        'Create multi-use recreational facilities (community centers, sports complexes)',
        'Install playground equipment meeting modern safety and accessibility standards',
        'Develop trail systems connecting neighborhoods to regional parks',
        'Add outdoor fitness equipment and sports courts in public spaces'
      ],
      policy: [
        'Mandate minimum 10% open space requirement for all developments',
        'Establish park equity standards ensuring equal access across neighborhoods',
        'Create programming requirements for community centers and public facilities',
        'Implement public art and cultural space requirements in new developments',
        'Establish maintenance standards and funding for long-term park upkeep'
      ],
      implementation: [
        'Phase 1 (3-6 months): Identify underserved areas and priority park locations',
        'Phase 2 (6-18 months): Develop pocket parks and improve existing facilities',
        'Phase 3 (2-4 years): Create major recreational facilities and trail connections',
        'Phase 4 (5-10 years): Achieve comprehensive recreational network'
      ],
      budget: [
        'Neighborhood park development: $500K-2M per park',
        'Community center construction: $5-15M per facility',
        'Trail development: $100K-500K per mile',
        'Annual programming and maintenance: $200K-1M per facility'
      ]
    },
    residentPerspective: {
      impact: 'Great recreational opportunities mean your family has safe, fun places to spend time together. Children have space to play and develop, parents can exercise and relax, and the whole community becomes more connected and vibrant.',
      benefits: [
        'Free, safe places for children to play and exercise',
        'Opportunities to meet neighbors and build community connections',
        'Improved physical and mental health through outdoor activities',
        'Higher property values near quality parks and recreational facilities',
        'Year-round programming and events that bring families together'
      ],
      timeline: 'Small park improvements and programming may begin within 6-12 months. Major recreational facilities typically take 2-4 years to plan and build, with full recreational networks developing over 5-8 years.',
      actions: [
        'Participate in community meetings about park planning and programming',
        'Volunteer for park maintenance, events, and youth programs',
        'Support local funding measures for parks and recreation',
        'Use existing parks and facilities to demonstrate community demand',
        'Advocate for inclusive programming that serves all ages and abilities'
      ]
    },
    livingConsiderations: {
      familyImpact: "Limited activities for children and teens. Families may need to travel farther for sports, parks, and entertainment.",
      longTermOutlook: "Major recreation complex and multiple parks planned. Community will become much more family-friendly over next 4-6 years.",
      hiddenCosts: ["Travel costs to recreation areas", "Private gym memberships", "Entertainment outside community", "Children's activity fees"],
      riskFactors: ["Social isolation for families", "Limited youth engagement", "Reduced property appeal", "Community brain drain"],
      lifestyleMatch: "Good for residents who create their own entertainment or don't prioritize recreational amenities. Less ideal for active families."
    },
    buildingConsiderations: {
      permits: ["Recreation facility permits", "Open space requirements", "Community center approvals"],
      constraints: ["Recreation space dedication required", "Proximity to future park sites", "Community facility impact fees"],
      futureProofing: ["Design community-friendly spaces", "Include recreation room/gym", "Plan for neighborhood gathering areas", "Consider sport court space"],
      investment: "Properties near planned recreation facilities expected to see 25-35% value increase upon completion.",
      timeline: "Construction may coordinate with park development. Potential for shared utility installation.",
      regulations: ["New developments must contribute to park fund", "Recreation space requirements increasing", "Community facility impact fees rising"]
    },
    successMetrics: [
      '90% of residents within 10-minute walk of quality recreational space',
      '75% increase in park and facility usage',
      '50% increase in youth and family participation in recreational programs',
      '30% improvement in community social cohesion metrics'
    ],
    caseStudies: [
      {
        location: 'Melbourne, Australia',
        description: 'Comprehensive park network with programming for all ages',
        impact: '95% resident satisfaction with parks, 60% increase in physical activity'
      },
      {
        location: 'Medellín, Colombia',
        description: 'Transformed neighborhoods through strategic park and facility investment',
        impact: '80% reduction in crime, 200% increase in property values near parks'
      }
    ]
  }
};

const WellbeingDetailModal: React.FC<WellbeingDetailModalProps> = ({
  isOpen,
  onClose,
  metric,
  score,
  status
}) => {
  const data = WELLBEING_DATA[metric];
  
  if (!data) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent':
      case 'great':
      case 'lots to do':
        return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'good':
      case 'some options':
      case 'standard quality':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default:
        return 'text-red-400 border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {data.icon}
            {data.title}
            <Badge 
              variant="outline" 
              className={cn("font-semibold", getStatusColor(status))}
            >
              {status} ({score}%)
            </Badge>
          </DialogTitle>
          <p className="text-muted-foreground">{data.description}</p>
        </DialogHeader>

        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Urban Planner View
            </TabsTrigger>
            <TabsTrigger value="resident" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resident View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Problem Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{data.problemAnalysis}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Technical Solutions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.urbanPlannerSolutions.technical.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Policy Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.urbanPlannerSolutions.policy.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Implementation Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.urbanPlannerSolutions.implementation.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Budget Considerations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.urbanPlannerSolutions.budget.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground font-mono text-xs mt-0.5">$</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resident" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  What This Means for You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{data.residentPerspective.impact}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    How You Benefit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.residentPerspective.benefits.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-blue-500" />
                    How You Can Help
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.residentPerspective.actions.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-500" />
                  When to Expect Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">{data.residentPerspective.timeline}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Considering Living Here?
                  </h4>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg space-y-4">
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Family Impact</h5>
                      <p className="text-sm">{data.livingConsiderations.familyImpact}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Long-term Outlook</h5>
                      <p className="text-sm">{data.livingConsiderations.longTermOutlook}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Lifestyle Match</h5>
                      <p className="text-sm">{data.livingConsiderations.lifestyleMatch}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Hidden Costs to Consider</h5>
                      <ul className="space-y-1">
                        {data.livingConsiderations.hiddenCosts.map((cost, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-orange-400 rounded-full flex-shrink-0" />
                            <span>{cost}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Potential Risks</h5>
                      <ul className="space-y-1">
                        {data.livingConsiderations.riskFactors.map((risk, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-red-400 rounded-full flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Planning to Build Here?
                  </h4>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 border rounded-lg space-y-4">
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Required Permits</h5>
                      <ul className="space-y-1">
                        {data.buildingConsiderations.permits.map((permit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                            <span>{permit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Construction Constraints</h5>
                      <ul className="space-y-1">
                        {data.buildingConsiderations.constraints.map((constraint, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                            <span>{constraint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Future-Proofing Tips</h5>
                      <ul className="space-y-1">
                        {data.buildingConsiderations.futureProofing.map((tip, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-green-400 rounded-full flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Investment Outlook</h5>
                      <p className="text-sm">{data.buildingConsiderations.investment}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Timeline Considerations</h5>
                      <p className="text-sm">{data.buildingConsiderations.timeline}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-xs text-muted-foreground mb-1">Upcoming Regulations</h5>
                      <ul className="space-y-1">
                        {data.buildingConsiderations.regulations.map((regulation, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 bg-purple-400 rounded-full flex-shrink-0" />
                            <span>{regulation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Success Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.successMetrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{metric}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Success Stories
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.caseStudies.map((study, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-sm">{study.location}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{study.description}</p>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-medium text-green-400">{study.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WellbeingDetailModal;