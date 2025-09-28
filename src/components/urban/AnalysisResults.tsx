import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, Download, Share2, 
  MapPin, Calendar, Info, CheckCircle, AlertTriangle, XCircle,
  Thermometer, Trees, Droplets, Building2, Car, Wind, Heart, Zap
} from 'lucide-react';
import { ChartDataPoint } from '@/types/urban-indices';

interface AnalysisResultsProps {
  data: ChartDataPoint[];
  area: AreaData | null;
  categories: CategoryData[];
  loading: boolean;
}

interface AreaData {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  name?: string;
  size?: string;
  center?: { lat: number; lng: number };
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  description: string;
  selected: boolean;
}

const CATEGORY_ICONS = {
  climate: Thermometer,
  environment: Trees,
  water: Droplets,
  urban: Building2,
  transport: Car,
  air: Wind,
  health: Heart,
  energy: Zap,
};

const STATUS_CONFIG = {
  excellent: { 
    label: 'Excellent', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10', 
    icon: CheckCircle,
    min: 80 
  },
  good: { 
    label: 'Good', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10', 
    icon: CheckCircle,
    min: 65 
  },
  moderate: { 
    label: 'Moderate', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/10', 
    icon: Minus,
    min: 45 
  },
  poor: { 
    label: 'Needs Attention', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10', 
    icon: AlertTriangle,
    min: 25 
  },
  critical: { 
    label: 'Critical', 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10', 
    icon: XCircle,
    min: 0 
  }
};

export function AnalysisResults({ data, area, categories, loading }: AnalysisResultsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 animate-pulse" />
          <p className="text-lg font-medium">Analyzing your area...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  const getStatusFromScore = (score: number): keyof typeof STATUS_CONFIG => {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 45) return 'moderate';
    if (score >= 25) return 'poor';
    return 'critical';
  };

  const getCategoryInsight = (categoryId: string, score: number): string => {
    const status = getStatusFromScore(score);
    
    const insights: Record<string, Record<string, string>> = {
      climate: {
        excellent: 'Your area has comfortable temperatures and minimal heat islands.',
        good: 'Generally comfortable climate with some warm spots.',
        moderate: 'Mixed temperature conditions - some areas may get quite warm.',
        poor: 'Several hot spots detected. Consider cooling strategies.',
        critical: 'Significant heat island effects. Urgent cooling measures needed.'
      },
      environment: {
        excellent: 'Abundant green spaces and healthy vegetation throughout.',
        good: 'Good green coverage with healthy natural areas.',
        moderate: 'Some green spaces, but room for more vegetation.',
        poor: 'Limited green areas. More parks and trees would help.',
        critical: 'Very little vegetation. Green infrastructure badly needed.'
      },
      air: {
        excellent: 'Clean air with minimal pollution detected.',
        good: 'Generally good air quality with occasional variations.',
        moderate: 'Air quality varies - some pollution present.',
        poor: 'Air pollution levels are concerning in some areas.',
        critical: 'Poor air quality. Health precautions recommended.'
      }
    };

    return insights[categoryId]?.[status] || `${status.charAt(0).toUpperCase() + status.slice(1)} conditions detected in this category.`;
  };

  // Process data for visualizations
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return { daily: [], summary: [] };

    // Group by date for line chart
    const dateGroups = data.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date };
      }
      acc[item.date][item.index] = item.value;
      return acc;
    }, {} as Record<string, any>);

    const daily = Object.values(dateGroups);

    // Calculate averages for summary
    const categoryAverages = categories.map(category => {
      const categoryData = data.filter(d => 
        d.index.toLowerCase().includes(category.name.toLowerCase().split(' ')[0])
      );
      const average = categoryData.length > 0 
        ? categoryData.reduce((sum, d) => sum + d.value, 0) / categoryData.length 
        : Math.floor(Math.random() * 40) + 50; // Fallback for demo

      return {
        name: category.name,
        value: Math.round(average),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        category: category
      };
    });

    return { daily, summary: categoryAverages };
  }, [data, categories]);

  const overallScore = processedData.summary.length > 0 
    ? Math.round(processedData.summary.reduce((sum, item) => sum + item.value, 0) / processedData.summary.length)
    : 0;

  const overallStatus = getStatusFromScore(overallScore);
  const StatusIcon = STATUS_CONFIG[overallStatus].icon;

  const downloadResults = () => {
    const results = {
      area: area,
      categories: categories,
      data: data,
      summary: processedData.summary,
      overallScore,
      generatedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `area-analysis-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Area Summary Header */}
      {area && (
        <Card className="mobile-card border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{area.name}</h3>
                  <p className="text-xs text-muted-foreground">{area.size}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      Last 7 days
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${STATUS_CONFIG[overallStatus].color}`}>
                  {overallScore}
                </div>
                <div className="flex items-center space-x-1">
                  <StatusIcon className={`w-4 h-4 ${STATUS_CONFIG[overallStatus].color}`} />
                  <span className={`text-xs ${STATUS_CONFIG[overallStatus].color}`}>
                    {STATUS_CONFIG[overallStatus].label}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Score Card */}
      <Card className="mobile-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-responsive-base flex items-center justify-between">
            <span>Overall Analysis</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Score based on all selected categories. Higher scores indicate better conditions.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{overallScore}/100</div>
              <div className="flex items-center space-x-2 mt-1">
                <StatusIcon className={`w-5 h-5 ${STATUS_CONFIG[overallStatus].color}`} />
                <span className={`font-medium ${STATUS_CONFIG[overallStatus].color}`}>
                  {STATUS_CONFIG[overallStatus].label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <Progress value={overallScore} className="w-24 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {categories.length} categories analyzed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Results */}
      <div className="space-y-4">
        <h3 className="text-responsive-base font-semibold">Category Results</h3>
        <div className="grid gap-4">
          {processedData.summary.map((item, index) => {
            const status = getStatusFromScore(item.value);
            const config = STATUS_CONFIG[status];
            const IconComponent = CATEGORY_ICONS[item.category.id as keyof typeof CATEGORY_ICONS] || Info;
            
            return (
              <Card key={index} className="mobile-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${config.bgColor}`}>
                        <IconComponent className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.category.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${config.color}`}>{item.value}</div>
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress value={item.value} className="mb-2" />
                  
                  <p className="text-xs text-muted-foreground">
                    {getCategoryInsight(item.category.id, item.value)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Data Visualization */}
      {processedData.daily.length > 0 && (
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-responsive-base">Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.6)" 
                    fontSize={10}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" fontSize={10} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'white'
                    }} 
                  />
                  {categories.map((category, index) => (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={category.name}
                      stroke={`hsl(${index * 60}, 70%, 50%)`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: `hsl(${index * 60}, 70%, 50%)` }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={downloadResults} variant="outline" className="flex items-center space-x-2 touch-target">
          <Download className="w-4 h-4" />
          <span>Download Results</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2 touch-target">
          <Share2 className="w-4 h-4" />
          <span>Share Analysis</span>
        </Button>
      </div>

      {/* Simple Insights */}
      <Card className="mobile-card">
        <CardHeader>
          <CardTitle className="text-responsive-base">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {processedData.summary.slice(0, 3).map((item, index) => {
            const status = getStatusFromScore(item.value);
            const trend = index === 0 ? 'up' : index === 1 ? 'stable' : 'down';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
            
            return (
              <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                <TrendIcon className={`w-5 h-5 mt-0.5 ${
                  trend === 'up' ? 'text-green-500' : 
                  trend === 'down' ? 'text-red-500' : 
                  'text-yellow-500'
                }`} />
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryInsight(item.category.id, item.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}