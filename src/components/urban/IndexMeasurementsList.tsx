import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, List, Info } from 'lucide-react';
import { INDEX_MEASUREMENTS, HEALTHY_CITY_TARGETS } from '@/types/urban-indices';
import { cn } from '@/lib/utils';

interface IndexMeasurementsListProps {
  className?: string;
}

export function IndexMeasurementsList({ className }: IndexMeasurementsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Group measurements by index
  const groupedMeasurements = INDEX_MEASUREMENTS.reduce((acc, measurement) => {
    const key = measurement.index_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(measurement);
    return acc;
  }, {} as Record<string, typeof INDEX_MEASUREMENTS>);

  // Get the index keys for targets
  const getIndexKey = (indexName: string): keyof typeof HEALTHY_CITY_TARGETS | null => {
    const keyMap: Record<string, keyof typeof HEALTHY_CITY_TARGETS> = {
      'Climate Resilience Index (CRI)': 'cri',
      'Urban Heat Vulnerability Index (UHVI)': 'uhvi',
      'Air Quality Health Impact (AQHI)': 'aqhi',
      'Water Security Index (WSI)': 'wsi',
      'Green Equity Access (GEA)': 'gea',
      'Social Cohesion Measure (SCM)': 'scm',
      'Environmental Justice Tool (EJT)': 'ejt',
      'Transportation Accessibility Score (TAS)': 'tas',
      'Disaster Preparedness Index (DPI)': 'dpi',
      'Human Well-being Index (HWI)': 'hwi'
    };
    return keyMap[indexName] || null;
  };

  return (
    <Card className={cn("bg-gradient-card shadow-card", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">
                  Index Measurements
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {Object.keys(groupedMeasurements).length} urban indices • Click to explore
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 p-4 pt-0">
            {Object.entries(groupedMeasurements).map(([indexName, measurements]) => {
              const indexKey = getIndexKey(indexName);
              const target = indexKey ? HEALTHY_CITY_TARGETS[indexKey] : null;
              
              return (
                <div 
                  key={indexName}
                  className="border border-border/50 rounded-lg p-3 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm leading-tight">
                      {indexName}
                    </h4>
                    {target && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Target: {target.target}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {measurements[0]?.category}
                  </p>
                  
                  {target && (
                    <p className="text-xs text-success font-medium mb-2">
                      Goal: {target.label}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Info className="h-3 w-3 text-info" />
                      <span className="text-xs font-medium">Components ({measurements.length}):</span>
                    </div>
                    <div className="grid gap-1">
                      {measurements.slice(0, 2).map((measurement, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-foreground/80 truncate">
                            {measurement.component}
                          </span>
                          <span className="text-muted-foreground ml-2 shrink-0">
                            {measurement.point_range}
                          </span>
                        </div>
                      ))}
                      {measurements.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{measurements.length - 2} more components...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                Each index combines multiple measurement components to provide comprehensive urban health analysis
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}