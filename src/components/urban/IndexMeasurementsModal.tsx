import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, Target, TrendingUp, Users, Zap, MapPin, Shield, Heart, Droplets, Leaf } from 'lucide-react';
import { INDEX_MEASUREMENTS, HEALTHY_CITY_TARGETS } from '@/types/urban-indices';

interface IndexMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDEX_ICONS = {
  'Climate Resilience Index (CRI)': Shield,
  'Urban Heat Vulnerability Index (UHVI)': TrendingUp,
  'Air Quality Health Impact (AQHI)': Heart,
  'Water Security Index (WSI)': Droplets,
  'Green Equity Access (GEA)': Leaf,
  'Social Cohesion Measure (SCM)': Users,
  'Environmental Justice Tool (EJT)': MapPin,
  'Transportation Accessibility Score (TAS)': Zap,
  'Disaster Preparedness Index (DPI)': Shield,
  'Human Well-being Index (HWI)': Heart
};

const INDEX_DESCRIPTIONS = {
  'Climate Resilience Index (CRI)': 'How well your city adapts to climate change impacts and extreme weather events',
  'Urban Heat Vulnerability Index (UHVI)': 'Measures heat-related health risks and urban heat island effects on residents',
  'Air Quality Health Impact (AQHI)': 'Tracks air pollution levels and their direct impact on community health',
  'Water Security Index (WSI)': 'Evaluates water availability, quality, and infrastructure reliability',
  'Green Equity Access (GEA)': 'Ensures fair distribution of parks, green spaces, and environmental benefits',
  'Social Cohesion Measure (SCM)': 'Assesses community connections, trust, and social fabric strength',
  'Environmental Justice Tool (EJT)': 'Identifies and addresses environmental inequalities across neighborhoods',
  'Transportation Accessibility Score (TAS)': 'Measures how easily residents can access jobs, services, and opportunities',
  'Disaster Preparedness Index (DPI)': 'Evaluates city readiness for emergencies and disaster response capabilities',
  'Human Well-being Index (HWI)': 'Overall measure of resident health, happiness, and quality of life'
};

const INDEX_IMPACT = {
  'Climate Resilience Index (CRI)': 'Protects your property value and family safety during storms',
  'Urban Heat Vulnerability Index (UHVI)': 'Affects energy bills and heat-related health risks',
  'Air Quality Health Impact (AQHI)': 'Influences respiratory health and children\'s development',
  'Water Security Index (WSI)': 'Impacts daily water access and utility costs',
  'Green Equity Access (GEA)': 'Affects property values and recreation opportunities',
  'Social Cohesion Measure (SCM)': 'Influences neighborhood safety and community support',
  'Environmental Justice Tool (EJT)': 'Ensures fair treatment regardless of income or race',
  'Transportation Accessibility Score (TAS)': 'Affects your daily commute and job opportunities',
  'Disaster Preparedness Index (DPI)': 'Determines emergency response speed and effectiveness',
  'Human Well-being Index (HWI)': 'Overall indicator of life satisfaction and health outcomes'
};

export function IndexMeasurementsModal({ isOpen, onClose }: IndexMeasurementsModalProps) {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold">Urban Health Indices</DialogTitle>
          <DialogDescription className="text-base">
            Comprehensive measurements that evaluate your city's health, sustainability, and livability across 10 key areas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {Object.entries(groupedMeasurements).map(([indexName, measurements]) => {
            const indexKey = getIndexKey(indexName);
            const target = indexKey ? HEALTHY_CITY_TARGETS[indexKey] : null;
            const IconComponent = INDEX_ICONS[indexName as keyof typeof INDEX_ICONS] || Info;
            const description = INDEX_DESCRIPTIONS[indexName as keyof typeof INDEX_DESCRIPTIONS];
            const impact = INDEX_IMPACT[indexName as keyof typeof INDEX_IMPACT];
            
            return (
              <Card key={indexName} className="bg-gradient-to-r from-muted/30 to-background border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold leading-tight mb-1">
                        {indexName}
                      </CardTitle>
                      <p className="text-sm text-foreground/80 mb-2">
                        {description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium">{impact}</span>
                      </div>
                    </div>
                    {target && (
                      <div className="text-right shrink-0">
                        <Badge variant="secondary" className="mb-1">
                          Target: {target.target}
                        </Badge>
                        <p className="text-xs text-success font-medium">
                          {target.label}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-info" />
                      <span className="text-sm font-medium">
                        Measurement Components ({measurements.length})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {measurements.map((measurement, idx) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate">
                              {measurement.component}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {measurement.category}
                            </span>
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs shrink-0">
                            {measurement.point_range}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Each index provides actionable insights for urban planning and policy decisions</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}