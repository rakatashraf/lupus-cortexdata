import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Thermometer, Trees, Droplets, Building2, Car, 
  Wind, Heart, Info, CheckCircle, Zap, Sun 
} from 'lucide-react';

interface CategorySelectorProps {
  onCategorySelect: (categories: CategoryData[]) => void;
  selectedCategories: CategoryData[];
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  description: string;
  selected: boolean;
}

const CATEGORIES = [
  {
    id: 'climate',
    name: 'Climate & Weather',
    icon: '🌡️',
    iconComponent: Thermometer,
    description: 'Temperature, heat islands, and climate patterns that affect daily comfort',
    color: 'from-orange-500 to-red-500',
    layers: ['CRI_Landsat', 'UHVI_MODIS'],
    examples: 'Hot spots, cool areas, seasonal changes'
  },
  {
    id: 'environment',
    name: 'Environment & Nature',
    icon: '🌿',
    iconComponent: Trees,
    description: 'Green spaces, parks, vegetation, and natural areas in your city',
    color: 'from-green-500 to-emerald-500',
    layers: ['GEA_Landsat', 'GEA_Sentinel2'],
    examples: 'Parks, forests, green corridors'
  },
  {
    id: 'water',
    name: 'Water Quality',
    icon: '💧',
    iconComponent: Droplets,
    description: 'Rivers, lakes, water bodies, and their cleanliness and health',
    color: 'from-blue-500 to-cyan-500',
    layers: ['WSI_Landsat', 'WSI_Sentinel2'],
    examples: 'River health, lake conditions, water purity'
  },
  {
    id: 'urban',
    name: 'Urban Development',
    icon: '🏙️',
    iconComponent: Building2,
    description: 'Buildings, infrastructure, and how the city is growing and changing',
    color: 'from-purple-500 to-indigo-500',
    layers: ['SCM_Landsat', 'SCM_Sentinel1'],
    examples: 'New buildings, city growth, infrastructure'
  },
  {
    id: 'transport',
    name: 'Transportation',
    icon: '🚗',
    iconComponent: Car,
    description: 'Roads, traffic patterns, and how people move around the city',
    color: 'from-yellow-500 to-amber-500',
    layers: ['TAS_Landsat', 'TAS_VIIRS'],
    examples: 'Traffic flow, road conditions, mobility'
  },
  {
    id: 'air',
    name: 'Air Quality',
    icon: '☁️',
    iconComponent: Wind,
    description: 'Air pollution, cleanliness, and what you breathe every day',
    color: 'from-slate-500 to-gray-500',
    layers: ['AQHI_MODIS', 'AQHI_Sentinel5P'],
    examples: 'Pollution levels, clean air zones, smog'
  },
  {
    id: 'health',
    name: 'Community Health',
    icon: '🏠',
    iconComponent: Heart,
    description: 'Overall livability, safety, and quality of life in different areas',
    color: 'from-pink-500 to-rose-500',
    layers: ['EJT_Landsat', 'EJT_MODIS'],
    examples: 'Livability, community wellness, safety'
  },
  {
    id: 'energy',
    name: 'Energy & Resources',
    icon: '⚡',
    iconComponent: Zap,
    description: 'Power consumption, energy efficiency, and resource usage patterns',
    color: 'from-violet-500 to-purple-500',
    layers: ['SCM_VIIRS', 'UHVI_VIIRS'],
    examples: 'Energy use, power grids, efficiency'
  }
];

export function CategorySelector({ onCategorySelect, selectedCategories }: CategorySelectorProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(
    selectedCategories.map(cat => cat.id)
  );

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = localSelected.includes(categoryId)
      ? localSelected.filter(id => id !== categoryId)
      : [...localSelected, categoryId];
    
    setLocalSelected(newSelected);
    
    // Convert to CategoryData format
    const selectedCategoryData = CATEGORIES
      .filter(cat => newSelected.includes(cat.id))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        selected: true
      }));
    
    onCategorySelect(selectedCategoryData);
  };

  const handleQuickSelect = (preset: string) => {
    let presetCategories: string[] = [];
    
    switch (preset) {
      case 'beginner':
        presetCategories = ['climate', 'environment', 'air'];
        break;
      case 'health':
        presetCategories = ['air', 'environment', 'health', 'water'];
        break;
      case 'planning':
        presetCategories = ['urban', 'transport', 'environment', 'climate'];
        break;
      case 'all':
        presetCategories = CATEGORIES.map(cat => cat.id);
        break;
    }
    
    setLocalSelected(presetCategories);
    const selectedCategoryData = CATEGORIES
      .filter(cat => presetCategories.includes(cat.id))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        selected: true
      }));
    
    onCategorySelect(selectedCategoryData);
  };

  return (
    <div className="space-y-6">
      {/* Quick Selection Presets */}
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            New to urban analysis? Try these presets:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('beginner')}
              className="flex items-center space-x-2"
            >
              <Sun className="w-4 h-4" />
              <span>Beginner (3 basics)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('health')}
              className="flex items-center space-x-2"
            >
              <Heart className="w-4 h-4" />
              <span>Health Focus</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect('planning')}
              className="flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Urban Planning</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-responsive-2 gap-4">
        {CATEGORIES.map((category) => {
          const isSelected = localSelected.includes(category.id);
          const IconComponent = category.iconComponent;
          
          return (
            <Card
              key={category.id}
              className={`
                mobile-card cursor-pointer transition-all duration-200 hover-lift
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-interactive' 
                  : 'hover:border-primary/50'
                }
              `}
              onClick={() => handleCategoryToggle(category.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-full transition-colors duration-200
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                    `}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm flex items-center space-x-2">
                        <span>{category.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                      </h3>
                    </div>
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Info className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs">{category.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Examples: {category.examples}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
                
                {isSelected && (
                  <Badge variant="secondary" className="text-xs">
                    ✓ Selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      {localSelected.length > 0 && (
        <Card className="mobile-card border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'} selected
                </p>
                <p className="text-xs text-muted-foreground">
                  {localSelected.length <= 3 
                    ? 'Good choice for focused analysis' 
                    : localSelected.length <= 5 
                      ? 'Comprehensive analysis' 
                      : 'Very detailed analysis'
                  }
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('all')}
                disabled={localSelected.length === CATEGORIES.length}
              >
                Select All
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-3">
              {localSelected.map((categoryId) => {
                const category = CATEGORIES.find(cat => cat.id === categoryId);
                return category ? (
                  <Badge key={categoryId} variant="secondary" className="text-xs">
                    {category.icon} {category.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {localSelected.length === 0 && (
        <div className="text-center p-6">
          <p className="text-sm text-muted-foreground">
            Select at least one category to continue with your analysis
          </p>
        </div>
      )}
    </div>
  );
}