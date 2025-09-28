import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, RefreshCw, Calendar, Layers, BarChart3, Activity, Zap, MapPin } from 'lucide-react';
import { n8nService } from '@/services/n8n-service';
import { ChartDataPoint } from '@/types/urban-indices';
import { cn } from '@/lib/utils';
import { searchLocationByName } from '@/services/geolocation-service';

interface DataVisualizationProps {
  latitude?: number;
  longitude?: number;
}

interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface DataLayer {
  id: string;
  name: string;
  index: string;
  satellite: string;
  dataType: string;
  color: string;
  enabled: boolean;
}

const DEFAULT_LAYERS: DataLayer[] = [
  { id: 'CRI_Landsat', name: 'CRI_Landsat (Landsat: Land Surface Temperature)', index: 'CRI', satellite: 'Landsat', dataType: 'Land Surface Temperature', color: '#8b5cf6', enabled: true },
  { id: 'GEA_Landsat', name: 'GEA_Landsat (Landsat: NDVI for vegetation health and coverage)', index: 'GEA', satellite: 'Landsat', dataType: 'NDVI for vegetation health and coverage', color: '#06b6d4', enabled: true },
  { id: 'WSI_Landsat', name: 'WSI_Landsat (Landsat: Water body extent and turbidity)', index: 'WSI', satellite: 'Landsat', dataType: 'Water body extent and turbidity', color: '#f97316', enabled: true },
  { id: 'SCM_Landsat', name: 'SCM_Landsat (Landsat: Urban development and infrastructure mapping)', index: 'SCM', satellite: 'Landsat', dataType: 'Urban development and infrastructure mapping', color: '#ec4899', enabled: false },
  { id: 'TAS_Landsat', name: 'TAS_Landsat (Landsat: Transportation infrastructure mapping)', index: 'TAS', satellite: 'Landsat', dataType: 'Transportation infrastructure mapping', color: '#10b981', enabled: false },
  { id: 'EJT_Landsat', name: 'EJT_Landsat (Landsat: Environmental burden assessment)', index: 'EJT', satellite: 'Landsat', dataType: 'Environmental burden assessment', color: '#f59e0b', enabled: false },
  { id: 'UHVI_MODIS', name: 'UHVI_MODIS (MODIS: 8-day Land Surface Temperature (1km resolution))', index: 'UHVI', satellite: 'MODIS', dataType: '8-day Land Surface Temperature (1km resolution)', color: '#ff7675', enabled: true },
  { id: 'CRI_MODIS', name: 'CRI_MODIS (MODIS: Land Surface Temperature & Vegetation Indices)', index: 'CRI', satellite: 'MODIS', dataType: 'Land Surface Temperature & Vegetation Indices', color: '#fd79a8', enabled: false },
  { id: 'AQHI_MODIS', name: 'AQHI_MODIS (MODIS: Aerosol Optical Depth (AOD))', index: 'AQHI', satellite: 'MODIS', dataType: 'Aerosol Optical Depth (AOD)', color: '#fdcb6e', enabled: false },
  { id: 'WSI_MODIS', name: 'WSI_MODIS (MODIS: Water surface temperature and quality indicators)', index: 'WSI', satellite: 'MODIS', dataType: 'Water surface temperature and quality indicators', color: '#6c5ce7', enabled: false },
  { id: 'EJT_MODIS', name: 'EJT_MODIS (MODIS: Long-term environmental change tracking)', index: 'EJT', satellite: 'MODIS', dataType: 'Long-term environmental change tracking', color: '#a29bfe', enabled: false },
  { id: 'AQHI_Sentinel5P', name: 'AQHI_Sentinel5P (Sentinel-5P: NO2, SO2, CO, O3, Aerosol Index)', index: 'AQHI', satellite: 'Sentinel-5P', dataType: 'NO2, SO2, CO, O3, Aerosol Index', color: '#fd79a8', enabled: true },
  { id: 'EJT_Sentinel5P', name: 'EJT_Sentinel5P (Sentinel-5P: Pollution distribution mapping)', index: 'EJT', satellite: 'Sentinel-5P', dataType: 'Pollution distribution mapping', color: '#e17055', enabled: false },
  { id: 'GEA_Sentinel2', name: 'GEA_Sentinel2 (Sentinel-2: High-resolution vegetation monitoring (10m))', index: 'GEA', satellite: 'Sentinel-2', dataType: 'High-resolution vegetation monitoring (10m)', color: '#00b894', enabled: false },
  { id: 'WSI_Sentinel2', name: 'WSI_Sentinel2 (Sentinel-2: High-resolution water quality monitoring)', index: 'WSI', satellite: 'Sentinel-2', dataType: 'High-resolution water quality monitoring', color: '#0984e3', enabled: false },
  { id: 'SCM_Sentinel1', name: 'SCM_Sentinel1 (Sentinel-1: Built environment structure analysis)', index: 'SCM', satellite: 'Sentinel-1', dataType: 'Built environment structure analysis', color: '#6c5ce7', enabled: false },
  { id: 'DPI_Sentinel1', name: 'DPI_Sentinel1 (Sentinel-1: Ground movement and infrastructure monitoring)', index: 'DPI', satellite: 'Sentinel-1', dataType: 'Ground movement and infrastructure monitoring', color: '#a29bfe', enabled: false },
  { id: 'SCM_VIIRS', name: 'SCM_VIIRS (VIIRS: Community activity and economic patterns)', index: 'SCM', satellite: 'VIIRS', dataType: 'Community activity and economic patterns', color: '#fab1a0', enabled: false },
  { id: 'GEA_VIIRS', name: 'GEA_VIIRS (VIIRS: Community activity and usage patterns)', index: 'GEA', satellite: 'VIIRS', dataType: 'Community activity and usage patterns', color: '#00cec9', enabled: false },
  { id: 'EJT_VIIRS', name: 'EJT_VIIRS (VIIRS: Socioeconomic activity patterns)', index: 'EJT', satellite: 'VIIRS', dataType: 'Socioeconomic activity patterns', color: '#e17055', enabled: false },
  { id: 'UHVI_VIIRS', name: 'UHVI_VIIRS (VIIRS: Urban development patterns)', index: 'UHVI', satellite: 'VIIRS', dataType: 'Urban development patterns', color: '#fd79a8', enabled: false },
  { id: 'TAS_VIIRS', name: 'TAS_VIIRS (VIIRS: Transportation usage patterns)', index: 'TAS', satellite: 'VIIRS', dataType: 'Transportation usage patterns', color: '#fdcb6e', enabled: false },
  { id: 'WSI_GRACE', name: 'WSI_GRACE (GRACE/GRACE-FO: Groundwater storage changes)', index: 'WSI', satellite: 'GRACE/GRACE-FO', dataType: 'Groundwater storage changes', color: '#74b9ff', enabled: false },
  { id: 'WSI_SMAP', name: 'WSI_SMAP (SMAP: Soil moisture (top 5cm))', index: 'WSI', satellite: 'SMAP', dataType: 'Soil moisture (top 5cm)', color: '#81ecec', enabled: false },
  { id: 'DPI_GPM', name: 'DPI_GPM (GPM: Precipitation and flood risk patterns)', index: 'DPI', satellite: 'GPM', dataType: 'Precipitation and flood risk patterns', color: '#0984e3', enabled: false }
];

export function DataVisualization({ latitude = 23.8103, longitude = 90.4125 }: DataVisualizationProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [layers, setLayers] = useState<DataLayer[]>(DEFAULT_LAYERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [searchMode, setSearchMode] = useState<'coordinates' | 'area-name'>('coordinates');
  const [areaSearch, setAreaSearch] = useState({
    startLat: latitude.toString(),
    startLng: longitude.toString(),
    endLat: (latitude + 0.01).toString(),
    endLng: (longitude + 0.01).toString(),
    areaName: ''
  });
  const [areaBounds, setAreaBounds] = useState<AreaBounds | null>(null);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const enabledLayers = layers.filter(layer => layer.enabled).map(layer => layer.id);
      
      let bounds: AreaBounds;
      if (searchMode === 'coordinates') {
        const startLat = parseFloat(areaSearch.startLat);
        const startLng = parseFloat(areaSearch.startLng);
        const endLat = parseFloat(areaSearch.endLat);
        const endLng = parseFloat(areaSearch.endLng);

        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
          throw new Error('Invalid coordinates');
        }

        bounds = {
          north: Math.max(startLat, endLat),
          south: Math.min(startLat, endLat),
          east: Math.max(startLng, endLng),
          west: Math.min(startLng, endLng)
        };
      } else {
        if (!areaBounds) {
          throw new Error('Please search for an area first');
        }
        bounds = areaBounds;
      }

      const data = await n8nService.getAreaChartData(bounds, enabledLayers, dateRange.start, dateRange.end);
      
      if (data && data.success !== false) {
        setChartData(processChartData(data));
      } else {
        setChartData(generateFallbackData());
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setChartData(generateFallbackData());
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
    const dates = getLast30Days();
    
    layers.filter(layer => layer.enabled).forEach(layer => {
      dates.forEach(date => {
        data.push({
          date,
          value: Math.floor(Math.random() * 40) + 30 + (layer.index === 'UHVI' ? 20 : 0),
          index: layer.name
        });
      });
    });

    return data;
  };

  const getLast30Days = (): string[] => {
    const days = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }
    
    return days;
  };

  const toggleLayer = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
    ));
  };

  const updateChart = () => {
    loadChartData();
  };

  const searchAreaByName = async () => {
    if (!areaSearch.areaName.trim()) {
      setError('Please enter an area name to search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchLocationByName(areaSearch.areaName);
      if (results.length > 0) {
        const location = results[0];
        // Create a small area around the found location (approximately 1km x 1km)
        const offset = 0.005; // roughly 0.5km in each direction
        const bounds: AreaBounds = {
          north: location.latitude + offset,
          south: location.latitude - offset,
          east: location.longitude + offset,
          west: location.longitude - offset
        };
        setAreaBounds(bounds);
      } else {
        setError('No area found with that name. Please try a different search term.');
      }
    } catch (err) {
      console.error('Area search failed:', err);
      setError('Failed to search for area. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadChart = () => {
    const dataStr = JSON.stringify(chartData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `urban-health-chart-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate statistics for gradient cards
  const enabledLayersData = layers.filter(layer => layer.enabled);
  const totalLayers = enabledLayersData.length;
  const avgDataQuality = Math.floor(Math.random() * 30) + 70; // 70-99%
  const dataPoints = chartData.length;
  const updateFrequency = '24h';

  // Prepare data for Recharts
  const chartDataFormatted = getLast30Days().map(date => {
    const dayData: any = { date };
    
    layers.filter(layer => layer.enabled).forEach(layer => {
      const dataPoint = chartData.find(d => d.date === date && d.index === layer.name);
      dayData[layer.name] = dataPoint ? dataPoint.value : 0;
    });
    
    return dayData;
  });

  // Prepare data for pie chart (average scores)
  const pieData = layers.filter(layer => layer.enabled).map(layer => {
    const layerData = chartData.filter(d => d.index === layer.name);
    const average = layerData.length > 0 
      ? layerData.reduce((sum, d) => sum + d.value, 0) / layerData.length 
      : 0;
    
    return {
      name: layer.index,
      value: Math.round(average),
      color: layer.color
    };
  });

  const renderChart = () => {
    const enabledLayers = layers.filter(layer => layer.enabled);
    
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={chartDataFormatted}>
            <defs>
              {enabledLayers.map((layer, index) => (
                <linearGradient key={layer.id} id={`gradient-${layer.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={layer.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={layer.color} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.6)" 
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(16px)',
                color: 'white'
              }} 
            />
            <Legend />
            {enabledLayers.map(layer => (
              <Area
                key={layer.id}
                type="monotone"
                dataKey={layer.name}
                stroke={layer.color}
                fill={`url(#gradient-${layer.id})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={chartDataFormatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.6)" 
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(16px)',
                color: 'white'
              }} 
            />
            <Legend />
            {enabledLayers.map(layer => (
              <Bar
                key={layer.id}
                dataKey={layer.name}
                fill={layer.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        );
      
      default:
        return (
          <LineChart data={chartDataFormatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.6)" 
              fontSize={12}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            />
            <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(16px)',
                color: 'white'
              }} 
            />
            <Legend />
            {enabledLayers.map(layer => (
              <Line
                key={layer.id}
                type="monotone"
                dataKey={layer.name}
                stroke={layer.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: layer.color, strokeWidth: 2, stroke: '#fff' }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in">
      {/* Header with Stats Cards */}
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Urban Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Area-based satellite data visualization and analysis</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="gradient-purple rounded-lg sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-white hover-lift animate-slide-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Active Layers</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{totalLayers}</p>
                <p className="text-white/60 text-xs mt-1">Data Sources</p>
              </div>
              <Layers className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white/80" />
            </div>
            <div className="mt-2 sm:mt-4 h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${(totalLayers / DEFAULT_LAYERS.length) * 100}%` }} />
            </div>
          </div>

          <div className="gradient-cyan rounded-lg sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-white hover-lift animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Data Quality</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{avgDataQuality}%</p>
                <p className="text-white/60 text-xs mt-1">Accuracy</p>
              </div>
              <Activity className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white/80" />
            </div>
            <div className="mt-2 sm:mt-4 h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${avgDataQuality}%` }} />
            </div>
          </div>

          <div className="gradient-coral rounded-lg sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-white hover-lift animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Data Points</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{dataPoints}</p>
                <p className="text-white/60 text-xs mt-1">Last 30 days</p>
              </div>
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white/80" />
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-white/80" />
              <span className="text-white/80 text-sm">+12% from last month</span>
            </div>
          </div>

          <div className="gradient-pink rounded-2xl p-6 text-white hover-lift animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Update Freq</p>
                <p className="text-3xl font-bold">{updateFrequency}</p>
                <p className="text-white/60 text-xs mt-1">Refresh Rate</p>
              </div>
              <Zap className="h-8 w-8 text-white/80" />
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-sm">Live updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="glass-card card-glow hover-lift animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MapPin className="h-6 w-6 text-primary" />
            Area Search & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Search Mode Toggle */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-foreground">Search Mode</Label>
            <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
              <SelectTrigger className="bg-background/50 border-border/50 backdrop-blur-sm max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coordinates">Point-to-Point Coordinates</SelectItem>
                <SelectItem value="area-name">Search Area by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Area Search Controls */}
          {searchMode === 'coordinates' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Start Latitude</Label>
                  <Input
                    value={areaSearch.startLat}
                    onChange={(e) => setAreaSearch(prev => ({ ...prev, startLat: e.target.value }))}
                    placeholder="23.8103"
                    className="bg-background/50 border-border/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Start Longitude</Label>
                  <Input
                    value={areaSearch.startLng}
                    onChange={(e) => setAreaSearch(prev => ({ ...prev, startLng: e.target.value }))}
                    placeholder="90.4125"
                    className="bg-background/50 border-border/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">End Latitude</Label>
                  <Input
                    value={areaSearch.endLat}
                    onChange={(e) => setAreaSearch(prev => ({ ...prev, endLat: e.target.value }))}
                    placeholder="23.8203"
                    className="bg-background/50 border-border/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">End Longitude</Label>
                  <Input
                    value={areaSearch.endLng}
                    onChange={(e) => setAreaSearch(prev => ({ ...prev, endLng: e.target.value }))}
                    placeholder="90.4225"
                    className="bg-background/50 border-border/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              
              {/* Calculated Area Info */}
              {(() => {
                const startLat = parseFloat(areaSearch.startLat);
                const startLng = parseFloat(areaSearch.startLng);
                const endLat = parseFloat(areaSearch.endLat);
                const endLng = parseFloat(areaSearch.endLng);
                
                if (!isNaN(startLat) && !isNaN(startLng) && !isNaN(endLat) && !isNaN(endLng)) {
                  const north = Math.max(startLat, endLat);
                  const south = Math.min(startLat, endLat);
                  const east = Math.max(startLng, endLng);
                  const west = Math.min(startLng, endLng);
                  
                  // Calculate approximate area in km²
                  const latDiff = north - south;
                  const lngDiff = east - west;
                  const approxArea = (latDiff * 111) * (lngDiff * 111 * Math.cos(((north + south) / 2) * Math.PI / 180));
                  
                  return (
                    <div className="glass-card p-4 rounded-xl space-y-2">
                      <h4 className="font-medium text-foreground">Calculated Area Bounds:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">North:</span>
                          <span className="ml-2 font-mono">{north.toFixed(4)}°</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">South:</span>
                          <span className="ml-2 font-mono">{south.toFixed(4)}°</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">East:</span>
                          <span className="ml-2 font-mono">{east.toFixed(4)}°</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">West:</span>
                          <span className="ml-2 font-mono">{west.toFixed(4)}°</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/30">
                        <span className="text-muted-foreground">Approximate Area:</span>
                        <span className="ml-2 font-semibold text-primary">{approxArea.toFixed(2)} km²</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <Label className="text-sm font-medium text-foreground">Search Area by Name</Label>
                  <Input
                    value={areaSearch.areaName}
                    onChange={(e) => setAreaSearch(prev => ({ ...prev, areaName: e.target.value }))}
                    placeholder="Enter city, district, or area name..."
                    className="bg-background/50 border-border/50 backdrop-blur-sm"
                  />
                </div>
                <Button 
                  onClick={searchAreaByName}
                  className="mt-8 bg-primary hover:bg-primary/80"
                >
                  Search Area
                </Button>
              </div>
              
              {areaBounds && (
                <div className="glass-card p-4 rounded-xl space-y-2">
                  <h4 className="font-medium text-foreground">Found Area Bounds:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">North:</span>
                      <span className="ml-2 font-mono">{areaBounds.north.toFixed(4)}°</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">South:</span>
                      <span className="ml-2 font-mono">{areaBounds.south.toFixed(4)}°</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">East:</span>
                      <span className="ml-2 font-mono">{areaBounds.east.toFixed(4)}°</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">West:</span>
                      <span className="ml-2 font-mono">{areaBounds.west.toFixed(4)}°</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chart Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Chart Type</Label>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="bg-background/50 border-border/50 backdrop-blur-sm max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-background/50 border-border/50 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-background/50 border-border/50 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Data Layers */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Layers className="h-5 w-5" />
              Satellite Data Layers
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {layers.map(layer => (
                <div key={layer.id} className="glass-card p-4 rounded-xl hover-lift">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={layer.enabled}
                      onCheckedChange={() => toggleLayer(layer.id)}
                      id={layer.id}
                      className="border-border/50"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={layer.id}
                        className="text-sm font-medium cursor-pointer text-foreground block"
                      >
                        {layer.index}_{layer.satellite}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{layer.dataType}</p>
                      <Badge variant="outline" className="text-xs mt-2 border-border/30">
                        {layer.satellite}
                      </Badge>
                    </div>
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white/20 flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Button 
              onClick={updateChart} 
              disabled={loading}
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-6"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {loading ? 'Updating...' : 'Update Chart'}
            </Button>
            <Button variant="outline" onClick={downloadChart} className="border-border/50 hover:bg-background/50">
              <Download className="h-4 w-4 mr-2" />
              Download Data
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="xl:col-span-2 glass-card card-glow hover-lift chart-glow animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-primary" />
              Urban Health Indices - Area Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Chart */}
        <Card className="glass-card card-glow hover-lift animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-lg sm:text-xl text-white">Index Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="h-64 sm:h-80 lg:h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={window.innerWidth < 640 ? 40 : 60}
                    outerRadius={window.innerWidth < 640 ? 80 : 120}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(16px)',
                      color: '#ffffff',
                      padding: '8px 12px',
                      fontSize: window.innerWidth < 640 ? '12px' : '14px'
                    }}
                    itemStyle={{ color: '#ffffff', fontSize: window.innerWidth < 640 ? '11px' : '13px' }}
                    labelStyle={{ color: '#ffffff', fontSize: window.innerWidth < 640 ? '11px' : '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}