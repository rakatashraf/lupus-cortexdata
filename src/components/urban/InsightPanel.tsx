import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Download,
  Share2,
  RefreshCw,
  MapPin,
  Calendar,
  BarChart3,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SelectedArea, SelectedCategory } from './SimpleDataVisualization';

interface InsightPanelProps {
  selectedArea: SelectedArea;
  selectedCategories: SelectedCategory[];
  timeRange: string;
}

export function InsightPanel({ selectedArea, selectedCategories, timeRange }: InsightPanelProps) {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate mock insights based on selections
  useEffect(() => {
    const generateInsights = () => {
      setIsLoading(true);
      
      setTimeout(() => {
        const mockInsights = {
          overallScore: Math.floor(Math.random() * 30) + 65, // 65-95
          summary: generateSummary(),
          metrics: generateMetrics(),
          trends: generateTrends(),
          recommendations: generateRecommendations(),
          chartData: generateChartData(),
          pieData: generatePieData()
        };
        
        setInsights(mockInsights);
        setIsLoading(false);
      }, 1500);
    };

    generateInsights();
  }, [selectedArea, selectedCategories, timeRange]);

  const generateSummary = () => {
    const areaName = selectedArea.name.split(',')[0];
    const categoryNames = selectedCategories.map(c => c.name.toLowerCase()).join(', ');
    
    const summaries = [
      `${areaName} shows positive trends in environmental quality with moderate urban development pressure.`,
      `Air quality in ${areaName} has improved by 8% over the selected period, while green spaces remain stable.`,
      `${areaName} demonstrates good urban planning with balanced development and environmental preservation.`,
      `Recent data indicates ${areaName} is performing well across ${selectedCategories.length} key urban health metrics.`
    ];
    
    return summaries[Math.floor(Math.random() * summaries.length)];
  };

  const generateMetrics = () => {
    return selectedCategories.map(category => ({
      category: category.name,
      score: Math.floor(Math.random() * 35) + 60, // 60-95
      trend: Math.random() > 0.3 ? 'up' : 'down',
      change: (Math.random() * 20 + 2).toFixed(1), // 2-22%
      status: Math.random() > 0.2 ? 'good' : Math.random() > 0.5 ? 'moderate' : 'needs-attention'
    }));
  };

  const generateTrends = () => {
    const trends = [
      { text: 'Air quality improved by 12% this month', type: 'positive', icon: TrendingUp },
      { text: 'Green space coverage increased by 5%', type: 'positive', icon: TrendingUp },
      { text: 'Urban heat slightly elevated in city center', type: 'neutral', icon: AlertTriangle },
      { text: 'Water quality remains consistently high', type: 'positive', icon: CheckCircle }
    ];
    
    return trends.slice(0, Math.floor(Math.random() * 2) + 2);
  };

  const generateRecommendations = () => {
    const recs = [
      'Consider expanding green corridor initiatives in high-density areas',
      'Monitor air quality during peak traffic hours',
      'Implement cool roof programs to reduce urban heat',
      'Enhance water retention in urban development projects',
      'Promote electric vehicle adoption to improve air quality',
      'Increase tree canopy coverage in residential areas'
    ];
    
    return recs.slice(0, Math.floor(Math.random() * 2) + 3);
  };

  const generateChartData = () => {
    const days = [];
    const baseDate = new Date();
    const numDays = timeRange === 'last-week' ? 7 : timeRange === 'last-month' ? 30 : 90;
    
    for (let i = numDays; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      const dataPoint: any = {
        date: date.toISOString().split('T')[0],
        dateLabel: date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      };
      
      selectedCategories.forEach(category => {
        dataPoint[category.id] = Math.floor(Math.random() * 30) + 60 + Math.sin(i / 10) * 10;
      });
      
      days.push(dataPoint);
    }
    
    return days;
  };

  const generatePieData = () => {
    return selectedCategories.map((category, index) => ({
      name: category.name,
      value: Math.floor(Math.random() * 25) + 75, // 75-100
      color: ['#14b8a6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 7]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-success bg-success/10 border-success/20';
      case 'moderate': return 'text-warning bg-warning/10 border-warning/20';
      case 'needs-attention': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getScoreStatus = (score: number) => {
    if (score >= 85) return { status: 'excellent', color: 'text-success', bg: 'bg-success/10' };
    if (score >= 70) return { status: 'good', color: 'text-primary', bg: 'bg-primary/10' };
    if (score >= 55) return { status: 'moderate', color: 'text-warning', bg: 'bg-warning/10' };
    return { status: 'needs improvement', color: 'text-danger', bg: 'bg-danger/10' };
  };

  if (isLoading || !insights) {
    return (
      <Card className="h-full min-h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">Analyzing Your Data</h3>
            <p className="text-sm text-muted-foreground">
              Processing satellite data and generating insights...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const scoreStatus = getScoreStatus(insights.overallScore);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Overall Score */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-lg">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Analysis Results</h2>
                <p className="text-sm text-muted-foreground">{selectedArea.name}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-3xl font-bold ${scoreStatus.color}`}>
                {insights.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Badge className={`mt-1 ${scoreStatus.bg} ${scoreStatus.color} border-transparent`}>
                {scoreStatus.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <Progress value={insights.overallScore} className="h-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insights.summary}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.metrics.map((metric: any, index: number) => (
          <Card key={index} className={`border ${getStatusColor(metric.status)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm text-foreground">{metric.category}</h3>
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger" />
                )}
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">{metric.score}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {metric.trend === 'up' ? '+' : '-'}{metric.change}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    vs {timeRange.replace('-', ' ')}
                  </span>
                </div>
                <Progress value={metric.score} className="h-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5" />
              Trends Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.chartData}>
                  <defs>
                    {selectedCategories.map((category, index) => (
                      <linearGradient key={category.id} id={`gradient-${category.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={insights.pieData[index]?.color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={insights.pieData[index]?.color} stopOpacity={0.1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="dateLabel" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))'
                    }} 
                  />
                  <Legend />
                  {selectedCategories.map((category, index) => (
                    <Area
                      key={category.id}
                      type="monotone"
                      dataKey={category.id}
                      stroke={insights.pieData[index]?.color}
                      fill={`url(#gradient-${category.id})`}
                      strokeWidth={2}
                      name={category.name}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5" />
              Category Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insights.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {insights.pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {insights.pieData.map((entry: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground flex-1">{entry.name}</span>
                  <span className="font-medium text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lightbulb className="w-5 h-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {insights.trends.map((trend: any, index: number) => {
              const IconComponent = trend.icon;
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${trend.type === 'positive' ? 'bg-success/20 text-success' : 
                      trend.type === 'neutral' ? 'bg-warning/20 text-warning' : 
                      'bg-danger/20 text-danger'}
                  `}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-foreground">{trend.text}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="w-5 h-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share Results
            </Button>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}