import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, ChevronDown, MapPin, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { CommunityNeed, CommunityNeedType } from '@/utils/community-needs-calculator';

interface CommunityNeedsSidePanelProps {
  needType: CommunityNeedType | null;
  needs: CommunityNeed[];
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number) => void;
}

const needTypeInfo = {
  'food-access': {
    title: 'Food Access Issues',
    icon: '🍎',
    description: 'Areas with limited access to affordable, nutritious food options.',
    strategies: [
      'Establish community food markets',
      'Support mobile food vendors',
      'Create community gardens',
      'Improve food distribution networks'
    ]
  },
  'housing': {
    title: 'Housing Challenges',
    icon: '🏠',
    description: 'Areas with overcrowding, inadequate housing, or affordability issues.',
    strategies: [
      'Develop affordable housing projects',
      'Improve housing quality standards',
      'Create rent assistance programs',
      'Support community-led housing initiatives'
    ]
  },
  'transportation': {
    title: 'Transportation Gaps',
    icon: '🚌',
    description: 'Areas with poor public transport connectivity.',
    strategies: [
      'Expand public transit routes',
      'Improve road infrastructure',
      'Support ride-sharing programs',
      'Create bicycle-friendly paths'
    ]
  },
  'pollution': {
    title: 'Environmental Concerns',
    icon: '🏭',
    description: 'Areas with high pollution levels affecting health.',
    strategies: [
      'Implement pollution monitoring',
      'Regulate industrial emissions',
      'Create green buffer zones',
      'Promote clean energy adoption'
    ]
  },
  'healthcare': {
    title: 'Healthcare Access',
    icon: '🏥',
    description: 'Areas with limited healthcare facilities or services.',
    strategies: [
      'Establish community health centers',
      'Deploy mobile health units',
      'Train community health workers',
      'Improve healthcare infrastructure'
    ]
  },
  'parks': {
    title: 'Green Space Access',
    icon: '🌳',
    description: 'Areas lacking adequate parks and recreational spaces.',
    strategies: [
      'Create neighborhood parks',
      'Develop community recreational facilities',
      'Establish green corridors',
      'Support community gardening initiatives'
    ]
  },
  'growth': {
    title: 'Development Planning',
    icon: '🏗️',
    description: 'Areas needing strategic development planning.',
    strategies: [
      'Create sustainable development plans',
      'Engage community in planning process',
      'Balance development with preservation',
      'Improve infrastructure planning'
    ]
  },
  'energy': {
    title: 'Energy Access',
    icon: '⚡',
    description: 'Areas with inadequate or unreliable energy supply.',
    strategies: [
      'Improve electrical grid infrastructure',
      'Promote renewable energy solutions',
      'Support community energy programs',
      'Enhance energy efficiency initiatives'
    ]
  }
};

const severityColors = {
  critical: 'destructive' as const,
  moderate: 'secondary' as const,
  low: 'outline' as const
};

export function CommunityNeedsSidePanel({
  needType,
  needs,
  isOpen,
  onClose,
  onLocationSelect
}: CommunityNeedsSidePanelProps) {
  if (!isOpen || !needType) return null;

  const info = needTypeInfo[needType];
  const typeNeeds = needs.filter(need => need.type === needType);
  const criticalCount = typeNeeds.filter(need => need.severity === 'critical').length;
  const moderateCount = typeNeeds.filter(need => need.severity === 'moderate').length;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.icon}</span>
            <div>
              <h2 className="text-lg font-semibold">{info.title}</h2>
              <p className="text-sm text-muted-foreground">
                {typeNeeds.length} location{typeNeeds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
            <div className="flex gap-2">
              <Badge variant={severityColors.critical} className="text-xs">
                {criticalCount} Critical
              </Badge>
              <Badge variant={severityColors.moderate} className="text-xs">
                {moderateCount} Moderate
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Impact Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Critical Issues</span>
                <Badge variant="destructive" className="text-xs">
                  {criticalCount}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Moderate Concerns</span>
                <Badge variant="secondary" className="text-xs">
                  {moderateCount}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-medium">
                <span className="text-sm">Total Affected Areas</span>
                <span className="text-sm">{typeNeeds.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Affected Locations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Affected Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {typeNeeds.map((need, index) => (
                <Collapsible key={need.id}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <div className="flex items-center gap-2 text-left">
                        <Badge variant={severityColors[need.severity]} className="text-xs">
                          {need.severity}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">Location {index + 1}</p>
                          <p className="text-xs text-muted-foreground">
                            Score: {need.score}/100
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-2">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Coordinates: {need.position.lat.toFixed(4)}, {need.position.lng.toFixed(4)}
                      </p>
                      <p className="text-sm">{need.description}</p>
                      {need.details && (
                        <p className="text-xs text-muted-foreground">{need.details}</p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLocationSelect(need.position.lat, need.position.lng)}
                        className="mt-2"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Focus on Map
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Suggested Strategies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggested Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {info.strategies.map((strategy, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm">{strategy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}