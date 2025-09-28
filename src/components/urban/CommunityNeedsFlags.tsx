import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { CommunityNeed } from '@/utils/community-needs-calculator';

interface CommunityNeedsFlagsProps {
  needs: CommunityNeed[];
  onFlagClick: (need: CommunityNeed) => void;
  visibleCategories: string[];
  showLabels?: boolean;
}

export function CommunityNeedsFlags({ 
  needs, 
  onFlagClick, 
  visibleCategories,
  showLabels = false 
}: CommunityNeedsFlagsProps) {
  
  // Create custom icons for each need type
  const createFlagIcon = (need: CommunityNeed, size: number = 32) => {
    const iconHtml = `
      <div class="community-flag" style="
        background: ${need.color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.5}px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1000;
      " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)'" 
         onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.3)'">
        ${need.icon}
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'community-needs-flag',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  // Filter needs based on visible categories and level
  const visibleNeeds = needs.filter(need => 
    visibleCategories.includes(need.id) && 
    need.level !== 'low' // Only show moderate, high, and critical needs
  );

  return (
    <>
      {visibleNeeds.map((need) => (
        <Marker
          key={need.id}
          position={[need.position!.lat, need.position!.lng]}
          icon={createFlagIcon(need, need.level === 'critical' ? 40 : 32)}
          eventHandlers={{
            click: () => onFlagClick(need)
          }}
        >
          <Tooltip 
            direction="top"
            offset={[0, -20]}
            opacity={0.9}
            className="community-flag-tooltip"
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{need.icon}</span>
                <span className="font-medium text-sm">{need.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {need.description}
              </div>
              <div className="flex items-center justify-between">
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: need.color + '20',
                    color: need.color,
                    border: `1px solid ${need.color}40`
                  }}
                >
                  {need.level.charAt(0).toUpperCase() + need.level.slice(1)} Need
                </span>
                <span className="text-xs font-mono">
                  Score: {need.score}
                </span>
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}