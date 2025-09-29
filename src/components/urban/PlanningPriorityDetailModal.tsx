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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            {priority.layer}
          </DialogTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={priority.interventionLevel as any} className="text-sm">
              {priority.priority} Priority
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium">{priority.status}</span>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="implementation">Implementation</TabsTrigger>
            <TabsTrigger value="tips">Best Practices</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Priority Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{priority.average}</div>
                    <div className="text-sm text-muted-foreground">Current Score</div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold", getPriorityColor(priority.priority))}>
                      {priority.priority}
                    </div>
                    <div className="text-sm text-muted-foreground">Priority Level</div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold", getTrendColor(priority.trend))}>
                      {priority.trend}
                    </div>
                    <div className="text-sm text-muted-foreground">Trend</div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-background/50 rounded-lg">
                  <h4 className="font-medium mb-2">Primary Recommendation</h4>
                  <p className="text-sm text-muted-foreground">{priority.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Planning Suggestions
                </CardTitle>
                <CardDescription>
                  Strategic recommendations for urban planning interventions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedContent.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="implementation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  Implementation Roadmap
                </CardTitle>
                <CardDescription>
                  Step-by-step implementation strategy and timeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedContent.implementation.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-400/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                  Urban Planning Tips
                </CardTitle>
                <CardDescription>
                  Best practices and expert guidance for successful implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedContent.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Monitoring & Evaluation
                </CardTitle>
                <CardDescription>
                  Key performance indicators and evaluation metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {detailedContent.monitoring.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Export Plan
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Share with Team
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}