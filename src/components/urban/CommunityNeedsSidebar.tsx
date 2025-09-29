import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, MapPin, AlertTriangle, Info, Users, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CommunityNeed } from '@/utils/community-needs-calculator';

interface CommunityNeedsSidebarProps {
  selectedNeedType: string | null;
  needs: CommunityNeed[];
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (need: CommunityNeed) => void;
}

const needTypeInfo = {
  'food-access': {
    title: 'Food Access',
    icon: '🍎',
    description: 'Areas with limited access to affordable, nutritious food options.',
    strategies: [
      'Establish community gardens and urban farms',
      'Negotiate with grocery stores for better accessibility',
      'Create mobile food markets and delivery services',
      'Support local food banks and pantries'
    ]
  },
  'housing': {
    title: 'Housing',
    icon: '🏠',
    description: 'Neighborhoods facing housing affordability and availability challenges.',
    strategies: [
      'Develop affordable housing programs',
      'Implement rent stabilization policies',
      'Support first-time homebuyer assistance',
      'Create community land trusts'
    ]
  },
  'healthcare': {
    title: 'Healthcare Access',
    icon: '🏥',
    description: 'Areas with limited access to quality healthcare services.',
    strategies: [
      'Establish community health centers',
      'Expand telehealth services',
      'Create mobile health clinics',
      'Improve public transportation to medical facilities'
    ]
  },
  'education': {
    title: 'Education',
    icon: '📚',
    description: 'Communities needing enhanced educational resources and opportunities.',
    strategies: [
      'Improve school infrastructure and resources',
      'Expand after-school and summer programs',
      'Create community learning centers',
      'Support adult education and job training'
    ]
  },
  'transportation': {
    title: 'Transportation',
    icon: '🚌',
    description: 'Areas with inadequate public transportation access.',
    strategies: [
      'Expand public transit routes and frequency',
      'Improve pedestrian and cycling infrastructure',
      'Create ride-sharing programs for underserved areas',
      'Develop transportation voucher programs'
    ]
  },
  'environment': {
    title: 'Environmental Quality',
    icon: '🌱',
    description: 'Neighborhoods facing environmental health challenges.',
    strategies: [
      'Increase green spaces and tree canopy',
      'Address air and water quality issues',
      'Implement waste reduction programs',
      'Create community environmental monitoring'
    ]
  },
  'safety': {
    title: 'Public Safety',
    icon: '🛡️',
    description: 'Areas requiring enhanced safety and security measures.',
    strategies: [
      'Improve street lighting and visibility',
      'Expand community policing programs',
      'Create neighborhood watch initiatives',
      'Address underlying social determinants'
    ]
  },
  'economic': {
    title: 'Economic Opportunity',
    icon: '💼',
    description: 'Communities needing job creation and economic development.',
    strategies: [
      'Support small business development',
      'Create job training and placement programs',
      'Attract new employers to the area',
      'Develop entrepreneurship initiatives'
    ]
  }
};

const severityColors = {
  critical: 'destructive' as const,
  moderate: 'secondary' as const,
  emerging: 'outline' as const
};

export function CommunityNeedsSidebar({ 
  selectedNeedType, 
  needs, 
  isOpen, 
  onClose, 
  onLocationSelect 
}: CommunityNeedsSidebarProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (!isOpen || !selectedNeedType) return null;

  const filteredNeeds = needs.filter(need => need.type === selectedNeedType);
  const needInfo = needTypeInfo[selectedNeedType as keyof typeof needTypeInfo];
  
  const criticalCount = filteredNeeds.filter(need => need.severity === 'critical').length;
  const moderateCount = filteredNeeds.filter(need => need.severity === 'moderate').length;

  const toggleCard = (needId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(needId)) {
      newExpanded.delete(needId);
    } else {
      newExpanded.add(needId);
    }
    setExpandedCards(newExpanded);
  };

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{needInfo?.icon}</span>
          <div>
            <h2 className="text-lg font-semibold">{needInfo?.title}</h2>
            <p className="text-sm text-muted-foreground">
              {filteredNeeds.length} location{filteredNeeds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{needInfo?.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/10">
                  <div className="text-2xl font-bold text-secondary-foreground">{moderateCount}</div>
                  <div className="text-xs text-muted-foreground">Moderate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locations */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Affected Locations
            </h3>
            
            {filteredNeeds.map((need) => (
              <Card key={need.id} className="transition-all duration-200 hover:shadow-md">
                <Collapsible 
                  open={expandedCards.has(need.id)}
                  onOpenChange={() => toggleCard(need.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {expandedCards.has(need.id) ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                            <Badge variant={severityColors[need.severity as keyof typeof severityColors]}>
                              {need.severity}
                            </Badge>
                          </div>
                          <div>
                            <CardTitle className="text-sm">{need.title}</CardTitle>
                            <CardDescription className="text-xs">
                              Score: {need.score.toFixed(1)}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLocationSelect(need);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-sm text-muted-foreground">{need.description}</p>
                      
                      <div className="text-xs text-muted-foreground">
                        <strong>Coordinates:</strong> {need.position.lat.toFixed(4)}, {need.position.lng.toFixed(4)}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onLocationSelect(need)}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Focus on Map
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>

          {/* Strategies Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                How to Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {needInfo?.strategies.map((strategy, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {strategy}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}