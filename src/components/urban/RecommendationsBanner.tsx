import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb, TrendingUp, ExternalLink } from 'lucide-react';
import { CityHealthData, UrbanIndex } from '@/types/urban-indices';
import { cn } from '@/lib/utils';
import { RecommendationDetailModal } from './RecommendationDetailModal';

interface RecommendationsBannerProps {
  healthData: CityHealthData;
  className?: string;
}

export function RecommendationsBanner({ healthData, className }: RecommendationsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<{ key: string; index: UrbanIndex } | null>(null);
  
  // Get indices that need improvement
  const indicesNeedingImprovement = Object.entries(healthData.indices)
    .filter(([_, index]) => index.total_score < index.target);
  
  const totalGap = indicesNeedingImprovement.reduce(
    (sum, [_, index]) => sum + (index.target - index.total_score), 
    0
  );

  if (indicesNeedingImprovement.length === 0) {
    return (
      <Card className={cn("bg-gradient-to-r from-success/10 to-success/5 border-success/20", className)}>
        <CardContent className="flex items-center justify-center p-4">
          <div className="flex items-center gap-3 text-success">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">All indices are meeting their targets! 🎉</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border-warning/20 shadow-card",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-warning/5 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  <div className="absolute -top-1 -right-1">
                    <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Improvement Opportunities
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {indicesNeedingImprovement.length} indices • {totalGap} points gap
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                  {indicesNeedingImprovement.length}
                </Badge>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {indicesNeedingImprovement.map(([key, index]) => {
                const gap = index.target - index.total_score;
                const priority = gap > 10 ? 'high' : gap > 5 ? 'medium' : 'low';
                
                return (
                  <div 
                    key={key}
                    className="p-3 rounded-lg bg-muted/30 border border-warning/20 hover:bg-muted/40 transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedIndex({ key, index })}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">
                        {index.index_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            priority === 'high' && "bg-destructive/20 text-destructive border-destructive/30",
                            priority === 'medium' && "bg-warning/20 text-warning border-warning/30",
                            priority === 'low' && "bg-info/20 text-info border-info/30"
                          )}
                        >
                          {priority} priority
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                      <p className="text-xs text-muted-foreground">
                        Current: {index.total_score}/{index.target} • Gap: {gap} points
                      </p>
                    </div>
                    
                    <p className="text-xs text-foreground leading-relaxed mb-2">
                      {getQuickRecommendation(key, index)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-primary font-medium">Click for detailed action plan</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                Click any index card for detailed improvement strategies and implementation plans
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
      
      {selectedIndex && (
        <RecommendationDetailModal
          isOpen={!!selectedIndex}
          onClose={() => setSelectedIndex(null)}
          indexKey={selectedIndex.key}
          index={selectedIndex.index}
        />
      )}
    </Card>
  );
}

function getQuickRecommendation(indexKey: string, index: UrbanIndex): string {
  const quickTips: Record<string, string> = {
    cri: "Increase green infrastructure and improve heat wave preparedness systems for better climate resilience.",
    uhvi: "Add cooling infrastructure and increase tree canopy coverage to reduce urban heat effects.",
    aqhi: "Implement stricter emission controls and expand air quality monitoring networks.",
    wsi: "Enhance water recycling systems and improve groundwater management practices.",
    gea: "Create more equitable green spaces and improve access in underserved neighborhoods.",
    scm: "Strengthen community facilities and enhance public space connectivity.",
    ejt: "Address environmental disparities and ensure equitable resource distribution.",
    tas: "Improve public transportation access and enhance mobility infrastructure.",
    dpi: "Upgrade emergency response systems and community disaster preparedness.",
    hwi: "Focus on comprehensive well-being programs and quality of life improvements."
  };
  
  return quickTips[indexKey] || "Consider targeted interventions to improve this index score.";
}