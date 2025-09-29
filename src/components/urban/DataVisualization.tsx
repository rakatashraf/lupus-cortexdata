import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PlanningPriorityDetailModal } from '@/components/urban/PlanningPriorityDetailModal';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, RefreshCw, Calendar, Layers, BarChart3, Activity, Zap, MapPin, ChevronDown, ChevronUp, Thermometer, Leaf, Droplets, Building2, Car, Cloud, Home, HelpCircle, FileText, Users, Clock, AlertCircle, CheckCircle, Target, BookOpen } from 'lucide-react';
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

// Category definitions for better organization
interface DataCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  layers: string[];
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'climate',
    name: 'Climate Resilience Planning',
    icon: Thermometer,
    description: 'Climate adaptation readiness and heat mitigation zones',
    color: '#ff7675',
    layers: ['CRI_Landsat', 'UHVI_MODIS', 'CRI_MODIS', 'UHVI_VIIRS']
  },
  {
    id: 'environment',
    name: 'Green Infrastructure Development',
    icon: Leaf,
    description: 'Green space equity and environmental planning priorities',
    color: '#00b894',
    layers: ['GEA_Landsat', 'GEA_Sentinel2', 'GEA_VIIRS']
  },
  {
    id: 'water',
    name: 'Water Management Planning',
    icon: Droplets,
    description: 'Water infrastructure capacity and flood resilience zones',
    color: '#0984e3',
    layers: ['WSI_Landsat', 'WSI_MODIS', 'WSI_Sentinel2', 'WSI_GRACE', 'WSI_SMAP']
  },
  {
    id: 'urban',
    name: 'Community Development Zones',
    icon: Building2,
    description: 'Housing development priorities and community connectivity',
    color: '#6c5ce7',
    layers: ['SCM_Landsat', 'SCM_Sentinel1', 'SCM_VIIRS']
  },
  {
    id: 'transport',
    name: 'Mobility & Access Planning',
    icon: Car,
    description: 'Transit development priorities and accessibility planning',
    color: '#fdcb6e',
    layers: ['TAS_Landsat', 'TAS_VIIRS']
  },
  {
    id: 'air',
    name: 'Environmental Health Zones',
    icon: Cloud,
    description: 'Air quality planning priorities and health impact zones',
    color: '#fd79a8',
    layers: ['AQHI_MODIS', 'AQHI_Sentinel5P']
  },
  {
    id: 'community',
    name: 'Social Equity Assessment',
    icon: Home,
    description: 'Equity impact assessment and emergency preparedness zones',
    color: '#a29bfe',
    layers: ['EJT_Landsat', 'EJT_MODIS', 'EJT_Sentinel5P', 'EJT_VIIRS', 'DPI_Sentinel1', 'DPI_GPM']
  }
];

// Quick analysis presets
const ANALYSIS_PRESETS = [
  {
    id: 'health',
    name: '🏥 Public Health Assessment',
    description: 'Health impact zones and environmental health planning',
    categories: ['air', 'climate', 'environment']
  },
  {
    id: 'environmental',
    name: '🌍 Environmental Compliance Review',
    description: 'Environmental regulations and sustainability planning',
    categories: ['environment', 'water', 'air']
  },
  {
    id: 'urban-planning',
    name: '🏙️ Development Impact Analysis',
    description: 'Housing development, transit, and community impact assessment',
    categories: ['urban', 'transport', 'community']
  },
  {
    id: 'climate-resilience',
    name: '🌡️ Climate Adaptation Planning',
    description: 'Climate resilience and disaster preparedness planning',
    categories: ['climate', 'water', 'community']
  }
];

const DEFAULT_LAYERS: DataLayer[] = [
  { id: 'CRI_Landsat', name: 'Land Surface Temperature', index: 'CRI', satellite: 'Landsat', dataType: 'Land Surface Temperature', color: '#8b5cf6', enabled: true },
  { id: 'GEA_Landsat', name: 'Vegetation Health', index: 'GEA', satellite: 'Landsat', dataType: 'NDVI for vegetation health and coverage', color: '#06b6d4', enabled: true },
  { id: 'WSI_Landsat', name: 'Water Quality', index: 'WSI', satellite: 'Landsat', dataType: 'Water body extent and turbidity', color: '#f97316', enabled: true },
  { id: 'SCM_Landsat', name: 'Urban Development', index: 'SCM', satellite: 'Landsat', dataType: 'Urban development and infrastructure mapping', color: '#ec4899', enabled: false },
  { id: 'TAS_Landsat', name: 'Transportation Network', index: 'TAS', satellite: 'Landsat', dataType: 'Transportation infrastructure mapping', color: '#10b981', enabled: false },
  { id: 'EJT_Landsat', name: 'Environmental Impact', index: 'EJT', satellite: 'Landsat', dataType: 'Environmental burden assessment', color: '#f59e0b', enabled: false },
  { id: 'UHVI_MODIS', name: 'Heat Island Effect', index: 'UHVI', satellite: 'MODIS', dataType: '8-day Land Surface Temperature (1km resolution)', color: '#ff7675', enabled: true },
  { id: 'CRI_MODIS', name: 'Climate Risk Index', index: 'CRI', satellite: 'MODIS', dataType: 'Land Surface Temperature & Vegetation Indices', color: '#fd79a8', enabled: false },
  { id: 'AQHI_MODIS', name: 'Air Quality (Aerosols)', index: 'AQHI', satellite: 'MODIS', dataType: 'Aerosol Optical Depth (AOD)', color: '#fdcb6e', enabled: false },
  { id: 'WSI_MODIS', name: 'Water Temperature', index: 'WSI', satellite: 'MODIS', dataType: 'Water surface temperature and quality indicators', color: '#6c5ce7', enabled: false },
  { id: 'EJT_MODIS', name: 'Environmental Trends', index: 'EJT', satellite: 'MODIS', dataType: 'Long-term environmental change tracking', color: '#a29bfe', enabled: false },
  { id: 'AQHI_Sentinel5P', name: 'Air Pollution Monitoring', index: 'AQHI', satellite: 'Sentinel-5P', dataType: 'NO2, SO2, CO, O3, Aerosol Index', color: '#fd79a8', enabled: true },
  { id: 'EJT_Sentinel5P', name: 'Pollution Distribution', index: 'EJT', satellite: 'Sentinel-5P', dataType: 'Pollution distribution mapping', color: '#e17055', enabled: false },
  { id: 'GEA_Sentinel2', name: 'High-res Vegetation', index: 'GEA', satellite: 'Sentinel-2', dataType: 'High-resolution vegetation monitoring (10m)', color: '#00b894', enabled: false },
  { id: 'WSI_Sentinel2', name: 'Water Quality (High-res)', index: 'WSI', satellite: 'Sentinel-2', dataType: 'High-resolution water quality monitoring', color: '#0984e3', enabled: false },
  { id: 'SCM_Sentinel1', name: 'Building Structure', index: 'SCM', satellite: 'Sentinel-1', dataType: 'Built environment structure analysis', color: '#6c5ce7', enabled: false },
  { id: 'DPI_Sentinel1', name: 'Infrastructure Monitoring', index: 'DPI', satellite: 'Sentinel-1', dataType: 'Ground movement and infrastructure monitoring', color: '#a29bfe', enabled: false },
  { id: 'SCM_VIIRS', name: 'Community Activity', index: 'SCM', satellite: 'VIIRS', dataType: 'Community activity and economic patterns', color: '#fab1a0', enabled: false },
  { id: 'GEA_VIIRS', name: 'Green Space Usage', index: 'GEA', satellite: 'VIIRS', dataType: 'Community activity and usage patterns', color: '#00cec9', enabled: false },
  { id: 'EJT_VIIRS', name: 'Socioeconomic Patterns', index: 'EJT', satellite: 'VIIRS', dataType: 'Socioeconomic activity patterns', color: '#e17055', enabled: false },
  { id: 'UHVI_VIIRS', name: 'Urban Heat Patterns', index: 'UHVI', satellite: 'VIIRS', dataType: 'Urban development patterns', color: '#fd79a8', enabled: false },
  { id: 'TAS_VIIRS', name: 'Traffic Patterns', index: 'TAS', satellite: 'VIIRS', dataType: 'Transportation usage patterns', color: '#fdcb6e', enabled: false },
  { id: 'WSI_GRACE', name: 'Groundwater Changes', index: 'WSI', satellite: 'GRACE/GRACE-FO', dataType: 'Groundwater storage changes', color: '#74b9ff', enabled: false },
  { id: 'WSI_SMAP', name: 'Soil Moisture', index: 'WSI', satellite: 'SMAP', dataType: 'Soil moisture (top 5cm)', color: '#81ecec', enabled: false },
  { id: 'DPI_GPM', name: 'Precipitation & Floods', index: 'DPI', satellite: 'GPM', dataType: 'Precipitation and flood risk patterns', color: '#0984e3', enabled: false }
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
  
  // New state for beginner-friendly features
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['climate', 'environment', 'air']);
  const [selectedPreset, setSelectedPreset] = useState<string>('health');
  const [selectedPriority, setSelectedPriority] = useState<any>(null);

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

  // New helper functions for categories and presets
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId];
      
      // Update layers based on selected categories
      const categoriesToShow = DATA_CATEGORIES.filter(cat => newCategories.includes(cat.id));
      const layersToEnable = categoriesToShow.flatMap(cat => cat.layers);
      
      setLayers(prevLayers => 
        prevLayers.map(layer => ({
          ...layer,
          enabled: layersToEnable.includes(layer.id)
        }))
      );
      
      return newCategories;
    });
  };

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = ANALYSIS_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedCategories(preset.categories);
      
      // Enable layers for this preset
      const categoriesToShow = DATA_CATEGORIES.filter(cat => preset.categories.includes(cat.id));
      const layersToEnable = categoriesToShow.flatMap(cat => cat.layers);
      
      setLayers(prevLayers => 
        prevLayers.map(layer => ({
          ...layer,
          enabled: layersToEnable.includes(layer.id)
        }))
      );
    }
  };

  // Generate planning insights based on data
  const generateInsights = () => {
    if (chartData.length === 0) return [];
    
    const insights = [];
    const enabledLayers = layers.filter(l => l.enabled);
    
    // Calculate planning priorities and intervention needs
    enabledLayers.forEach(layer => {
      const layerData = chartData.filter(d => d.index === layer.name);
      if (layerData.length > 0) {
        const avg = layerData.reduce((sum, d) => sum + d.value, 0) / layerData.length;
        const recent = layerData.slice(-7).reduce((sum, d) => sum + d.value, 0) / Math.min(7, layerData.length);
        const trend = recent > avg ? 'improving' : recent < avg ? 'declining' : 'stable';
        
        // Planning-focused status and recommendations
        let planningStatus, recommendation, interventionLevel;
        if (avg >= 70) {
          planningStatus = 'Implementation Ready';
          recommendation = 'Continue monitoring and maintain current policies';
          interventionLevel = 'excellent';
        } else if (avg >= 50) {
          planningStatus = 'Policy Development Needed';
          recommendation = 'Develop policy framework and implementation plan';
          interventionLevel = 'good';
        } else if (avg >= 30) {
          planningStatus = 'Immediate Planning Required';
          recommendation = 'Urgent planning intervention and resource allocation needed';
          interventionLevel = 'moderate';
        } else {
          planningStatus = 'Critical Action Zone';
          recommendation = 'Emergency planning response and immediate action required';
          interventionLevel = 'critical';
        }
        
        insights.push({
          layer: layer.name,
          average: Math.round(avg),
          trend,
          status: planningStatus,
          recommendation,
          interventionLevel,
          priority: avg < 30 ? 'High' : avg < 50 ? 'Medium' : 'Low'
        });
      }
    });
    
    // Sort by priority (Critical zones first)
    return insights.sort((a, b) => a.average - b.average);
  };

  // Generate detailed planning content based on category and intervention level
  const getDetailedPlanningContent = (insight: any) => {
    const layerName = insight.layer.toLowerCase();
    const score = insight.average;
    const category = DATA_CATEGORIES.find(cat => 
      cat.layers.some(layer => 
        layers.find(l => l.name === insight.layer)?.id.includes(layer.split('_')[0])
      )
    );

    const planningContent = {
      suggestions: [],
      tips: [],
      implementation: [],
      monitoring: []
    };

    // Category-specific content based on planning impact zones
    if (category?.id === 'climate') {
      planningContent.suggestions = [
        'Implement heat island mitigation strategies through green corridors',
        'Develop climate-resilient building codes and zoning regulations',
        'Create emergency cooling centers and heat warning systems',
        'Establish urban tree canopy expansion programs'
      ];
      planningContent.tips = [
        'Prioritize heat-vulnerable communities for immediate intervention',
        'Coordinate with public health department for heat emergency protocols',
        'Engage community stakeholders in climate adaptation planning',
        'Consider long-term climate projections in infrastructure planning'
      ];
    } else if (category?.id === 'environment') {
      planningContent.suggestions = [
        'Develop comprehensive green infrastructure master plan',
        'Implement biodiversity corridors connecting green spaces',
        'Create community gardens and pocket parks in underserved areas',
        'Establish green building incentives and requirements'
      ];
      planningContent.tips = [
        'Ensure equitable distribution of green spaces across neighborhoods',
        'Integrate green infrastructure with stormwater management',
        'Partner with environmental organizations for implementation',
        'Consider maintenance and stewardship in long-term planning'
      ];
    } else if (category?.id === 'water') {
      planningContent.suggestions = [
        'Upgrade water infrastructure to meet projected demand',
        'Implement smart water management systems and leak detection',
        'Develop flood resilience and stormwater management plans',
        'Create water conservation incentives and regulations'
      ];
      planningContent.tips = [
        'Coordinate with utility providers for infrastructure upgrades',
        'Consider climate change impacts on water resources',
        'Engage communities in water conservation education',
        'Plan for emergency water supply during disasters'
      ];
    } else if (category?.id === 'urban') {
      planningContent.suggestions = [
        'Develop mixed-use, transit-oriented development policies',
        'Create affordable housing strategies and inclusionary zoning',
        'Enhance community connectivity through walkable design',
        'Implement smart growth principles in development review'
      ];
      planningContent.tips = [
        'Balance development density with community character',
        'Ensure adequate public services and infrastructure capacity',
        'Facilitate community input in development planning',
        'Address gentrification and displacement concerns proactively'
      ];
    } else if (category?.id === 'transport') {
      planningContent.suggestions = [
        'Expand public transit network and improve accessibility',
        'Develop complete streets design standards',
        'Create bicycle and pedestrian infrastructure networks',
        'Implement transportation demand management programs'
      ];
      planningContent.tips = [
        'Prioritize transit investments in underserved communities',
        'Coordinate transportation and land use planning',
        'Consider emerging mobility technologies in planning',
        'Ensure accessibility for people with disabilities'
      ];
    } else if (category?.id === 'air') {
      planningContent.suggestions = [
        'Implement air quality monitoring and alert systems',
        'Develop emission reduction strategies for industrial areas',
        'Create car-free zones and promote clean transportation',
        'Establish green buffers around pollution sources'
      ];
      planningContent.tips = [
        'Focus interventions on environmental justice communities',
        'Coordinate with regional air quality management agencies',
        'Integrate air quality considerations in development review',
        'Educate community about air quality health impacts'
      ];
    } else if (category?.id === 'community') {
      planningContent.suggestions = [
        'Conduct comprehensive community needs assessment',
        'Develop emergency preparedness and response plans',
        'Create community benefit agreements for new developments',
        'Establish social equity indicators and monitoring systems'
      ];
      planningContent.tips = [
        'Center community voices in planning processes',
        'Address historical inequities in resource allocation',
        'Build partnerships with community-based organizations',
        'Ensure cultural competency in planning initiatives'
      ];
    }

    // Implementation guidance based on intervention level
    if (score < 30) {
      planningContent.implementation = [
        '1. Declare planning emergency and allocate emergency resources',
        '2. Form crisis response team with key stakeholders',
        '3. Develop 90-day immediate action plan',
        '4. Begin community engagement and needs assessment',
        '5. Seek emergency funding and regulatory relief'
      ];
    } else if (score < 50) {
      planningContent.implementation = [
        '1. Establish planning task force and timeline',
        '2. Conduct comprehensive policy review and gap analysis',
        '3. Develop 6-month policy framework',
        '4. Engage stakeholders and gather community input',
        '5. Prepare budget requests and implementation plan'
      ];
    } else if (score < 70) {
      planningContent.implementation = [
        '1. Form planning working group with technical experts',
        '2. Review best practices and develop recommendations',
        '3. Create 12-month implementation roadmap',
        '4. Coordinate with relevant departments and agencies',
        '5. Develop monitoring and evaluation framework'
      ];
    } else {
      planningContent.implementation = [
        '1. Continue regular monitoring and data collection',
        '2. Maintain stakeholder relationships and communication',
        '3. Plan for continuous improvement and optimization',
        '4. Document best practices and lessons learned',
        '5. Prepare for periodic policy review and updates'
      ];
    }

    // Monitoring framework
    planningContent.monitoring = [
      'Establish baseline metrics and data collection protocols',
      'Set up quarterly progress reviews with stakeholders',
      'Create public dashboard for transparency and accountability',
      'Develop early warning indicators for intervention triggers',
      'Plan annual comprehensive assessment and strategy updates'
    ];

    return planningContent;
  };

  const openPriorityModal = (insight: any) => {
    setSelectedPriority(insight);
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
    
    // Planning decision thresholds for reference lines
    const thresholds = [
      { value: 70, label: 'Implementation Ready (70%)', color: '#10b981', strokeDasharray: '5 5' },
      { value: 50, label: 'Policy Development (50%)', color: '#f59e0b', strokeDasharray: '8 4' },
      { value: 30, label: 'Planning Required (30%)', color: '#ef4444', strokeDasharray: '3 3' }
    ];
    
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
            {/* Planning Decision Threshold Lines */}
            {thresholds.map((threshold, index) => (
              <Line
                key={`threshold-${index}`}
                type="monotone"
                data={[{ date: chartDataFormatted[0]?.date, value: threshold.value }, { date: chartDataFormatted[chartDataFormatted.length - 1]?.date, value: threshold.value }]}
                dataKey="value"
                stroke={threshold.color}
                strokeWidth={2}
                strokeDasharray={threshold.strokeDasharray}
                dot={false}
                connectNulls={false}
                name={`${threshold.label}`}
              />
            ))}
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
            {/* Planning Decision Threshold Lines */}
            {thresholds.map((threshold, index) => (
              <Line
                key={`threshold-${index}`}
                type="monotone"
                data={[{ date: chartDataFormatted[0]?.date, value: threshold.value }, { date: chartDataFormatted[chartDataFormatted.length - 1]?.date, value: threshold.value }]}
                dataKey="value"
                stroke={threshold.color}
                strokeWidth={2}
                strokeDasharray={threshold.strokeDasharray}
                dot={false}
                connectNulls={false}
                name={`${threshold.label}`}
              />
            ))}
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
            {/* Planning Decision Threshold Lines */}
            {thresholds.map((threshold, index) => (
              <Line
                key={`threshold-${index}`}
                type="monotone"
                data={[{ date: chartDataFormatted[0]?.date, value: threshold.value }, { date: chartDataFormatted[chartDataFormatted.length - 1]?.date, value: threshold.value }]}
                dataKey="value"
                stroke={threshold.color}
                strokeWidth={2}
                strokeDasharray={threshold.strokeDasharray}
                dot={false}
                connectNulls={false}
                name={`${threshold.label}`}
              />
            ))}
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
            Planning Decision Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Strategic planning support through satellite data analysis</p>
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

          {/* Quick Analysis Presets */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Zap className="h-5 w-5" />
              Planning Workflows
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ANALYSIS_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  onClick={() => applyPreset(preset.id)}
                  className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                >
                  <div className="text-sm font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </Button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Layers className="h-5 w-5" />
              Planning Impact Zones
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-muted-foreground"
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Advanced
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Advanced Options
                  </>
                )}
              </Button>
            </div>
            
            {/* Simple Category View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {DATA_CATEGORIES.map(category => {
                const IconComponent = category.icon;
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <div 
                    key={category.id} 
                    className={cn(
                      "glass-card p-4 rounded-xl cursor-pointer transition-all hover-lift",
                      isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                    )}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div 
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-foreground">{category.name}</h3>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent onClick
                            className="border-border/50"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {category.layers.filter(layerId => 
                              layers.find(l => l.id === layerId)?.enabled
                            ).length}/{category.layers.length} layers active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advanced Layer View */}
            {showAdvanced && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  Advanced: Individual satellite data layers for detailed analysis
                </div>
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
                            {layer.name}
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
            )}
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

      {/* Analysis Results & Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Chart */}
        <Card className="xl:col-span-3 glass-card card-glow hover-lift chart-glow animate-slide-in-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-primary" />
              Planning Impact Analysis
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

        {/* Insights Panel */}
        <Card className="glass-card card-glow hover-lift animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Planning Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generateInsights().slice(0, 4).map((insight, index) => {
              const detailedContent = getDetailedPlanningContent(insight);
              
              return (
                <Card key={index} className="group cursor-pointer hover:bg-background/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02] border-border/50" onClick={() => openPriorityModal(insight)}>
                  <CardContent className="p-4 min-w-0">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground leading-tight line-clamp-2 min-w-0 flex-1">{insight.layer}</span>
                        <Badge 
                          variant={insight.interventionLevel as any}
                          className="text-xs shrink-0 font-medium"
                        >
                          {insight.priority}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Status:</span>
                          <span className="text-xs font-medium truncate">{insight.status}</span>
                        </div>
                        
                        <div className="bg-background/30 rounded-md p-2 border border-border/30">
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 break-words">
                            {insight.recommendation}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Score:</span>
                            <span className="text-xs font-bold text-primary">{insight.average}</span>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 text-xs font-medium",
                            insight.trend === 'improving' ? 'text-green-500' : 
                            insight.trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'
                          )}>
                            <TrendingUp className={cn(
                              "h-3 w-3",
                              insight.trend === 'declining' && "rotate-180"
                            )} />
                            <span className="capitalize">{insight.trend}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {generateInsights().length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run analysis to see planning priorities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {/* Planning Priority Detail Modal */}
        <PlanningPriorityDetailModal
          isOpen={!!selectedPriority}
          onClose={() => setSelectedPriority(null)}
          priority={selectedPriority}
          detailedContent={selectedPriority ? getDetailedPlanningContent(selectedPriority) : null}
        />

      {/* Summary Chart */}
      <Card className="glass-card card-glow hover-lift animate-slide-in-up" style={{ animationDelay: '0.7s' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                    border: 'none',
                    borderRadius: '8px',
                    backdropFilter: 'blur(16px)',
                    color: 'white'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}