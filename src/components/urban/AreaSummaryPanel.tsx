import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { MapPin, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { NeedsAnalysis } from '../../utils/community-needs-calculator';

interface AreaSummaryPanelProps {
  analysis: NeedsAnalysis & { areaStats?: any };
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  className?: string;
}

export function AreaSummaryPanel({ analysis, bounds, className }: AreaSummaryPanelProps) {
  const { flags, needsCounts, totalScore, areaStats } = analysis;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatArea = (area: number) => {
    if (area < 1) return `${(area * 1000).toFixed(0)}m²`;
    return `${area.toFixed(2)}km²`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Area Analysis Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Area Overview */}
        {bounds && areaStats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Area Size</p>
              <p className="font-semibold">{formatArea(areaStats.totalArea)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Needs Density</p>
              <p className="font-semibold">{areaStats.flagDensity.toFixed(2)}/km²</p>
            </div>
          </div>
        )}

        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Needs Score</span>
            <span className={`font-bold ${getScoreColor(totalScore)}`}>
              {totalScore.toFixed(1)}/100
            </span>
          </div>
          <Progress value={totalScore} className="h-2" />
        </div>

        {/* Priority Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Priority Distribution
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(needsCounts).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <Badge 
                  variant={
                    level === 'critical' ? 'destructive' : 
                    level === 'high' ? 'default' : 
                    level === 'moderate' ? 'secondary' : 'outline'
                  }
                  className="text-xs"
                >
                  {level}
                </Badge>
                <span className="font-semibold text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Issues */}
        {areaStats?.priorityDistribution && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Most Critical Issues
            </h4>
            <div className="space-y-2">
              {areaStats.priorityDistribution
                .sort((a: any, b: any) => b.severity - a.severity)
                .slice(0, 3)
                .map((issue: any) => (
                  <div key={issue.type} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="font-medium text-sm capitalize">{issue.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.severity} high-priority areas
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {issue.avgScore.toFixed(1)}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-sm">Recommended Actions</h4>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Focus on {needsCounts.critical + needsCounts.high} high-priority areas first</li>
            <li>• Consider integrated solutions for co-located issues</li>
            <li>• Engage with local community leaders for implementation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}