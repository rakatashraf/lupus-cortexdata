import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArcGISMap } from './ArcGISMap';
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
  const canvasRef = useRef<HTMLDivElement>(null);

  // Update stats based on building changes
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
    <div className="min-h-screen p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
          3D Urban Planning Simulator
        </h1>
        <p className="text-muted-foreground text-lg">Design and visualize sustainable urban environments</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card hover-lift animate-slide-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className={cn("h-5 w-5", stat.color)} />
                  <Badge variant="outline" className="text-xs">{stat.value}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* View Toggle */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers3 className="h-5 w-5" />
                View Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as '3d' | 'satellite')}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="3d">
                    <Building className="h-4 w-4 mr-2" />
                    3D View
                  </TabsTrigger>
                  <TabsTrigger value="satellite">
                    <Satellite className="h-4 w-4 mr-2" />
                    Satellite
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
                      // Control ArcGIS rotation via global function
                      if ((window as any).arcgisRotationControl) {
                        (window as any).arcgisRotationControl(newState);
                      }
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
        <div className="lg:col-span-3">
          <Card className="glass-card h-full min-h-[900px] bg-gradient-to-br from-background/95 via-accent/5 to-background/95 backdrop-blur-sm border-primary/20 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {viewMode === '3d' ? '3D Simulation View' : 'Live Satellite Globe'}
                </CardTitle>
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
                  isFullscreen ? "h-screen" : "h-[850px]"
                )}
              >
                {viewMode === '3d' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* 3D Canvas Placeholder */}
                    <div className="text-center space-y-4 p-8">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-3xl opacity-30 animate-pulse"></div>
                        <Building className="h-32 w-32 mx-auto text-primary relative z-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">3D Urban Environment</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Interactive 3D visualization will render here. Click and drag to rotate, scroll to zoom.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-6">
                        {buildingTypes.map(type => {
                          const Icon = type.icon;
                          return (
                            <Badge key={type.value} variant="outline" className={cn("p-2", type.color, "bg-opacity-20")}>
                              <Icon className="h-4 w-4 mr-1" />
                              {type.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ArcGISMap 
                    webmapId="625da886dbf24a559da73840d293156d"
                    height={isFullscreen ? "100vh" : "950px"}
                    enableRotation={isSimulationRunning}
                    onRotationChange={setIsSimulationRunning}
                    isSimulationRunning={isSimulationRunning}
                    onLocationSelect={onLocationSelect}
                  />
                )}


                {/* Building Palette */}
                {viewMode === '3d' && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-background/80 backdrop-blur-md rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">Quick Build Palette</p>
                      <div className="flex gap-2">
                        {buildingTypes.map(type => {
                          const Icon = type.icon;
                          return (
                            <Button
                              key={type.value}
                              size="sm"
                              variant={selectedBuilding.type === type.value ? "default" : "outline"}
                              onClick={() => setSelectedBuilding({...selectedBuilding, type: type.value as any})}
                              className="flex-1"
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Environmental Impact */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl">Environmental Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sustainability Score</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  {Math.round((simulationStats.energyEfficiency + simulationStats.wellbeingScore) / 2)}%
                </Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${(simulationStats.energyEfficiency + simulationStats.wellbeingScore) / 2}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carbon Efficiency</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {Math.round(100 - (simulationStats.carbonFootprint * 10))}%
                </Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${100 - (simulationStats.carbonFootprint * 10)}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resource Optimization</span>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  {Math.round((100 - simulationStats.waterUsage + simulationStats.energyEfficiency) / 2)}%
                </Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${(100 - simulationStats.waterUsage + simulationStats.energyEfficiency) / 2}%` }}
                />
              </div>
            </div>
          </div>

          <Alert className="mt-6 border-primary/20 bg-primary/5">
            <AlertDescription className="text-sm">
              <span className="font-semibold">AI Recommendation:</span> Increasing green space by 10% and implementing solar panels on commercial buildings could improve overall sustainability by 25% while reducing carbon emissions by 1.2t/yr.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}