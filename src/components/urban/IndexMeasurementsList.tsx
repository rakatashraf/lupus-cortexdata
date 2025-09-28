import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, List, Info, ExternalLink, Users, Zap, MapPin, Shield, Heart, Droplets, Leaf, TrendingUp } from 'lucide-react';
import { INDEX_MEASUREMENTS, HEALTHY_CITY_TARGETS } from '@/types/urban-indices';
import { IndexMeasurementsModal } from './IndexMeasurementsModal';
import { cn } from '@/lib/utils';

interface IndexMeasurementsListProps {
  className?: string;
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

const INDEX_QUICK_DESCRIPTIONS = {
  'Climate Resilience Index (CRI)': 'Climate adaptation & extreme weather response',
  'Urban Heat Vulnerability Index (UHVI)': 'Heat island effects & temperature risks',
  'Air Quality Health Impact (AQHI)': 'Air pollution & respiratory health impact',
  'Water Security Index (WSI)': 'Water availability & infrastructure quality',
  'Green Equity Access (GEA)': 'Fair access to parks & green spaces',
  'Social Cohesion Measure (SCM)': 'Community connections & social trust',
  'Environmental Justice Tool (EJT)': 'Environmental equality across neighborhoods',
  'Transportation Accessibility Score (TAS)': 'Access to jobs, services & opportunities',
  'Disaster Preparedness Index (DPI)': 'Emergency readiness & response capacity',
  'Human Well-being Index (HWI)': 'Overall quality of life & health outcomes'
};

export function IndexMeasurementsList({ className }: IndexMeasurementsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
    <>
      <Card className={cn("bg-gradient-card shadow-card", className)}>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
          onClick={() => setShowModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold">
                Index Measurements
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {Object.keys(groupedMeasurements).length} indices
              </Badge>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Click to explore all urban health measurements and their components
          </p>
        </CardHeader>
        
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground/80 mb-3">Quick Overview</h4>
            <div className="grid gap-1.5 max-h-64 overflow-y-auto">
              {Object.entries(groupedMeasurements).map(([indexName, measurements]) => {
                const IconComponent = INDEX_ICONS[indexName as keyof typeof INDEX_ICONS] || Info;
                const quickDesc = INDEX_QUICK_DESCRIPTIONS[indexName as keyof typeof INDEX_QUICK_DESCRIPTIONS];
                
                return (
                  <div 
                    key={indexName}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setShowModal(true)}
                  >
                    <IconComponent className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {indexName.replace(/\s*\([^)]*\)/, '')}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {quickDesc}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {measurements.length}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <IndexMeasurementsModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}