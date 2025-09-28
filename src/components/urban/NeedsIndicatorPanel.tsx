import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { CommunityNeed } from '@/utils/community-needs-calculator';

interface NeedsIndicatorPanelProps {
  selectedNeed: CommunityNeed | null;
  onClose: () => void;
  className?: string;
}

export function NeedsIndicatorPanel({ 
  selectedNeed, 
  onClose, 
  className = '' 
}: NeedsIndicatorPanelProps) {
  
  if (!selectedNeed) return null;

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'moderate':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'critical':
        return 'Critical Need - Immediate Action Required';
      case 'high':
        return 'High Priority - Action Needed Soon';
      case 'moderate':
        return 'Moderate Need - Improvement Recommended';
      case 'low':
        return 'Low Priority - Maintaining Current Status';
      default:
        return 'Assessment Pending';
    }
  };

  const getRecommendations = (need: CommunityNeed): string[] => {
    const recommendations: Record<string, string[]> = {
      food: [
        'Establish community farmers markets in underserved areas',
        'Support mobile food vendors and food trucks',
        'Create community gardens and urban farming initiatives',
        'Partner with local grocers for better food access'
      ],
      housing: [
        'Implement affordable housing development programs',
        'Strengthen tenant protection and rent stabilization',
        'Support first-time homebuyer assistance programs',
        'Address substandard housing through improvement grants'
      ],
      transportation: [
        'Expand public transit routes and frequency',
        'Improve pedestrian and cycling infrastructure',
        'Develop ride-sharing programs for underserved areas',
        'Create better connections to employment centers'
      ],
      pollution: [
        'Implement stricter industrial emission controls',
        'Enhance air and water quality monitoring systems',
        'Create buffer zones between industrial and residential areas',
        'Promote clean energy initiatives and green technology'
      ],
      healthcare: [
        'Establish community health centers in underserved areas',
        'Expand mobile health services and telemedicine',
        'Improve healthcare workforce recruitment and retention',
        'Strengthen preventive care and health education programs'
      ],
      parks: [
        'Develop new parks and recreational facilities',
        'Improve existing green space maintenance and security',
        'Create accessible playgrounds and sports facilities',
        'Establish community programming and activities'
      ],
      growth: [
        'Implement smart growth and sustainable development policies',
        'Improve infrastructure capacity planning',
        'Balance development with community character preservation',
        'Ensure equitable distribution of growth benefits'
      ],
      energy: [
        'Upgrade electrical grid infrastructure and reliability',
        'Expand renewable energy access and affordability',
        'Implement energy efficiency programs for low-income residents',
        'Develop community resilience hubs for emergency power'
      ]
    };

    return recommendations[need.id] || [
      'Conduct detailed community needs assessment',
      'Engage stakeholders in collaborative planning',
      'Develop targeted intervention strategies',
      'Monitor progress and adjust approaches as needed'
    ];
  };

  const getScoreInterpretation = (score: number): { text: string; color: string } => {
    if (score >= 80) return { text: 'Excellent conditions', color: 'text-green-500' };
    if (score >= 60) return { text: 'Good conditions', color: 'text-blue-500' };
    if (score >= 40) return { text: 'Fair conditions', color: 'text-orange-500' };
    return { text: 'Poor conditions', color: 'text-red-500' };
  };

  const scoreInterpretation = getScoreInterpretation(selectedNeed.score);
  const recommendations = getRecommendations(selectedNeed);

  return (
    <Card className={`bg-gradient-card shadow-card border-l-4 ${className}`} 
          style={{ borderLeftColor: selectedNeed.color }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: selectedNeed.color + '20', color: selectedNeed.color }}
            >
              {selectedNeed.icon}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {selectedNeed.name}
                {getLevelIcon(selectedNeed.level)}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedNeed.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status</span>
            <Badge 
              style={{ 
                backgroundColor: selectedNeed.color + '20',
                color: selectedNeed.color,
                border: `1px solid ${selectedNeed.color}40`
              }}
            >
              {selectedNeed.level.charAt(0).toUpperCase() + selectedNeed.level.slice(1)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Assessment Score</span>
              <span className={`font-mono ${scoreInterpretation.color}`}>
                {selectedNeed.score}/100
              </span>
            </div>
            <Progress 
              value={selectedNeed.score} 
              className="h-2"
            />
            <p className={`text-xs ${scoreInterpretation.color}`}>
              {scoreInterpretation.text}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {getLevelText(selectedNeed.level)}
          </p>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-primary" />
            Recommended Actions
          </h4>
          <ul className="space-y-1">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <li 
                key={index}
                className="text-xs text-muted-foreground pl-3 relative"
              >
                <span className="absolute left-0 text-primary">•</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>

        {/* Impact Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground">Priority Level</span>
            <div className="font-medium capitalize">{selectedNeed.level}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Community Impact</span>
            <div className="font-medium">
              {selectedNeed.level === 'critical' ? 'Very High' :
               selectedNeed.level === 'high' ? 'High' :
               selectedNeed.level === 'moderate' ? 'Medium' : 'Low'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full mt-4" 
          size="sm"
          style={{ backgroundColor: selectedNeed.color }}
        >
          View Detailed Analysis
        </Button>
      </CardContent>
    </Card>
  );
}