import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Thermometer,
  Trees,
  Droplets,
  Building,
  Car,
  Wind,
  Heart,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { SelectedCategory } from './SimpleDataVisualization';

interface CategorySelectorProps {
  onCategoriesSelect: (categories: SelectedCategory[]) => void;
  onNext: () => void;
  onBack: () => void;
  selectedCategories: SelectedCategory[];
}

// Define available categories with their associated layers
const availableCategories: SelectedCategory[] = [
  {
    id: 'climate',
    name: 'Climate & Temperature',
    icon: Thermometer,
    description: 'Heat islands, temperature patterns, climate risk',
    layers: ['CRI_Landsat', 'UHVI_MODIS', 'CRI_MODIS']
  },
  {
    id: 'environment',
    name: 'Green Spaces & Nature',
    icon: Trees,
    description: 'Parks, vegetation health, green coverage',
    layers: ['GEA_Landsat', 'GEA_Sentinel2', 'GEA_VIIRS']
  },
  {
    id: 'water',
    name: 'Water Quality',
    icon: Droplets,
    description: 'Water bodies, quality, groundwater, soil moisture',
    layers: ['WSI_Landsat', 'WSI_MODIS', 'WSI_Sentinel2', 'WSI_GRACE', 'WSI_SMAP']
  },
  {
    id: 'urban',
    name: 'Urban Development',
    icon: Building,
    description: 'Buildings, infrastructure, development patterns',
    layers: ['SCM_Landsat', 'SCM_Sentinel1', 'SCM_VIIRS']
  },
  {
    id: 'transport',
    name: 'Transportation',
    icon: Car,
    description: 'Roads, traffic, accessibility patterns',
    layers: ['TAS_Landsat', 'TAS_VIIRS']
  },
  {
    id: 'air',
    name: 'Air Quality',
    icon: Wind,
    description: 'Pollution levels, air cleanliness, emissions',
    layers: ['AQHI_MODIS', 'AQHI_Sentinel5P']
  },
  {
    id: 'community',
    name: 'Community Health',
    icon: Heart,
    description: 'Livability, environmental justice, well-being',
    layers: ['EJT_Landsat', 'EJT_MODIS', 'EJT_Sentinel5P', 'EJT_VIIRS']
  }
];

export function CategorySelector({ 
  onCategoriesSelect, 
  onNext, 
  onBack, 
  selectedCategories 
}: CategorySelectorProps) {
  const [tempSelected, setTempSelected] = useState<SelectedCategory[]>(selectedCategories);
  const [showRecommended, setShowRecommended] = useState(true);

  // Recommended categories for beginners
  const recommendedCategories = ['climate', 'environment', 'air', 'community'];

  const handleCategoryToggle = (category: SelectedCategory) => {
    setTempSelected(prev => {
      const isSelected = prev.some(c => c.id === category.id);
      if (isSelected) {
        return prev.filter(c => c.id !== category.id);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSelectRecommended = () => {
    const recommended = availableCategories.filter(cat => 
      recommendedCategories.includes(cat.id)
    );
    setTempSelected(recommended);
  };

  const handleSelectAll = () => {
    setTempSelected(availableCategories);
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleContinue = () => {
    onCategoriesSelect(tempSelected);
    onNext();
  };

  const getCategoryColor = (categoryId: string) => {
    const colors = {
      climate: 'text-red-400 bg-red-400/10 border-red-400/20',
      environment: 'text-green-400 bg-green-400/10 border-green-400/20',
      water: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      urban: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      transport: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      air: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      community: 'text-pink-400 bg-pink-400/10 border-pink-400/20'
    };
    return colors[categoryId as keyof typeof colors] || 'text-muted-foreground bg-muted/10 border-muted/20';
  };

  return (
    <Card className="border-primary/20 bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
            <Lightbulb className="w-3 h-3 text-primary" />
          </div>
          What interests you most?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the types of data you want to analyze. You can select multiple categories.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSelectRecommended}
            size="sm"
            variant="outline"
            className="text-xs border-primary/20 text-primary hover:bg-primary/10"
          >
            <Lightbulb className="w-3 h-3 mr-1" />
            Recommended
          </Button>
          <Button
            onClick={handleSelectAll}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Select All
          </Button>
          <Button
            onClick={handleClearAll}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Clear All
          </Button>
        </div>

        {/* Recommended Notice */}
        {showRecommended && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">💡 New to urban analysis?</p>
                <p className="text-primary/80 text-xs mt-1">
                  Try our recommended categories first: Climate, Environment, Air Quality, and Community Health
                </p>
              </div>
              <Button
                onClick={() => setShowRecommended(false)}
                size="sm"
                variant="ghost"
                className="text-primary/60 hover:text-primary hover:bg-primary/10 p-1"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* Category Grid */}
        <div className="grid grid-cols-1 gap-3">
          {availableCategories.map((category) => {
            const isSelected = tempSelected.some(c => c.id === category.id);
            const isRecommended = recommendedCategories.includes(category.id);
            const IconComponent = category.icon;
            const colorClass = getCategoryColor(category.id);

            return (
              <div
                key={category.id}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 touch-target
                  ${isSelected 
                    ? `${colorClass} scale-[1.02] shadow-md` 
                    : 'border-muted bg-muted/5 hover:border-muted-foreground/30 hover:bg-muted/10'
                  }
                `}
                onClick={() => handleCategoryToggle(category)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                  </div>

                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
                    ${isSelected ? colorClass : 'bg-muted text-muted-foreground'}
                  `}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground text-sm">
                        {category.name}
                      </h3>
                      {isRecommended && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${colorClass}`}>
                      <CheckCircle className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selection Summary */}
        {tempSelected.length > 0 && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">
                {tempSelected.length} categories selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tempSelected.map(category => (
                <Badge 
                  key={category.id} 
                  variant="outline" 
                  className="text-xs bg-success/10 text-success border-success/30"
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1 touch-target"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Area
          </Button>

          <Button
            onClick={handleContinue}
            disabled={tempSelected.length === 0}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 touch-target"
          >
            Continue to Time Period
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-info/5 border border-info/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-info">📊 About these categories</p>
          <ul className="text-xs text-info/80 space-y-1">
            <li>• Each category uses multiple satellite data sources</li>
            <li>• More categories = more comprehensive analysis</li>
            <li>• You can always change your selection later</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}