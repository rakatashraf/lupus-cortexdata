import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  HelpCircle, 
  Zap,
  MapPin,
  Brain,
  Eye
} from 'lucide-react';
import { AreaSelector } from './AreaSelector';
import { CategorySelector } from './CategorySelector';
import { AnalysisWizard } from './AnalysisWizard';
import { InsightPanel } from './InsightPanel';
import { DataVisualization } from './DataVisualization';

export interface SelectedArea {
  type: 'coordinates' | 'location' | 'current';
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  latitude?: number;
  longitude?: number;
}

export interface SelectedCategory {
  id: string;
  name: string;
  icon: React.ComponentType;
  description: string;
  layers: string[];
}

export function SimpleDataVisualization() {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([]);
  const [timeRange, setTimeRange] = useState('last-month');
  const [showHelp, setShowHelp] = useState(false);

  const steps = [
    { number: 1, title: 'Where?', description: 'Select area to analyze' },
    { number: 2, title: 'What?', description: 'Choose data categories' },
    { number: 3, title: 'When?', description: 'Select time period' },
    { number: 4, title: 'Insights', description: 'View analysis results' }
  ];

  const handleStepComplete = (step: number) => {
    if (step < 4) {
      setCurrentStep(step + 1);
    }
  };

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'advanced' : 'simple');
  };

  if (mode === 'advanced') {
    return (
      <div className="min-h-screen space-y-4">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Visualization</h1>
            <p className="text-muted-foreground">Advanced urban analytics interface</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Simple</span>
              <Switch checked={mode === 'advanced'} onCheckedChange={handleModeToggle} />
              <span className="text-sm text-muted-foreground">Advanced</span>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary">Pro Mode</Badge>
          </div>
        </div>

        {/* Advanced DataVisualization component */}
        <DataVisualization 
          latitude={selectedArea?.latitude} 
          longitude={selectedArea?.longitude} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-lg">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Smart City Analysis</h1>
                  <p className="text-muted-foreground">Understand your city with AI-powered insights</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-2 bg-card/50 rounded-lg border border-primary/20">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Simple</span>
              <Switch checked={mode === 'advanced'} onCheckedChange={handleModeToggle} />
                <span className="text-sm text-muted-foreground">Pro</span>
              </div>

              {/* Help Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="border-primary/20 text-primary hover:bg-primary/10"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div 
                  className={`flex flex-col items-center ${
                    currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep >= step.number 
                        ? 'bg-primary text-primary-foreground shadow-glow' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="text-xs mt-1 text-center">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div 
                    className={`w-12 h-0.5 mx-4 mt-[-20px] transition-all ${
                      currentStep > step.number ? 'bg-primary' : 'bg-muted'
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Panel */}
      {showHelp && (
        <Card className="border-info/20 bg-info/5 animate-slide-in-up">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-info/20 rounded-lg flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-info" />
              </div>
              <div className="space-y-2 text-sm">
                <h3 className="font-medium text-info">How to use Smart City Analysis</h3>
                <div className="text-muted-foreground space-y-1">
                  <p><strong>Step 1:</strong> Choose your area by searching for a place, using your location, or clicking on the map</p>
                  <p><strong>Step 2:</strong> Select what you want to analyze (air quality, green spaces, etc.)</p>
                  <p><strong>Step 3:</strong> Pick a time period for the analysis</p>
                  <p><strong>Step 4:</strong> Get easy-to-understand insights and recommendations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {currentStep === 1 && (
            <AreaSelector
              onAreaSelect={setSelectedArea}
              onNext={() => handleStepComplete(1)}
              selectedArea={selectedArea}
            />
          )}

          {currentStep === 2 && (
            <CategorySelector
              onCategoriesSelect={setSelectedCategories}
              onNext={() => handleStepComplete(2)}
              selectedCategories={selectedCategories}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <AnalysisWizard
              timeRange={timeRange}
              onTimeRangeSelect={setTimeRange}
              onNext={() => handleStepComplete(3)}
              onBack={() => setCurrentStep(2)}
              selectedArea={selectedArea}
              selectedCategories={selectedCategories}
            />
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-success">Analysis Complete</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your analysis is ready! View insights and recommendations below.
                  </p>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline" 
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Start New Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="lg:col-span-2">
          {currentStep === 4 && selectedArea && selectedCategories.length > 0 ? (
            <InsightPanel
              selectedArea={selectedArea}
              selectedCategories={selectedCategories}
              timeRange={timeRange}
            />
          ) : (
            <Card className="h-full min-h-[500px] flex items-center justify-center bg-muted/5 border-dashed">
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Eye className="w-8 h-8 text-primary/60" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-muted-foreground">Analysis Preview</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Complete the steps on the left to see your personalized city insights and recommendations here.
                  </p>
                </div>
                {currentStep > 1 && (
                  <div className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full inline-block">
                    Step {currentStep} of 4
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}