import React, { useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { CommunityNeed } from '../../utils/community-needs-calculator';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface EnhancedCommunityNeedsFlagsProps {
  needs: CommunityNeed[];
  onFlagClick: (need: CommunityNeed) => void;
  visibleCategories: string[];
  showLabels?: boolean;
  animationEnabled?: boolean;
}

export function EnhancedCommunityNeedsFlags({
  needs,
  onFlagClick,
  visibleCategories,
  showLabels = true,
  animationEnabled = true
}: EnhancedCommunityNeedsFlagsProps) {
  const [hoveredFlag, setHoveredFlag] = useState<string | null>(null);

  const createEnhancedFlagIcon = (need: CommunityNeed, isHovered: boolean = false) => {
    const size = need.level === 'critical' ? (isHovered ? 48 : 40) : 
                 need.level === 'high' ? (isHovered ? 40 : 32) : 
                 need.level === 'moderate' ? (isHovered ? 32 : 24) : 20;
    
    const clusterBadge = (need as any).clusterSize > 1 ? 
      `<div class="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">${(need as any).clusterSize}</div>` : '';
    
    return divIcon({
      html: `
        <div class="relative ${animationEnabled ? 'animate-fade-in' : ''} ${isHovered ? 'animate-scale-in' : ''}">
          <div 
            class="flex items-center justify-center rounded-full border-2 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl ${isHovered ? 'scale-110' : ''}"
            style="
              width: ${size}px; 
              height: ${size}px; 
              background-color: ${need.color}; 
              border-color: ${need.color};
              box-shadow: ${isHovered ? `0 0 20px ${need.color}40` : `0 4px 12px ${need.color}30`};
            "
          >
            <span style="font-size: ${size * 0.6}px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
              ${need.icon}
            </span>
          </div>
          ${clusterBadge}
          ${showLabels && (isHovered || need.level === 'critical') ? 
            `<div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-background/90 text-foreground text-xs px-2 py-1 rounded shadow-md whitespace-nowrap backdrop-blur-sm border">
              ${need.name}
            </div>` : ''
          }
        </div>
      `,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const visibleNeeds = needs.filter(need => 
    visibleCategories.includes(need.id) && need.level !== 'low'
  );

  const getActionableAdvice = (need: CommunityNeed): string => {
    const advice: { [key: string]: string } = {
      food: 'Consider supporting local food banks or community gardens',
      housing: 'Advocate for affordable housing initiatives',
      transportation: 'Promote public transit improvements',
      pollution: 'Report to environmental agencies and support clean-up efforts',
      healthcare: 'Advocate for new healthcare facilities',
      parks: 'Support green space development initiatives',
      growth: 'Plan for sustainable development and infrastructure',
      energy: 'Promote renewable energy access programs'
    };
    return advice[need.id] || 'Contact local authorities for assistance';
  };

  return (
    <>
      {visibleNeeds.map((need, index) => (
        <Marker
          key={`${need.id}-${index}`}
          position={need.position}
          icon={createEnhancedFlagIcon(need, hoveredFlag === `${need.id}-${index}`)}
          eventHandlers={{
            click: () => onFlagClick(need),
            mouseover: () => setHoveredFlag(`${need.id}-${index}`),
            mouseout: () => setHoveredFlag(null),
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
            opacity={0.95}
            className="custom-tooltip"
          >
            <div className="space-y-3 min-w-[250px]">
              <div className="flex items-center gap-2">
                <span className="text-lg">{need.icon}</span>
                <div>
                  <h4 className="font-semibold text-sm">{need.name}</h4>
                  <p className="text-xs text-muted-foreground">{need.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={
                    need.level === 'critical' ? 'destructive' : 
                    need.level === 'high' ? 'default' : 'secondary'
                  } className="text-xs">
                    {need.level.toUpperCase()} PRIORITY
                  </Badge>
                  <span className="text-xs font-medium">Score: {need.score.toFixed(1)}</span>
                </div>
                
                {(need as any).clusterSize > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {(need as any).clusterSize} areas affected
                  </Badge>
                )}
              </div>

              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Quick Action:</strong> {getActionableAdvice(need)}
                </p>
                <Button 
                  size="sm" 
                  className="w-full h-7 text-xs"
                  onClick={() => onFlagClick(need)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}