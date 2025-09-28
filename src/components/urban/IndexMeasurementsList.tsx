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
      <Card className={cn(
        "relative overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105",
        "bg-gradient-to-br from-primary/10 via-primary-glow/5 to-transparent", 
        "border-2 border-primary/20 hover:border-primary/40 shadow-glow",
        "min-h-[200px] aspect-square rounded-full p-0",
        className
      )}>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors p-4 text-center"
          onClick={() => setShowModal(true)}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="mb-2 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150"></div>
              <List className="relative h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <CardTitle className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors">
              Index Measurements
            </CardTitle>
            <Badge variant="secondary" className="text-xs mb-2">
              {Object.keys(groupedMeasurements).length} indices
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="relative flex flex-col items-center justify-center h-full p-6 pt-0 text-center">
          <div className="space-y-1 mb-4">
            <div className="text-3xl font-bold text-primary mb-2">
              {Object.keys(groupedMeasurements).length}
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Urban Health Indices
            </p>
          </div>
          
          <div className="w-full max-w-20 mb-3">
            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full w-full bg-primary rounded-full"></div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            Click to explore all measurements
          </p>
          
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
        </CardContent>
      </Card>
      
      <IndexMeasurementsModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}