import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Layers, Eye, EyeOff, Filter } from 'lucide-react';
import { NeedsAnalysis } from '@/utils/community-needs-calculator';

interface FlagControlPanelProps {
  needsAnalysis: NeedsAnalysis | null;
  visibleCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  onToggleAll: (visible: boolean) => void;
  className?: string;
}

const CATEGORY_CONFIG = [
  { id: 'food', name: 'Food Access', icon: '🍎', color: 'hsl(var(--chart-1))' },
  { id: 'housing', name: 'Housing', icon: '🏠', color: 'hsl(var(--chart-2))' },
  { id: 'transportation', name: 'Transportation', icon: '🚌', color: 'hsl(var(--chart-3))' },
  { id: 'pollution', name: 'Air/Water Quality', icon: '🏭', color: 'hsl(var(--chart-4))' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: 'hsl(var(--chart-5))' },
  { id: 'parks', name: 'Parks & Recreation', icon: '🌳', color: 'hsl(var(--chart-gea))' },
  { id: 'growth', name: 'Development', icon: '🏗️', color: 'hsl(var(--chart-dpi))' },
  { id: 'energy', name: 'Energy Access', icon: '⚡', color: 'hsl(var(--chart-hwi))' }
];

export function FlagControlPanel({ 
  needsAnalysis, 
  visibleCategories, 
  onToggleCategory, 
  onToggleAll,
  className = '' 
}: FlagControlPanelProps) {
  
  if (!needsAnalysis) return null;

  const allVisible = visibleCategories.length === CATEGORY_CONFIG.length;
  const noneVisible = visibleCategories.length === 0;
  
  const getCategoryNeed = (categoryId: string) => {
    return needsAnalysis.flags.find(flag => flag.id === categoryId);
  };

  return (
    <Card className={`bg-gradient-card shadow-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Community Needs Overview
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAll(!allVisible)}
              className="h-6 px-2 text-xs"
            >
              {allVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {allVisible ? 'Hide All' : 'Show All'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Priority Summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span>Critical:</span>
            <Badge variant="destructive" className="h-5 px-1 text-xs">
              {needsAnalysis.priorityCount.critical}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>High:</span>
            <Badge style={{ backgroundColor: 'hsl(var(--warning))' }} className="h-5 px-1 text-xs text-white">
              {needsAnalysis.priorityCount.high}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Moderate:</span>
            <Badge style={{ backgroundColor: 'hsl(var(--info))' }} className="h-5 px-1 text-xs text-white">
              {needsAnalysis.priorityCount.moderate}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Overall:</span>
            <Badge variant="outline" className="h-5 px-1 text-xs">
              {needsAnalysis.totalScore}/100
            </Badge>
          </div>
        </div>

        {/* Category Toggle Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Toggle Categories</Label>
          <div className="grid grid-cols-1 gap-1">
            {CATEGORY_CONFIG.map((category) => {
              const need = getCategoryNeed(category.id);
              const isVisible = visibleCategories.includes(category.id);
              const showFlag = need && need.level !== 'low';
              
              return (
                <div 
                  key={category.id}
                  className={`flex items-center justify-between p-2 rounded-md border transition-all ${
                    showFlag ? 'border-border/50' : 'border-border/20 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {category.name}
                      </div>
                      {need && (
                        <div className="text-xs text-muted-foreground">
                          {need.level} • {need.score}pts
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {need && need.level !== 'low' && (
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: need.color }}
                      />
                    )}
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => onToggleCategory(category.id)}
                      disabled={!showFlag}
                      className="scale-75"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">Legend:</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Moderate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}