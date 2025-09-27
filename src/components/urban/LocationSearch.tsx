import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Navigation, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getCurrentLocation, 
  searchLocationByName, 
  parseCoordinates, 
  LocationResult 
} from '@/services/geolocation-service';

interface LocationSearchProps {
  onLocationSelect: (lat: number, lng: number, locationInfo?: LocationResult) => void;
  placeholder?: string;
  className?: string;
  showCurrentLocationButton?: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = "🔍 Search by location name or coordinates (e.g., 'New York' or '40.7589,-73.9851')",
  className = "",
  showCurrentLocationButton = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  // Handle search input
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);
    
    try {
      console.log(`🔍 Searching for: ${searchQuery}`);

      // First try to parse as coordinates
      const coords = parseCoordinates(searchQuery);
      if (coords) {
        console.log(`📍 Parsed coordinates: ${coords.latitude}, ${coords.longitude}`);
        
        // Validate and use coordinates directly
        onLocationSelect(coords.latitude, coords.longitude, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          displayName: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
        });
        
        setSearchQuery('');
        setShowResults(false);
        
        toast({
          title: "Location Found",
          description: `Using coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        });
        
        return;
      }

      // If not coordinates, search by name
      const results = await searchLocationByName(searchQuery);
      
      if (results.length > 0) {
        setSearchResults(results);
        console.log(`🌍 Found ${results.length} locations for "${searchQuery}"`);
      } else {
        setSearchResults([]);
        toast({
          title: "No Results",
          description: `No locations found for "${searchQuery}". Try a different search term.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      toast({
        title: "Search Failed",
        description: "Unable to search for location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onLocationSelect, toast]);

  // Handle search result selection
  const handleResultSelect = useCallback((result: LocationResult) => {
    console.log(`🎯 Selected location: ${result.displayName}`);
    
    onLocationSelect(result.latitude, result.longitude, result);
    
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    
    toast({
      title: "Location Selected",
      description: result.displayName || `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
    });
  }, [onLocationSelect, toast]);

  // Get current location using GPS
  const handleGetCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    
    try {
      console.log('🛰️ Getting current location...');
      
      const location = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      });
      
      console.log(`📍 Current location: ${location.latitude}, ${location.longitude}`);
      
      onLocationSelect(location.latitude, location.longitude, location);
      
      toast({
        title: "Current Location Detected",
        description: location.displayName || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      });
      
    } catch (error) {
      console.error('Geolocation failed:', error);
      
      toast({
        title: "Location Access Failed",
        description: "Please enable location permissions or search manually.",
        variant: "destructive"
      });
    } finally {
      setIsGettingLocation(false);
    }
  }, [onLocationSelect, toast]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setSearchResults([]);
    }
  }, [handleSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input Row */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          variant="outline"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>

        {showCurrentLocationButton && (
          <Button
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            title="Use current location"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto border shadow-lg">
          <CardContent className="p-2">
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultSelect(result)}
                className="flex items-start gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {result.city || 'Unknown City'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {result.displayName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </Badge>
                    {result.country && (
                      <Badge variant="secondary" className="text-xs">
                        {result.country}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};