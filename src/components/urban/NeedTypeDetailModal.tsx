import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { CommunityNeed, CommunityNeedType } from '@/utils/community-needs-calculator';

interface NeedTypeDetailModalProps {
  needType: CommunityNeedType | null;
  needs: CommunityNeed[];
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (need: CommunityNeed) => void;
}

const needTypeInfo = {
  'food-access': {
    title: 'Food Access',
    icon: '🍎',
    description: 'Areas with limited access to affordable, nutritious food including grocery stores, markets, and food distribution centers.',
    strategies: [
      'Establish community food pantries and distribution centers',
      'Support local farmers markets and mobile food vendors',
      'Improve public transportation to existing grocery stores',
      'Incentivize grocery stores to open in underserved areas',
      'Develop community gardens and urban agriculture programs'
    ]
  },
  'housing': {
    title: 'Housing',
    icon: '🏠',
    description: 'Areas with inadequate, unaffordable, or overcrowded housing conditions affecting resident wellbeing.',
    strategies: [
      'Develop affordable housing projects and social housing',
      'Implement rent control and tenant protection policies',
      'Provide first-time homebuyer assistance programs',
      'Improve existing housing through renovation grants',
      'Create emergency housing and temporary shelter services'
    ]
  },
  'transportation': {
    title: 'Transportation',
    icon: '🚌',
    description: 'Areas lacking adequate public transportation, walkable infrastructure, or accessible mobility options.',
    strategies: [
      'Expand public transit routes and increase frequency',
      'Improve bus stop accessibility and safety features',
      'Develop protected bike lanes and pedestrian pathways',
      'Implement ride-sharing and micro-transit programs',
      'Create transportation voucher programs for low-income residents'
    ]
  },
  'pollution': {
    title: 'Pollution Control',
    icon: '🏭',
    description: 'Areas experiencing high levels of air, water, or noise pollution affecting public health and quality of life.',
    strategies: [
      'Implement comprehensive air quality monitoring systems',
      'Enforce stricter industrial emission standards',
      'Upgrade water treatment and sewage infrastructure',
      'Create green buffers between industrial and residential areas',
      'Develop pollution reduction incentive programs for businesses'
    ]
  },
  'healthcare': {
    title: 'Healthcare Access',
    icon: '🏥',
    description: 'Areas with limited access to healthcare facilities, medical services, or preventive care programs.',
    strategies: [
      'Establish community health centers and clinics',
      'Implement mobile health services and telemedicine',
      'Improve ambulance services and emergency response',
      'Develop preventive care and wellness programs',
      'Train community health workers and volunteers'
    ]
  },
  'parks': {
    title: 'Parks & Recreation',
    icon: '🌳',
    description: 'Areas lacking access to green spaces, parks, recreational facilities, or outdoor activity opportunities.',
    strategies: [
      'Create new public parks and green corridors',
      'Improve existing recreational facilities and playgrounds',
      'Develop community sports programs and activities',
      'Establish walking and biking trail networks',
      'Convert vacant lots into community gardens and pocket parks'
    ]
  },
  'growth': {
    title: 'Urban Development',
    icon: '🏗️',
    description: 'Areas experiencing rapid growth without adequate infrastructure or planning, leading to overcrowding and service gaps.',
    strategies: [
      'Implement comprehensive urban planning and zoning',
      'Upgrade infrastructure to support population growth',
      'Develop mixed-use development projects',
      'Create development impact fees for infrastructure',
      'Establish growth boundaries and smart development policies'
    ]
  },
  'energy': {
    title: 'Energy Access',
    icon: '⚡',
    description: 'Areas with unreliable electricity supply, inadequate grid infrastructure, or limited access to clean energy.',
    strategies: [
      'Upgrade electrical grid infrastructure and capacity',
      'Implement renewable energy programs and solar installations',
      'Develop energy efficiency programs for buildings',
      'Create community energy resilience and backup systems',
      'Provide energy assistance programs for low-income households'
    ]
  }
} as const;

const severityColors = {
  critical: 'destructive',
  moderate: 'secondary',
  good: 'default'
} as const;

export function NeedTypeDetailModal({ 
  needType, 
  needs, 
  isOpen, 
  onClose, 
  onLocationSelect 
}: NeedTypeDetailModalProps) {
  if (!needType) return null;

  const info = needTypeInfo[needType];
  const typeNeeds = needs.filter(need => need.type === needType);
  const criticalCount = typeNeeds.filter(need => need.severity === 'critical').length;
  const moderateCount = typeNeeds.filter(need => need.severity === 'moderate').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{info.icon}</span>
            {info.title}
            <Badge variant="outline" className="ml-auto">
              {typeNeeds.length} location{typeNeeds.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2">Overview</h4>
                <p className="text-sm text-muted-foreground">
                  {info.description}
                </p>
              </CardContent>
            </Card>

            {/* Impact Summary */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-3">Local Impact Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">
                      <span className="font-medium">{criticalCount}</span> Critical
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    <span className="text-sm">
                      <span className="font-medium">{moderateCount}</span> Moderate
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locations List */}
            {typeNeeds.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium text-sm mb-3">Affected Locations</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {typeNeeds.map((need) => (
                      <div
                        key={need.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => onLocationSelect(need)}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={severityColors[need.severity]}
                                className="text-xs"
                              >
                                {need.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {need.position.lat.toFixed(4)}°N, {need.position.lng.toFixed(4)}°E
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Score: {need.score.toFixed(1)}</p>
                          <Button variant="ghost" size="sm" className="text-xs h-6">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strategies */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-3">How to Address This Need</h4>
                <ul className="space-y-2">
                  {info.strategies.map((strategy, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1 font-medium">{index + 1}.</span>
                      <span className="text-muted-foreground">{strategy}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}