import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart } from 'lucide-react';
import { UrbanIndex } from '@/types/urban-indices';
import { cn } from '@/lib/utils';

interface HumanWellbeingCardProps {
  index: UrbanIndex;
  onClick?: () => void;
  className?: string;
}

export function HumanWellbeingCard({ index, onClick, className }: HumanWellbeingCardProps) {
  const getStatusVariant = (score: number, target: number) => {
    if (score >= target) return 'default';
    if (score >= target * 0.8) return 'secondary';
    return 'destructive';
  };

  const getHealthStatusColor = (status: string) => {
    if (status.includes('Excellent') || status.includes('High')) return 'text-success';
    if (status.includes('Good') || status.includes('Moderate')) return 'text-warning';
    return 'text-danger';
  };

  const progressPercent = (index.total_score / index.target) * 100;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105",
        "bg-gradient-to-br from-primary/10 via-primary-glow/5 to-transparent",
        "border-2 border-primary/20 hover:border-primary/40 shadow-glow",
        "min-h-[200px] aspect-square rounded-full p-0",
        className
      )}
      onClick={onClick}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-transparent to-primary-glow/10 opacity-50 group-hover:opacity-70 transition-opacity" />
      
      {/* Content */}
      <CardContent className="relative flex flex-col items-center justify-center h-full p-6 text-center">
        {/* Icon */}
        <div className="mb-4 relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150"></div>
          <Heart className="relative h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold leading-tight mb-2 group-hover:text-primary transition-colors">
          Human Well-being
        </h3>
        
        {/* Score */}
        <div className="text-3xl font-bold text-primary mb-2">
          {index.total_score}
        </div>
        
        {/* Target badge */}
        <Badge 
          variant={getStatusVariant(index.total_score, index.target)}
          className="mb-3 text-xs"
        >
          Target: {index.target}
        </Badge>
        
        {/* Progress circle */}
        <div className="w-full max-w-20 mb-3">
          <Progress 
            value={progressPercent} 
            className="h-2 bg-primary/20"
          />
        </div>
        
        {/* Status */}
        <p className={cn("text-sm font-semibold mb-1", getHealthStatusColor(index.status))}>
          {index.status}
        </p>
        
        {/* Progress percentage */}
        <p className="text-xs text-muted-foreground">
          {Math.round(progressPercent)}% of target
        </p>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
      </CardContent>
    </Card>
  );
}