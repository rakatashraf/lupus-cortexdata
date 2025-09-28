import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Layers,
  Zap,
  CheckCircle,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { SelectedArea, SelectedCategory } from './SimpleDataVisualization';

interface AnalysisWizardProps {
  timeRange: string;
  onTimeRangeSelect: (range: string) => void;
  onNext: () => void;
  onBack: () => void;
  selectedArea: SelectedArea | null;
  selectedCategories: SelectedCategory[];
}

export function AnalysisWizard({ 
  timeRange, 
  onTimeRangeSelect, 
  onNext, 
  onBack,
  selectedArea,
  selectedCategories 
}: AnalysisWizardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const timeOptions = [
    { 
      id: 'last-week', 
      name: 'Last Week', 
      description: 'Recent snapshot of current conditions',
      icon: Clock,
      recommended: true
    },
    { 
      id: 'last-month', 
      name: 'Last Month', 
      description: 'Good balance of recent data and trends',
      icon: Calendar,
      recommended: true
    },
    { 
      id: 'last-3-months', 
      name: 'Last 3 Months', 
      description: 'Seasonal patterns and medium-term trends',
      icon: BarChart3,
      recommended: false
    },
    { 
      id: 'last-6-months', 
      name: 'Last 6 Months', 
      description: 'Comprehensive long-term analysis',
      icon: Sparkles,
      recommended: false
    }
  ];

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis time
    setTimeout(() => {
      setIsAnalyzing(false);
      onNext();
    }, 2500);
  };

  const getTimeRangeColor = (optionId: string) => {
    if (optionId === timeRange) {
      return 'border-primary bg-primary/10 text-primary';
    }
    return 'border-muted bg-muted/5 hover:border-muted-foreground/30 hover:bg-muted/10';
  };

  return (
    <Card className="border-primary/20 bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
            <Calendar className="w-3 h-3 text-primary" />
          </div>
          When do you want to analyze?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose a time period for your analysis. More recent data is more accurate.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Time Period Options */}
        <div className="space-y-3">
          {timeOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = timeRange === option.id;
            
            return (
              <div
                key={option.id}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 touch-target
                  ${getTimeRangeColor(option.id)}
                `}
                onClick={() => onTimeRangeSelect(option.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? 'bg-primary/20' : 'bg-muted'}
                  `}>
                    <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground text-sm">
                        {option.name}
                      </h3>
                      {option.recommended && (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis Summary */}
        <Card className="bg-primary/5 border border-primary/20">
          <CardContent className="p-4">
            <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Analysis Summary
            </h3>
            
            <div className="space-y-3 text-sm">
              {/* Area */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Area:</span>
                <span className="text-foreground font-medium">
                  {selectedArea?.name || 'No area selected'}
                </span>
              </div>

              {/* Categories */}
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">Categories:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedCategories.map((category) => (
                    <Badge 
                      key={category.id}
                      variant="outline" 
                      className="text-xs bg-primary/10 text-primary border-primary/30"
                    >
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Time Period:</span>
                <span className="text-foreground font-medium">
                  {timeOptions.find(opt => opt.id === timeRange)?.name || 'Not selected'}
                </span>
              </div>

              {/* Data Points Estimate */}
              <div className="bg-primary/10 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Expected Data</span>
                </div>
                <div className="text-xs text-primary/80">
                  • {selectedCategories.length * 3} satellite data layers
                  • {timeRange === 'last-week' ? '~50' : timeRange === 'last-month' ? '~200' : timeRange === 'last-3-months' ? '~600' : '~1200'} data points
                  • Multiple visualization formats
                  • AI-powered insights and recommendations
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Button */}
        {timeRange && (
          <Button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !selectedArea || selectedCategories.length === 0}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 touch-target h-12"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin w-5 h-5 mr-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                Analyzing Data...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Start Smart Analysis
              </>
            )}
          </Button>
        )}

        {/* Progress during analysis */}
        {isAnalyzing && (
          <div className="space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary">Processing satellite data...</span>
                  <span className="text-primary/60">30%</span>
                </div>
                <div className="w-full bg-primary/20 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              This may take a moment while we gather and process your data...
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isAnalyzing && (
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 touch-target"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Categories
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="bg-info/5 border border-info/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-info">⏱️ Analysis Time</p>
          <ul className="text-xs text-info/80 space-y-1">
            <li>• Recent data (Last Week): ~30 seconds</li>
            <li>• Monthly data: ~1-2 minutes</li>
            <li>• Long-term analysis: ~2-3 minutes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}