import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapPin, TrendingUp, Info, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { AreaSelector } from './AreaSelector';
import { CategorySelector } from './CategorySelector';
import { AnalysisResults } from './AnalysisResults';
import { n8nService } from '@/services/n8n-service';
import { ChartDataPoint } from '@/types/urban-indices';

interface SimpleDataVisualizationProps {
  latitude?: number;
  longitude?: number;
}

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
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

export function SimpleDataVisualization({ latitude = 23.8103, longitude = 90.4125 }: SimpleDataVisualizationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisData, setAnalysisData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaData | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryData[]>([]);
  const [timeFrame, setTimeFrame] = useState('recent');

  const steps: AnalysisStep[] = [
    {
      id: 'area',
      title: 'Choose Your Area',
      description: 'Where would you like to analyze?',
      completed: !!selectedArea,
      active: currentStep === 0
    },
    {
      id: 'categories',
      title: 'What Interests You?',
      description: 'Select what you want to learn about',
      completed: selectedCategories.length > 0,
      active: currentStep === 1
    },
    {
      id: 'results',
      title: 'Your Results',
      description: 'Understanding your area',
      completed: analysisData.length > 0,
      active: currentStep === 2
    }
  ];

  const handleAreaSelect = (area: AreaData) => {
    setSelectedArea(area);
    setError(null);
  };

  const handleCategorySelect = (categories: CategoryData[]) => {
    setSelectedCategories(categories);
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedArea?.bounds || selectedCategories.length === 0) {
      setError('Please complete all steps first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map selected categories to layer IDs
      const layerIds = selectedCategories.map(cat => cat.id);
      
      // Calculate date range based on timeFrame
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (timeFrame === 'recent' ? 7 : timeFrame === 'month' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const data = await n8nService.getAreaChartData(selectedArea.bounds, layerIds, startDate, endDate);
      
      if (data && data.success !== false) {
        setAnalysisData(processChartData(data));
      } else {
        setAnalysisData(generateFallbackData());
      }
      
      setCurrentStep(2); // Go to results
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Analysis failed. Showing sample data instead.');
      setAnalysisData(generateFallbackData());
      setCurrentStep(2); // Still go to results with fallback data
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (data: any): ChartDataPoint[] => {
    if (data.data && data.data.labels && data.data.datasets) {
      const labels = data.data.labels;
      const processed: ChartDataPoint[] = [];

      labels.forEach((date: string, index: number) => {
        data.data.datasets.forEach((dataset: any) => {
          processed.push({
            date,
            value: dataset.data[index] || 0,
            index: dataset.label
          });
        });
      });

      return processed;
    }

    return generateFallbackData();
  };

  const generateFallbackData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const dates = getLast7Days();
    
    selectedCategories.forEach(category => {
      dates.forEach(date => {
        data.push({
          date,
          value: Math.floor(Math.random() * 40) + 50,
          index: category.name
        });
      });
    });

    return data;
  };

  const getLast7Days = (): string[] => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8 space-x-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
            ${step.completed 
              ? 'bg-primary text-primary-foreground shadow-glow' 
              : step.active 
                ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse' 
                : 'bg-muted text-muted-foreground'
            }
          `}>
            {step.completed ? <CheckCircle className="w-5 h-5" /> : index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 transition-colors duration-200 ${
              steps[index + 1].completed || steps[index + 1].active ? 'bg-primary' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AreaSelector 
            onAreaSelect={handleAreaSelect}
            selectedArea={selectedArea}
            defaultLocation={{ latitude, longitude }}
          />
        );
      
      case 1:
        return (
          <CategorySelector 
            onCategorySelect={handleCategorySelect}
            selectedCategories={selectedCategories}
          />
        );
      
      case 2:
        return (
          <AnalysisResults 
            data={analysisData}
            area={selectedArea}
            categories={selectedCategories}
            loading={loading}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen p-responsive space-y-6 animate-fade-in safe-area-top safe-area-bottom">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-responsive-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Area Analysis
            </h1>
          </div>
          <p className="text-responsive-sm text-muted-foreground max-w-2xl mx-auto">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Main Content Card */}
        <Card className="max-w-4xl mx-auto glass-card border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-responsive-base flex items-center justify-center space-x-2">
              <span>{steps[currentStep].title}</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Step {currentStep + 1} of {steps.length}: {steps[currentStep].description}</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Step Content */}
            {renderCurrentStep()}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={handlePreviousStep}
                disabled={currentStep === 0}
                className="w-full sm:w-auto touch-target"
              >
                Previous
              </Button>

              <div className="flex items-center space-x-2">
                {selectedArea && (
                  <Badge variant="secondary" className="hidden sm:flex">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedArea.name || 'Selected Area'}
                  </Badge>
                )}
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="hidden sm:flex">
                    {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
                  </Badge>
                )}
              </div>

              {currentStep < steps.length - 1 ? (
                <Button 
                  onClick={handleNextStep}
                  disabled={
                    (currentStep === 0 && !selectedArea) || 
                    (currentStep === 1 && selectedCategories.length === 0)
                  }
                  className="w-full sm:w-auto touch-target"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleAnalyze}
                  disabled={loading || !selectedArea || selectedCategories.length === 0}
                  className="w-full sm:w-auto touch-target"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Area'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary Cards for Completed Steps */}
        {(selectedArea || selectedCategories.length > 0) && currentStep > 0 && (
          <div className="max-w-4xl mx-auto grid grid-responsive-2 gap-4">
            {selectedArea && (
              <Card className="mobile-card">
                <CardContent className="flex items-center space-x-3 p-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedArea.name || 'Selected Area'}</p>
                    <p className="text-xs text-muted-foreground">{selectedArea.size}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {selectedCategories.length > 0 && (
              <Card className="mobile-card">
                <CardContent className="flex items-center space-x-3 p-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{selectedCategories.length} Categories</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedCategories.map(cat => cat.name).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
