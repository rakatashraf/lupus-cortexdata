import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Search, Navigation, Globe, Building2, Trees, Waves } from 'lucide-react';
import { searchLocationByName } from '@/services/geolocation-service';

interface AreaSelectorProps {
  onAreaSelect: (area: AreaData) => void;
  selectedArea: AreaData | null;
  defaultLocation: { latitude: number; longitude: number };
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

const POPULAR_AREAS = [
  { name: 'City Center', type: 'urban', icon: Building2 },
  { name: 'Downtown', type: 'urban', icon: Building2 },
  { name: 'Central Park', type: 'nature', icon: Trees },
  { name: 'Waterfront', type: 'water', icon: Waves },
  { name: 'Business District', type: 'urban', icon: Building2 },
  { name: 'University Area', type: 'education', icon: Building2 },
];

export function AreaSelector({ onAreaSelect, selectedArea, defaultLocation }: AreaSelectorProps) {
  const [searchMode, setSearchMode] = useState<'name' | 'coordinates'>('name');
  const [areaName, setAreaName] = useState('');
  const [coordinates, setCoordinates] = useState({
    startLat: defaultLocation.latitude.toString(),
    startLng: defaultLocation.longitude.toString(),
    endLat: (defaultLocation.latitude + 0.01).toString(),
    endLng: (defaultLocation.longitude + 0.01).toString(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearchByName = async (name: string = areaName) => {
    if (!name.trim()) {
      setError('Please enter a location name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchLocationByName(name.trim());
      if (results.length > 0) {
        const location = results[0];
        const offset = 0.005; // ~0.5km radius
        
        const areaData: AreaData = {
          bounds: {
            north: location.latitude + offset,
            south: location.latitude - offset,
            east: location.longitude + offset,
            west: location.longitude - offset,
          },
          name: location.display_name,
          size: '~1 km²',
          center: { lat: location.latitude, lng: location.longitude }
        };
        
        onAreaSelect(areaData);
      } else {
        setError('Location not found. Try a different search term.');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByCoordinates = () => {
    const startLat = parseFloat(coordinates.startLat);
    const startLng = parseFloat(coordinates.startLng);
    const endLat = parseFloat(coordinates.endLat);
    const endLng = parseFloat(coordinates.endLng);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      setError('Please enter valid coordinates');
      return;
    }

    const bounds = {
      north: Math.max(startLat, endLat),
      south: Math.min(startLat, endLat),
      east: Math.max(startLng, endLng),
      west: Math.min(startLng, endLng),
    };

    // Calculate approximate area size
    const latDiff = Math.abs(bounds.north - bounds.south);
    const lngDiff = Math.abs(bounds.east - bounds.west);
    const areaSizeKm = (latDiff * 111) * (lngDiff * 111 * Math.cos(bounds.north * Math.PI / 180));

    const areaData: AreaData = {
      bounds,
      name: `Custom Area (${startLat.toFixed(4)}, ${startLng.toFixed(4)})`,
      size: `~${areaSizeKm.toFixed(1)} km²`,
      center: { 
        lat: (bounds.north + bounds.south) / 2, 
        lng: (bounds.east + bounds.west) / 2 
      }
    };

    onAreaSelect(areaData);
    setError(null);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const offset = 0.005;
          
          const areaData: AreaData = {
            bounds: {
              north: latitude + offset,
              south: latitude - offset,
              east: longitude + offset,
              west: longitude - offset,
            },
            name: 'Your Current Location',
            size: '~1 km²',
            center: { lat: latitude, lng: longitude }
          };
          
          onAreaSelect(areaData);
        },
        () => {
          setError('Could not get your location. Please search manually.');
        }
      );
    } else {
      setError('Location services not available.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={searchMode === 'name' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSearchMode('name')}
            className="flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Search by Name</span>
          </Button>
          <Button
            variant={searchMode === 'coordinates' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSearchMode('coordinates')}
            className="flex items-center space-x-2"
          >
            <Globe className="w-4 h-4" />
            <span>Use Coordinates</span>
          </Button>
        </div>
      </div>

      {searchMode === 'name' ? (
        <div className="space-y-4">
          {/* Location Search */}
          <Card className="mobile-card">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="area-search" className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Search for a Location</span>
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="area-search"
                    placeholder="Enter city, neighborhood, or landmark..."
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchByName()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleSearchByName()} 
                    disabled={loading}
                    className="touch-target"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                  className="flex items-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Use My Location</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Areas */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Or try a popular area type:</Label>
            <div className="grid grid-responsive-3 gap-2">
              {POPULAR_AREAS.map((area, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearchByName(area.name)}
                  className="flex items-center space-x-2 h-auto p-3"
                >
                  <area.icon className="w-4 h-4" />
                  <span className="text-xs">{area.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card className="mobile-card">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-4">
              <Label className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Define Area by Coordinates</span>
              </Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-lat" className="text-xs">Start Latitude</Label>
                  <Input
                    id="start-lat"
                    type="number"
                    step="0.0001"
                    value={coordinates.startLat}
                    onChange={(e) => setCoordinates({...coordinates, startLat: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-lng" className="text-xs">Start Longitude</Label>
                  <Input
                    id="start-lng"
                    type="number"
                    step="0.0001"
                    value={coordinates.startLng}
                    onChange={(e) => setCoordinates({...coordinates, startLng: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-lat" className="text-xs">End Latitude</Label>
                  <Input
                    id="end-lat"
                    type="number"
                    step="0.0001"
                    value={coordinates.endLat}
                    onChange={(e) => setCoordinates({...coordinates, endLat: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-lng" className="text-xs">End Longitude</Label>
                  <Input
                    id="end-lng"
                    type="number"
                    step="0.0001"
                    value={coordinates.endLng}
                    onChange={(e) => setCoordinates({...coordinates, endLng: e.target.value})}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSearchByCoordinates} 
                className="w-full touch-target"
              >
                Set Area
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
      )}

      {/* Selected Area Preview */}
      {selectedArea && (
        <Card className="mobile-card border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-medium text-sm">{selectedArea.name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedArea.size}
                  </Badge>
                  {selectedArea.center && (
                    <Badge variant="outline" className="text-xs">
                      {selectedArea.center.lat.toFixed(4)}, {selectedArea.center.lng.toFixed(4)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}