import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NASAEarthMap } from './NASAEarthMap';
import { ThreeDViewer, ViewerToolbar } from './3DViewer';
import WellbeingDetailModal from './WellbeingDetailModal';
import { 
  Map, 
  Satellite, 
  Building, 
  Trees, 
  Waves, 
  Download, 
  RefreshCw, 
  Layers3, 
  Home,
  Building2,
  TreePine,
  ShieldCheck,
  Zap,
  Droplets,
  Wind,
  Sun,
  Cloud,
  Maximize2,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingConfig {
  type: 'residential' | 'commercial' | 'industrial' | 'park' | 'water';
  height: number;
  density: number;
  sustainability: number;
}

interface SimulationStats {
  population: number;
  greenSpace: number;
  carbonFootprint: number;
  waterUsage: number;
  energyEfficiency: number;
  wellbeingScore: number;
}

interface Simulation3DProps {
  onLocationSelect?: (lat: number, lon: number) => void;
}

export function Simulation3D({ onLocationSelect }: Simulation3DProps = {}) {
  const [viewMode, setViewMode] = useState<'3d' | 'satellite'>('3d');
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingConfig>({
    type: 'residential',
    height: 50,
    density: 60,
    sustainability: 70
  });
  const [simulationStats, setSimulationStats] = useState<SimulationStats>({
    population: 45000,
    greenSpace: 35,
    carbonFootprint: 2.8,
    waterUsage: 85,
    energyEfficiency: 72,
    wellbeingScore: 78
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedWellbeingMetric, setSelectedWellbeingMetric] = useState<string | null>(null);
  const [isWellbeingModalOpen, setIsWellbeingModalOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // 3D Viewer state
  const [selectedTool, setSelectedTool] = useState('select');
  const [sceneObjects, setSceneObjects] = useState<any[]>([]);

  // 3D Viewer callbacks
  const handle3DAddObject = (type: any) => {
    console.log('Adding object:', type);
  };
  
  const handle3DResetCamera = () => {
    console.log('Resetting camera');
  };
  
  const handle3DClearScene = () => {
    setSceneObjects([]);
  };
  
  const handle3DToggleVisibility = (id: string) => {
    console.log('Toggling visibility:', id);
  };
  
  const handle3DDeleteObject = (id: string) => {
    console.log('Deleting object:', id);
  };

  // Wellbeing modal handlers
  const handleWellbeingClick = (metric: string) => {
    setSelectedWellbeingMetric(metric);
    setIsWellbeingModalOpen(true);
  };

  const closeWellbeingModal = () => {
    setIsWellbeingModalOpen(false);
    setSelectedWellbeingMetric(null);
  };

  // Helper functions for metric calculations
  const getCommunityHealthScore = () => Math.round((simulationStats.greenSpace + (100 - simulationStats.carbonFootprint * 10)) / 2);
  const getCommunityHealthStatus = () => {
    const score = getCommunityHealthScore();
    return score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  };

  const getWalkabilityScore = () => Math.round((simulationStats.greenSpace + (100 - selectedBuilding.density)) / 2);
  const getWalkabilityStatus = () => {
    const score = getWalkabilityScore();
    return score >= 75 ? "Very Walkable" : score >= 55 ? "Somewhat Walkable" : "Car Dependent";
  };

  const getLivingComfortScore = () => Math.round((100 - simulationStats.waterUsage + simulationStats.energyEfficiency + selectedBuilding.sustainability) / 3);
  const getLivingComfortStatus = () => {
    const score = getLivingComfortScore();
    return score >= 80 ? "Very Comfortable" : score >= 65 ? "Comfortable" : "Basic";
  };

  const getRecreationScore = () => simulationStats.greenSpace;
  const getRecreationStatus = () => {
    const score = getRecreationScore();
    return score >= 40 ? "Lots to Do" : score >= 25 ? "Some Options" : "Limited Fun";
  };
  
  const handle3DDuplicateObject = (id: string) => {
    console.log('Duplicating object:', id);
  };
  useEffect(() => {
    const updateStats = () => {
      const baseStats = { ...simulationStats };
      
      if (selectedBuilding.type === 'park') {
        baseStats.greenSpace = Math.min(100, baseStats.greenSpace + 5);
        baseStats.wellbeingScore = Math.min(100, baseStats.wellbeingScore + 3);
        baseStats.carbonFootprint = Math.max(0, baseStats.carbonFootprint - 0.2);
      } else if (selectedBuilding.type === 'commercial') {
        baseStats.population = baseStats.population + Math.floor(selectedBuilding.density * 10);
        baseStats.energyEfficiency = Math.max(0, baseStats.energyEfficiency - 2);
      } else if (selectedBuilding.type === 'residential') {
        baseStats.population = baseStats.population + Math.floor(selectedBuilding.density * 15);
        baseStats.waterUsage = Math.min(100, baseStats.waterUsage + 2);
      }
      
      baseStats.energyEfficiency = Math.min(100, baseStats.energyEfficiency + (selectedBuilding.sustainability / 20));
      setSimulationStats(baseStats);
    };
    
    updateStats();
  }, [selectedBuilding]);

  const handleExport = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      viewMode,
      buildings: selectedBuilding,
      statistics: simulationStats,
      metadata: {
        version: '1.0.0',
        format: 'lupus-cortex-3d'
      }
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `urban-simulation-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && canvasRef.current) {
      canvasRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const buildingTypes = [
    { value: 'residential', label: 'Residential', icon: Home, color: 'bg-blue-500' },
    { value: 'commercial', label: 'Commercial', icon: Building2, color: 'bg-purple-500' },
    { value: 'industrial', label: 'Industrial', icon: Building, color: 'bg-orange-500' },
    { value: 'park', label: 'Green Space', icon: TreePine, color: 'bg-green-500' },
    { value: 'water', label: 'Water Feature', icon: Waves, color: 'bg-cyan-500' }
  ];

  const statsCards = [
    { label: 'Population', value: simulationStats.population.toLocaleString(), icon: Home, color: 'text-blue-400' },
    { label: 'Green Space', value: `${simulationStats.greenSpace}%`, icon: Trees, color: 'text-green-400' },
    { label: 'Carbon', value: `${simulationStats.carbonFootprint}t/yr`, icon: Cloud, color: 'text-orange-400' },
    { label: 'Water Usage', value: `${simulationStats.waterUsage}%`, icon: Droplets, color: 'text-cyan-400' },
    { label: 'Energy', value: `${simulationStats.energyEfficiency}%`, icon: Zap, color: 'text-yellow-400' },
    { label: 'Well-being', value: `${simulationStats.wellbeingScore}`, icon: ShieldCheck, color: 'text-purple-400' }
  ];

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - responsive */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
          3D Urban Planning Simulator
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Design and visualize sustainable urban environments</p>
      </div>

      {/* Stats Overview - mobile optimized grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card hover-lift animate-slide-in-up touch-manipulation" style={{ animationDelay: `${index * 0.05}s` }}>
              <CardContent className="p-2 sm:p-3 lg:p-4">
                <div className="flex items-center justify-between">
                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color)} />
                  <Badge variant="outline" className="text-[10px] sm:text-xs">{stat.value}</Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Control Panel - responsive */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* View Toggle */}
          <Card className="glass-card">
            <CardHeader className="pb-3 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Layers3 className="h-4 w-4 sm:h-5 sm:w-5" />
                View Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as '3d' | 'satellite')}>
                <TabsList className="w-full grid grid-cols-2 h-10 sm:h-12">
                  <TabsTrigger value="3d" className="text-xs sm:text-sm">
                    <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">3D View</span>
                    <span className="sm:hidden">3D</span>
                  </TabsTrigger>
                  <TabsTrigger value="satellite" className="text-xs sm:text-sm">
                    <Satellite className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Satellite</span>
                    <span className="sm:hidden">Sat</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Building Controls */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Building Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Building Type</Label>
                <Select 
                  value={selectedBuilding.type} 
                  onValueChange={(v) => setSelectedBuilding({...selectedBuilding, type: v as any})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Height ({selectedBuilding.height}m)</Label>
                <Slider
                  value={[selectedBuilding.height]}
                  onValueChange={(v) => setSelectedBuilding({...selectedBuilding, height: v[0]})}
                  min={10}
                  max={200}
                  step={10}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Density ({selectedBuilding.density}%)</Label>
                <Slider
                  value={[selectedBuilding.density]}
                  onValueChange={(v) => setSelectedBuilding({...selectedBuilding, density: v[0]})}
                  min={10}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Sustainability ({selectedBuilding.sustainability}%)</Label>
                <Slider
                  value={[selectedBuilding.sustainability]}
                  onValueChange={(v) => setSelectedBuilding({...selectedBuilding, sustainability: v[0]})}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Simulation Controls */}
          {viewMode === 'satellite' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Simulation Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant={isSimulationRunning ? "destructive" : "default"}
                    onClick={() => {
                      const newState = !isSimulationRunning;
                      setIsSimulationRunning(newState);
                    }}
                    className="w-full"
                  >
                    {isSimulationRunning ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Simulation
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Simulation
                      </>
                    )}
                  </Button>
                  <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                    {isSimulationRunning ? 'Globe rotation enabled' : 'Globe rotation paused'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={handleExport}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Design
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setSimulationStats({
                  population: 45000,
                  greenSpace: 35,
                  carbonFootprint: 2.8,
                  waterUsage: 85,
                  energyEfficiency: 72,
                  wellbeingScore: 78
                });
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Simulation
            </Button>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="lg:col-span-2">
          {viewMode === '3d' ? (
            <Card className="glass-card h-full min-h-[600px] bg-gradient-to-br from-background/95 via-accent/5 to-background/95 backdrop-blur-sm border-primary/20 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">3D Simulation View</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  ref={canvasRef}
                  className={cn(
                    "relative w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800",
                    isFullscreen ? "h-screen" : "h-[550px]"
                  )}
                >
                  <ThreeDViewer
                    selectedTool={selectedTool}
                    onToolSelect={setSelectedTool}
                    onAddObject={handle3DAddObject}
                    onResetCamera={handle3DResetCamera}
                    onClearScene={handle3DClearScene}
                    objects={sceneObjects}
                    onToggleVisibility={handle3DToggleVisibility}
                    onDeleteObject={handle3DDeleteObject}
                    onDuplicateObject={handle3DDuplicateObject}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div 
              ref={canvasRef}
              className={cn(
                "relative w-full rounded-lg overflow-hidden",
                isFullscreen ? "h-screen" : "h-[950px]"
              )}
            >
              <NASAEarthMap 
                height={isFullscreen ? "100vh" : "950px"}
                enableRotation={isSimulationRunning}
                onRotationChange={setIsSimulationRunning}
                isSimulationRunning={isSimulationRunning}
                onLocationSelect={onLocationSelect}
              />
            </div>
          )}
        </div>
      </div>

      {/* Human Wellbeing Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-pink-400" />
            Human Wellbeing Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            How comfortable and happy would people be living in this area?
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Community Health Score */}
            <div 
              className="space-y-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group hover:shadow-lg"
              onClick={() => handleWellbeingClick('community-health')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Community Health</span>
                  <div className="group/tooltip relative">
                    <span className="text-xs text-muted-foreground cursor-help">ℹ️</span>
                    <div className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                      Based on air quality, green spaces, and population density
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-semibold",
                    getCommunityHealthScore() >= 80 
                      ? "bg-green-500/10 text-green-400 border-green-500/30" 
                      : getCommunityHealthScore() >= 60
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}
                >
                  {getCommunityHealthStatus()}
                </Badge>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    getCommunityHealthScore() >= 80
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : getCommunityHealthScore() >= 60
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500" 
                        : "bg-gradient-to-r from-red-500 to-orange-500"
                  )}
                  style={{ width: `${getCommunityHealthScore()}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getCommunityHealthScore() >= 80 
                  ? "Great for families!" 
                  : getCommunityHealthScore() >= 60
                    ? "Pretty comfortable"
                    : "Could be much better"}
              </p>
              <p className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                Click for detailed solutions →
              </p>
            </div>

            {/* Walkability Index */}
            <div 
              className="space-y-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group hover:shadow-lg"
              onClick={() => handleWellbeingClick('walkability')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Walkability</span>
                  <div className="group/tooltip relative">
                    <span className="text-xs text-muted-foreground cursor-help">ℹ️</span>
                    <div className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                      How easy and pleasant it is to walk around the neighborhood
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-semibold",
                    getWalkabilityScore() >= 75 
                      ? "bg-green-500/10 text-green-400 border-green-500/30" 
                      : getWalkabilityScore() >= 55
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}
                >
                  {getWalkabilityStatus()}
                </Badge>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    getWalkabilityScore() >= 75
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                      : getWalkabilityScore() >= 55
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500" 
                        : "bg-gradient-to-r from-red-500 to-orange-500"
                  )}
                  style={{ width: `${getWalkabilityScore()}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getWalkabilityScore() >= 75 
                  ? "Perfect for strolling" 
                  : getWalkabilityScore() >= 55
                    ? "Decent for walking"
                    : "Need a car to get around"}
              </p>
              <p className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                Click for detailed solutions →
              </p>
            </div>

            {/* Living Comfort */}
            <div 
              className="space-y-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group hover:shadow-lg"
              onClick={() => handleWellbeingClick('living-comfort')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Living Comfort</span>
                  <div className="group/tooltip relative">
                    <span className="text-xs text-muted-foreground cursor-help">ℹ️</span>
                    <div className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                      Quality of daily life including energy, water, and building standards
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-semibold",
                    getLivingComfortScore() >= 80 
                      ? "bg-green-500/10 text-green-400 border-green-500/30" 
                      : getLivingComfortScore() >= 65
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}
                >
                  {getLivingComfortStatus()}
                </Badge>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    getLivingComfortScore() >= 80
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : getLivingComfortScore() >= 65
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500" 
                        : "bg-gradient-to-r from-red-500 to-orange-500"
                  )}
                  style={{ width: `${getLivingComfortScore()}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getLivingComfortScore() >= 80 
                  ? "Modern amenities" 
                  : getLivingComfortScore() >= 65
                    ? "Standard quality"
                    : "Could use upgrades"}
              </p>
              <p className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                Click for detailed solutions →
              </p>
            </div>

            {/* Recreation Access */}
            <div 
              className="space-y-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer group hover:shadow-lg"
              onClick={() => handleWellbeingClick('recreation')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Fun & Recreation</span>
                  <div className="group/tooltip relative">
                    <span className="text-xs text-muted-foreground cursor-help">ℹ️</span>
                    <div className="invisible group-hover/tooltip:visible absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover border rounded-md shadow-lg text-xs z-10">
                      Access to parks, activities, and recreational spaces
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-semibold",
                    getRecreationScore() >= 40 
                      ? "bg-green-500/10 text-green-400 border-green-500/30" 
                      : getRecreationScore() >= 25
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}
                >
                  {getRecreationStatus()}
                </Badge>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    getRecreationScore() >= 40
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : getRecreationScore() >= 25
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500" 
                        : "bg-gradient-to-r from-red-500 to-orange-500"
                  )}
                  style={{ width: `${getRecreationScore()}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getRecreationScore() >= 40 
                  ? "Parks and activities nearby" 
                  : getRecreationScore() >= 25
                    ? "A few parks around"
                    : "Need more recreational spaces"}
              </p>
              <p className="text-xs text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                Click for detailed solutions →
              </p>
            </div>
          </div>
          
          <Alert className="mt-6 border-pink-500/50 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
            <ShieldCheck className="h-4 w-4 text-pink-400" />
            <AlertDescription className="text-pink-100">
              <strong>💡 Smart Tip:</strong> {
                simulationStats.wellbeingScore > 75 
                  ? "This area looks great for families! Adding a playground or community center could make it even more awesome for bringing neighbors together."
                  : simulationStats.wellbeingScore > 50
                    ? "Looking good! Try adding more parks or trees to make walking around even more pleasant. People love green spaces!"
                    : "This area needs some love! Start with adding parks and reducing crowding. More trees and open spaces will make people much happier to live here."
              }
            </AlertDescription>
          </Alert>

          {/* Wellbeing Detail Modal */}
          {selectedWellbeingMetric && (
            <WellbeingDetailModal
              isOpen={isWellbeingModalOpen}
              onClose={closeWellbeingModal}
              metric={selectedWellbeingMetric}
              score={
                selectedWellbeingMetric === 'community-health' ? getCommunityHealthScore() :
                selectedWellbeingMetric === 'walkability' ? getWalkabilityScore() :
                selectedWellbeingMetric === 'living-comfort' ? getLivingComfortScore() :
                selectedWellbeingMetric === 'recreation' ? getRecreationScore() : 0
              }
              status={
                selectedWellbeingMetric === 'community-health' ? getCommunityHealthStatus() :
                selectedWellbeingMetric === 'walkability' ? getWalkabilityStatus() :
                selectedWellbeingMetric === 'living-comfort' ? getLivingComfortStatus() :
                selectedWellbeingMetric === 'recreation' ? getRecreationStatus() : ''
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}