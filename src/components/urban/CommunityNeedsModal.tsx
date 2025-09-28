import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CommunityNeed } from '@/utils/community-needs-calculator';

interface CommunityNeedsModalProps {
  need: CommunityNeed | null;
  isOpen: boolean;
  onClose: () => void;
}

const severityColors = {
  critical: 'destructive',
  moderate: 'secondary',
  good: 'default'
} as const;

const getRecommendations = (need: CommunityNeed): string[] => {
  switch (need.type) {
    case 'food-access':
      return [
        'Establish community food pantries',
        'Support local farmers markets',
        'Improve grocery store accessibility',
        'Implement mobile food distribution programs'
      ];
    case 'housing':
      return [
        'Develop affordable housing projects',
        'Implement rent stabilization programs',
        'Support first-time homebuyer assistance',
        'Improve existing housing quality'
      ];
    case 'transportation':
      return [
        'Expand public transit routes',
        'Improve bus stop accessibility',
        'Develop bike lane infrastructure',
        'Implement ride-sharing programs'
      ];
    case 'pollution':
      return [
        'Implement air quality monitoring',
        'Enforce industrial emission standards',
        'Improve water treatment facilities',
        'Create pollution reduction incentives'
      ];
    case 'healthcare':
      return [
        'Establish community health centers',
        'Improve hospital accessibility',
        'Implement mobile health services',
        'Develop preventive care programs'
      ];
    case 'parks':
      return [
        'Create new public parks',
        'Improve existing recreational facilities',
        'Develop community gardens',
        'Establish walking and biking trails'
      ];
    case 'growth':
      return [
        'Plan sustainable urban development',
        'Improve infrastructure capacity',
        'Implement smart growth policies',
        'Support mixed-use development'
      ];
    case 'energy':
      return [
        'Upgrade electrical grid infrastructure',
        'Implement renewable energy programs',
        'Improve energy efficiency programs',
        'Develop emergency power systems'
      ];
    default:
      return ['Contact local authorities', 'Engage community leaders'];
  }
};

export function CommunityNeedsModal({ need, isOpen, onClose }: CommunityNeedsModalProps) {
  if (!need) return null;

  const recommendations = getRecommendations(need);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{need.icon}</span>
            {need.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={severityColors[need.severity]}
              className="text-xs"
            >
              {need.severity.toUpperCase()} NEED
            </Badge>
            <span className="text-sm font-medium">
              Score: {need.score.toFixed(1)}/100
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={need.score} 
              className="h-3"
            />
            <p className="text-xs text-muted-foreground">
              Higher scores indicate better conditions
            </p>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Analysis</h4>
              <p className="text-sm text-muted-foreground">
                {need.details}
              </p>
            </CardContent>
          </Card>

          {/* Location Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Location</h4>
              <p className="text-sm text-muted-foreground">
                {need.position.lat.toFixed(4)}°N, {need.position.lng.toFixed(4)}°E
              </p>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-3">Recommended Actions</h4>
              <ul className="space-y-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}