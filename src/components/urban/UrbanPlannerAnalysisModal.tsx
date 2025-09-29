import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Building, 
  TreePine, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  FileText,
  Target,
  TrendingUp
} from 'lucide-react';
import { CommunityNeed } from '@/utils/community-needs-calculator';
import { reverseGeocode } from '@/services/geolocation-service';

interface UrbanPlannerAnalysisModalProps {
  need: CommunityNeed | null;
  isOpen: boolean;
  onClose: () => void;
}

interface LocationDetails {
  address: string;
  neighborhood: string;
  district: string;
  populationDensity: number;
  landUse: string;
  nearbyServices: string[];
  transitAccess: string;
  walkabilityScore: number;
}

interface UrbanAnalysis {
  immediateActions: Array<{ action: string; timeline: string; cost: string; }>;
  shortTermPlan: Array<{ intervention: string; timeline: string; budget: string; }>;
  longTermPlan: Array<{ strategy: string; timeline: string; investment: string; }>;
  stakeholders: Array<{ name: string; role: string; contact?: string; }>;
  regulatoryRequirements: string[];
  successMetrics: string[];
  riskFactors: string[];
}

const severityColors = {
  critical: 'destructive',
  moderate: 'secondary',
  good: 'default'
} as const;

const generateUrbanAnalysis = (need: CommunityNeed, locationDetails: LocationDetails): UrbanAnalysis => {
  const baseAnalysis = {
    'food-access': {
      immediateActions: [
        { action: 'Emergency food distribution setup', timeline: '0-2 weeks', cost: '$5,000-10,000' },
        { action: 'Community needs survey', timeline: '2-4 weeks', cost: '$2,000-3,000' },
        { action: 'Partner with existing food banks', timeline: '1-2 months', cost: '$1,000-2,000' }
      ],
      shortTermPlan: [
        { intervention: 'Mobile food market pilot', timeline: '3-6 months', budget: '$25,000-40,000' },
        { intervention: 'Community garden establishment', timeline: '6-12 months', budget: '$15,000-25,000' },
        { intervention: 'Local retailer partnerships', timeline: '6-18 months', budget: '$10,000-20,000' }
      ],
      longTermPlan: [
        { strategy: 'Permanent community food hub', timeline: '2-3 years', investment: '$150,000-300,000' },
        { strategy: 'Urban farming infrastructure', timeline: '3-5 years', investment: '$100,000-200,000' },
        { strategy: 'Food security policy framework', timeline: '1-5 years', investment: '$50,000-100,000' }
      ],
      stakeholders: [
        { name: 'Local Food Authority', role: 'Regulatory oversight' },
        { name: 'Community Development Corporation', role: 'Implementation partner' },
        { name: 'Resident Association', role: 'Community liaison' },
        { name: 'Public Health Department', role: 'Health impact assessment' }
      ]
    },
    'housing': {
      immediateActions: [
        { action: 'Housing condition assessment', timeline: '1-2 months', cost: '$10,000-15,000' },
        { action: 'Emergency repair program', timeline: '0-3 months', cost: '$25,000-50,000' },
        { action: 'Tenant rights workshops', timeline: '1 month', cost: '$2,000-5,000' }
      ],
      shortTermPlan: [
        { intervention: 'Affordable housing fund', timeline: '6-12 months', budget: '$500,000-1M' },
        { intervention: 'Housing rehabilitation grants', timeline: '12-18 months', budget: '$200,000-400,000' },
        { intervention: 'First-time buyer assistance', timeline: '6-24 months', budget: '$100,000-300,000' }
      ],
      longTermPlan: [
        { strategy: 'Mixed-income development', timeline: '3-7 years', investment: '$5-15M' },
        { strategy: 'Community land trust', timeline: '2-5 years', investment: '$1-5M' },
        { strategy: 'Inclusionary zoning policy', timeline: '1-3 years', investment: '$50,000-200,000' }
      ],
      stakeholders: [
        { name: 'Housing Authority', role: 'Policy implementation' },
        { name: 'Real Estate Development Board', role: 'Development coordination' },
        { name: 'Legal Aid Society', role: 'Tenant advocacy' },
        { name: 'City Planning Department', role: 'Zoning and permits' }
      ]
    },
    'transportation': {
      immediateActions: [
        { action: 'Bus route optimization study', timeline: '2-3 months', cost: '$15,000-25,000' },
        { action: 'Accessibility audit', timeline: '1-2 months', cost: '$8,000-12,000' },
        { action: 'Community shuttle pilot', timeline: '3-6 months', cost: '$30,000-50,000' }
      ],
      shortTermPlan: [
        { intervention: 'Bus stop improvements', timeline: '6-12 months', budget: '$50,000-100,000' },
        { intervention: 'Bike lane infrastructure', timeline: '12-18 months', budget: '$200,000-400,000' },
        { intervention: 'Ride-sharing partnerships', timeline: '3-6 months', budget: '$10,000-25,000' }
      ],
      longTermPlan: [
        { strategy: 'BRT corridor development', timeline: '5-10 years', investment: '$50-200M' },
        { strategy: 'Multi-modal transit hub', timeline: '3-7 years', investment: '$10-50M' },
        { strategy: 'Complete streets redesign', timeline: '2-5 years', investment: '$5-20M' }
      ],
      stakeholders: [
        { name: 'Transit Authority', role: 'Service provision' },
        { name: 'Department of Transportation', role: 'Infrastructure planning' },
        { name: 'Disability Rights Coalition', role: 'Accessibility advocacy' },
        { name: 'Bicycle Coalition', role: 'Active transport promotion' }
      ]
    }
  };

  const analysis = baseAnalysis[need.type as keyof typeof baseAnalysis] || baseAnalysis['food-access'];

  return {
    ...analysis,
    regulatoryRequirements: [
      'Environmental impact assessment',
      'Community consultation process',
      'Zoning compliance review',
      'Building permits and inspections',
      'Public procurement guidelines'
    ],
    successMetrics: [
      `Improvement in ${need.type} accessibility by 40%`,
      'Community satisfaction score >7/10',
      'Cost-effectiveness ratio <$500 per beneficiary',
      'Implementation timeline adherence >90%',
      'Stakeholder engagement participation >60%'
    ],
    riskFactors: [
      'Budget constraints and funding delays',
      'Community resistance to change',
      'Regulatory approval bottlenecks',
      'Technical implementation challenges',
      'Political and administrative changes'
    ]
  };
};

const generateLocationDetails = (need: CommunityNeed): LocationDetails => {
  // Simulate enhanced location data based on coordinates
  const { lat, lng } = need.position;
  
  return {
    address: 'Loading address...',
    neighborhood: `District ${Math.floor(lat * 10) % 20 + 1}`,
    district: lng > 0 ? 'Eastern District' : 'Western District',
    populationDensity: Math.floor(15000 + (lat * lng * 1000) % 10000),
    landUse: need.type === 'housing' ? 'Mixed Residential/Commercial' : 
             need.type === 'parks' ? 'High-Density Residential' : 'Urban Mixed-Use',
    nearbyServices: [
      'Metro Station (0.8 km)',
      'Primary School (0.5 km)',
      'Health Clinic (1.2 km)',
      'Market Center (0.7 km)'
    ],
    transitAccess: 'Moderate - Bus routes within 500m',
    walkabilityScore: Math.floor(65 + (Math.abs(lat + lng) * 10) % 25)
  };
};

export function UrbanPlannerAnalysisModal({ need, isOpen, onClose }: UrbanPlannerAnalysisModalProps) {
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);
  const [urbanAnalysis, setUrbanAnalysis] = useState<UrbanAnalysis | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (need && isOpen) {
      // Generate location details and urban analysis
      const details = generateLocationDetails(need);
      const analysis = generateUrbanAnalysis(need, details);
      
      setLocationDetails(details);
      setUrbanAnalysis(analysis);
      
      // Fetch real address
      setLoadingAddress(true);
      reverseGeocode(need.position.lat, need.position.lng)
        .then(result => {
          if (result.address) {
            setLocationDetails(prev => prev ? {
              ...prev,
              address: result.address || 'Address not found'
            } : null);
          }
        })
        .catch(error => {
          console.error('Failed to fetch address:', error);
          setLocationDetails(prev => prev ? {
            ...prev,
            address: `${need.position.lat.toFixed(4)}°N, ${need.position.lng.toFixed(4)}°E`
          } : null);
        })
        .finally(() => setLoadingAddress(false));
    }
  }, [need, isOpen]);

  if (!need || !locationDetails || !urbanAnalysis) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{need.icon}</span>
            <div>
              <h2 className="text-xl">{need.title} - Urban Analysis</h2>
              <p className="text-sm text-muted-foreground font-normal">
                Comprehensive planning assessment and recommendations
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="planning">Action Plans</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                    {loadingAddress ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm">Loading address...</span>
                      </div>
                    ) : (
                      <p className="text-sm">{locationDetails.address}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">District</h4>
                    <p className="text-sm">{locationDetails.district}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Population Density</h4>
                    <p className="text-sm">{locationDetails.populationDensity.toLocaleString()}/km²</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Walkability Score</h4>
                    <div className="flex items-center gap-2">
                      <Progress value={locationDetails.walkabilityScore} className="flex-1 h-2" />
                      <span className="text-sm">{locationDetails.walkabilityScore}/100</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Nearby Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {locationDetails.nearbyServices.map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Severity Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Severity Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={severityColors[need.severity]} className="text-sm">
                    {need.severity.toUpperCase()} PRIORITY
                  </Badge>
                  <span className="text-lg font-bold">Score: {need.score.toFixed(1)}/100</span>
                </div>
                <Progress value={need.score} className="h-4" />
                <p className="text-sm text-muted-foreground">{need.details}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-4">
            {/* Immediate Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Immediate Actions (0-6 months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urbanAnalysis.immediateActions.map((action, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{action.action}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {action.timeline}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {action.cost}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Short-term Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  Short-term Interventions (6-24 months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urbanAnalysis.shortTermPlan.map((plan, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{plan.intervention}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {plan.timeline}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {plan.budget}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Long-term Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Long-term Development (2-5+ years)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urbanAnalysis.longTermPlan.map((plan, index) => (
                    <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{plan.strategy}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {plan.timeline}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {plan.investment}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Key Stakeholders & Partners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {urbanAnalysis.stakeholders.map((stakeholder, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <h4 className="text-sm font-medium">{stakeholder.name}</h4>
                      <p className="text-xs text-muted-foreground">{stakeholder.role}</p>
                      {stakeholder.contact && (
                        <p className="text-xs text-primary">{stakeholder.contact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Regulatory Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {urbanAnalysis.regulatoryRequirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Success Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {urbanAnalysis.successMetrics.map((metric, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {urbanAnalysis.riskFactors.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Professional Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Google Maps
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Contact Stakeholders
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