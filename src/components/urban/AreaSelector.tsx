import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Search, 
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe
} from 'lucide-react';
import { getCurrentLocation, searchLocationByName } from '@/services/geolocation-service';
import { SelectedArea } from './SimpleDataVisualization';

interface AreaSelectorProps {
  onAreaSelect: (area: SelectedArea) => void;
  onNext: () => void;
  selectedArea: SelectedArea | null;
}

export function AreaSelector({ onAreaSelect, onNext, selectedArea }: AreaSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Popular preset locations
  const presetAreas = [
    { name: 'New York City, USA', lat: 40.7128, lng: -74.0060 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
    { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
    { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
    { name: 'San Francisco, USA', lat: 37.7749, lng: -122.4194 }
  ];

  const handleCurrentLocation = async () => {
    setIsGettingLocation(true);
    setError(null);

    try {
      const location = await getCurrentLocation({ enableHighAccuracy: true, timeout: 10000 });
      
      const area: SelectedArea = {
        type: 'current',
        name: 'Current Location',
        bounds: {
          north: location.latitude + 0.01,
          south: location.latitude - 0.01,
          east: location.longitude + 0.01,
          west: location.longitude - 0.01
        },
        latitude: location.latitude,
        longitude: location.longitude
      };

      onAreaSelect(area);
      setError(null);
    } catch (err) {
      setError('Unable to get your location. Please try searching for a place instead.');
      console.error('Geolocation error:', err);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchLocationByName(searchQuery);
      setSearchResults(results);

      if (results.length === 0) {
        setError(`No locations found for "${searchQuery}". Try a different search term.`);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (result: any) => {
    const area: SelectedArea = {
      type: 'location',
      name: result.displayName || result.display_name || `${result.latitude}, ${result.longitude}`,
      bounds: {
        north: result.latitude + 0.01,
        south: result.latitude - 0.01,
        east: result.longitude + 0.01,
        west: result.longitude - 0.01
      },
      latitude: result.latitude,
      longitude: result.longitude
    };

    onAreaSelect(area);
    setSearchResults([]);
    setSearchQuery('');
    setError(null);
  };

  const handlePresetSelect = (preset: any) => {
    const area: SelectedArea = {
      type: 'location',
      name: preset.name,
      bounds: {
        north: preset.lat + 0.01,
        south: preset.lat - 0.01,
        east: preset.lng + 0.01,
        west: preset.lng - 0.01
      },
      latitude: preset.lat,
      longitude: preset.lng
    };

    onAreaSelect(area);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          Where do you want to analyze?
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Location */}
        <div className="space-y-2">
          <Button
            onClick={handleCurrentLocation}
            disabled={isGettingLocation}
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 touch-target"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            Use My Current Location
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Get insights for your exact location
          </p>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a city, address, or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-muted/30 border-muted touch-target text-responsive-sm"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              size="sm"
              className="touch-target"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: "Central Park NYC", "Downtown London", "Paris"
          </p>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <p className="text-sm font-medium text-foreground">Search Results:</p>
            {searchResults.slice(0, 5).map((result, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left p-3 h-auto border-muted hover:bg-primary/5 hover:border-primary/20"
                onClick={() => handleLocationSelect(result)}
              >
                <div className="flex items-center gap-3 w-full">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="text-left overflow-hidden">
                    <div className="font-medium text-sm text-foreground truncate">
                      {result.displayName?.split(',')[0] || result.display_name?.split(',')[0] || 'Unknown Location'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.displayName || result.display_name || `${result.latitude}, ${result.longitude}`}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Popular Areas */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Popular Areas
          </p>
          <div className="grid grid-cols-1 gap-2">
            {presetAreas.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-between text-left p-3 h-auto border-muted hover:bg-primary/5 hover:border-primary/20 text-responsive-sm"
                onClick={() => handlePresetSelect(preset)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary/60 rounded-full" />
                  <span className="text-foreground">{preset.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Selected Area */}
        {selectedArea && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-success">Selected Area</p>
                <p className="text-xs text-success/80">{selectedArea.name}</p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {selectedArea.type === 'current' ? 'Current' : 'Location'}
              </Badge>
            </div>

            <Button
              onClick={onNext}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 touch-target"
            >
              Continue to Categories
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Helpful Tips */}
        <div className="bg-info/5 border border-info/20 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-info">💡 Tips for better results</p>
          <ul className="text-xs text-info/80 space-y-1">
            <li>• Be specific: "Manhattan NYC" works better than just "New York"</li>
            <li>• Include country for international locations</li>
            <li>• Try landmarks: "Times Square", "Eiffel Tower", "Sydney Opera House"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}