import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Share2,
  BarChart3,
  Lightbulb
} from 'lucide-react';

interface AnalysisResultsProps {
  analysisData: any;
  onExport?: () => void;
  onShare?: () => void;
}

export function AnalysisResults({ analysisData, onExport, onShare }: AnalysisResultsProps) {
  // Mock data if not provided
  const data = analysisData || {
    overallScore: 78,
    categories: [
      { name: 'Air Quality', score: 85, trend: 'up', status: 'good' },
      { name: 'Green Spaces', score: 72, trend: 'up', status: 'moderate' },
      { name: 'Water Quality', score: 89, trend: 'stable', status: 'excellent' },
      { name: 'Transportation', score: 65, trend: 'down', status: 'needs-attention' }
    ],
    insights: [
      'Air quality has improved by 12% over the past month',
      'Green space coverage is above city average',
      'Water quality remains consistently high',
      'Traffic congestion increased during peak hours'
    ],
    recommendations: [
      'Consider expanding bike lane network',
      'Monitor air quality during rush hours',
      'Maintain current green space initiatives',
      'Implement smart traffic management'
    ]
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 55) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'moderate':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Score */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <CardContent className="p-6 text-center">
          <div className={`text-4xl font-bold mb-2 ${getScoreColor(data.overallScore)}`}>
            {data.overallScore}
          </div>
          <div className="text-lg font-medium text-foreground mb-2">Overall Health Score</div>
          <Progress value={data.overallScore} className="w-full max-w-md mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">
            Your area is performing well with room for targeted improvements
          </p>
        </CardContent>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.categories.map((category: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(category.status)}
                  <div>
                    <div className="font-medium text-foreground">{category.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {category.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : category.trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      ) : null}
                      <Badge variant="outline" className="text-xs">
                        {category.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                    {category.score}
                  </div>
                  <Progress value={category.score} className="w-20 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.insights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-info/5 border border-info/20 rounded-lg">
                <div className="w-6 h-6 bg-info/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-info" />
                </div>
                <p className="text-sm text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onExport} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
        <Button onClick={onShare} variant="outline" className="flex-1">
          <Share2 className="w-4 h-4 mr-2" />
          Share Results
        </Button>
      </div>
    </div>
  );
}