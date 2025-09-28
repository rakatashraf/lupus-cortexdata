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
  'Water Security Indicator (WSI)': Droplets,
  'Green Equity Assessment (GEA)': Leaf,
  'Social Cohesion Metrics (SCM)': Users,
  'Environmental Justice Tracker (EJT)': MapPin,
  'Transportation Accessibility Score (TAS)': Zap,
  'Disaster Preparedness Index (DPI)': Shield
};

const INDEX_QUICK_DESCRIPTIONS = {
  'Climate Resilience Index (CRI)': 'Climate adaptation & extreme weather response',
  'Urban Heat Vulnerability Index (UHVI)': 'Heat island effects & temperature risks',
  'Air Quality Health Impact (AQHI)': 'Air pollution & respiratory health impact',
  'Water Security Indicator (WSI)': 'Water availability & infrastructure quality',
  'Green Equity Assessment (GEA)': 'Fair access to parks & green spaces',
  'Social Cohesion Metrics (SCM)': 'Community connections & social trust',
  'Environmental Justice Tracker (EJT)': 'Environmental equality across neighborhoods',
  'Transportation Accessibility Score (TAS)': 'Access to jobs, services & opportunities',
  'Disaster Preparedness Index (DPI)': 'Emergency readiness & response capacity'
};

export function IndexMeasurementsList({ className }: IndexMeasurementsListProps) {
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

  const indicesCount = Object.keys(groupedMeasurements).length;

  return (
    <>
      <Card 
        className={cn(
          "min-h-[200px] aspect-square rounded-full bg-gradient-card shadow-card cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-lg group",
          className
        )}
        onClick={() => setShowModal(true)}
      >
        <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center mb-3">
            <List className="h-8 w-8 text-primary" />
          </div>
          
          <CardTitle className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
            Index Measurements
          </CardTitle>
          
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            {indicesCount} Indices
          </Badge>
          
          <div className="space-y-2 max-h-20 overflow-hidden">
            {Object.entries(groupedMeasurements).slice(0, 3).map(([indexName]) => {
              const IconComponent = INDEX_ICONS[indexName as keyof typeof INDEX_ICONS] || Info;
              return (
                <div key={indexName} className="flex items-center gap-2 justify-center">
                  <IconComponent className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground truncate max-w-24">
                    {indexName.replace(/\s*\([^)]*\)/, '')}
                  </span>
                </div>
              );
            })}
            {indicesCount > 3 && (
              <div className="text-xs text-muted-foreground">
                +{indicesCount - 3} more...
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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