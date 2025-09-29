import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  TrendingUp,
  Users,
  Home,
  Zap,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningPriorityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  priority: {
    layer: string;
    average: number;
    trend: 'improving' | 'declining' | 'stable';
    status: string;
    recommendation: string;
    interventionLevel: string;
    priority: 'High' | 'Medium' | 'Low';
  } | null;
  detailedContent: {
    suggestions: string[];
    tips: string[];
    implementation: string[];
    monitoring: string[];
  } | null;
}

export function PlanningPriorityDetailModal({ 
  isOpen, 
  onClose, 
  priority, 
  detailedContent 
}: PlanningPriorityDetailModalProps) {
  if (!priority || !detailedContent) return null;

  const getPriorityColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'High': return 'text-red-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Activity className="h-7 w-7 text-primary" />
            <span className="break-words">{priority.layer}</span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant={priority.interventionLevel as any} className="text-sm font-medium px-3 py-1">
              {priority.priority} Priority
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium break-words">{priority.status}</span>
            </div>
            <div className={cn("flex items-center gap-1", getTrendColor(priority.trend))}>
              <TrendingUp className={cn(
                "h-4 w-4",
                priority.trend === 'declining' && "rotate-180"
              )} />
              <span className="text-sm font-medium capitalize">{priority.trend}</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5 bg-background/50">
            <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
            <TabsTrigger value="planning" className="text-sm">Planning</TabsTrigger>
            <TabsTrigger value="implementation" className="text-sm">Implementation</TabsTrigger>
            <TabsTrigger value="tips" className="text-sm">Best Practices</TabsTrigger>
            <TabsTrigger value="monitoring" className="text-sm">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-6 w-6 text-primary" />
                  Priority Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-background/30 rounded-lg border border-border/30">
                    <div className="text-3xl font-bold text-primary mb-1">{priority.average}</div>
                    <div className="text-sm text-muted-foreground">Current Score</div>
                  </div>
                  <div className="text-center p-4 bg-background/30 rounded-lg border border-border/30">
                    <div className={cn("text-3xl font-bold mb-1", getPriorityColor(priority.priority))}>
                      {priority.priority}
                    </div>
                    <div className="text-sm text-muted-foreground">Priority Level</div>
                  </div>
                  <div className="text-center p-4 bg-background/30 rounded-lg border border-border/30">
                    <div className={cn("text-3xl font-bold mb-1 capitalize", getTrendColor(priority.trend))}>
                      {priority.trend}
                    </div>
                    <div className="text-sm text-muted-foreground">Trend</div>
                  </div>
                </div>
                <div className="p-5 bg-background/50 rounded-lg border border-border/30">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Primary Recommendation
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">{priority.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-6 w-6 text-primary" />
                  Planning Suggestions
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Strategic recommendations for urban planning interventions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedContent.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-background/30 rounded-lg border border-border/30 hover:bg-background/50 transition-colors">
                      <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-sm leading-relaxed break-words min-w-0 flex-1">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="implementation" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-6 w-6 text-orange-400" />
                  Implementation Roadmap
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Step-by-step implementation strategy and timeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedContent.implementation.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-background/30 rounded-lg border border-border/30 hover:bg-background/50 transition-colors">
                      <div className="w-8 h-8 bg-orange-400/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm leading-relaxed break-words">{step}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                  Best Practice Guidelines
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Expert guidance and proven strategies for successful implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedContent.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-background/30 rounded-lg border border-border/30 hover:bg-background/50 transition-colors">
                      <div className="w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3 h-3" />
                      </div>
                      <span className="text-sm leading-relaxed break-words min-w-0 flex-1">{tip}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6 mt-6">
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  Monitoring & Evaluation Framework
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Key performance indicators and success metrics for tracking progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailedContent.monitoring.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-background/30 rounded-lg border border-border/30 hover:bg-background/50 transition-colors">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed break-words min-w-0 flex-1">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/50">
          <Button variant="outline" className="flex items-center gap-2 px-6 py-2">
            <FileText className="h-4 w-4" />
            Export Plan
          </Button>
          <Button variant="outline" className="flex items-center gap-2 px-6 py-2">
            <Users className="h-4 w-4" />
            Share with Team
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}