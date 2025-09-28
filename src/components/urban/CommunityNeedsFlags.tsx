import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import L from 'leaflet';
import { CommunityNeed } from '@/utils/community-needs-calculator';

interface CommunityNeedsFlagsProps {
  needs: CommunityNeed[];
  onViewDetails: (need: CommunityNeed) => void;
}

// Create custom flag icons
const createFlagIcon = (need: CommunityNeed) => {
  const size = need.severity === 'critical' ? 30 : 24;
  const opacity = need.severity === 'critical' ? 1 : 0.8;
  
  return L.divIcon({
    className: 'community-need-flag',
    html: `
      <div style="
        background: ${need.color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: ${size * 0.6}px;
        opacity: ${opacity};
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: ${need.severity === 'critical' ? 'pulse 2s infinite' : 'none'};
      ">
        ${need.icon}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export function CommunityNeedsFlags({ needs, onViewDetails }: CommunityNeedsFlagsProps) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .community-need-flag {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      {needs.map((need) => (
        <Marker
          key={need.id}
          position={need.position}
          icon={createFlagIcon(need)}
        >
          <Popup className="community-need-popup">
            <div className="space-y-3 min-w-[200px]">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{need.title}</h4>
                <Badge 
                  variant={need.severity === 'critical' ? 'destructive' : 
                          need.severity === 'moderate' ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  {need.severity}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground">{need.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  Score: {need.score.toFixed(1)}/100
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails(need)}
                  className="h-6 px-2 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}