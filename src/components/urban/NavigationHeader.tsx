import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Menu, Home, BarChart3, Map, Bot, Info, Box, Lightbulb, Edit3, MapPin, Navigation, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentLocation, searchLocationByName, parseCoordinates, LocationResult } from '@/services/geolocation-service';
import lupusLogo from '@/assets/lupus-cortex-logo.png';

interface NavigationHeaderProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  currentLocation?: { latitude: number; longitude: number };
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'City health overview' },
  { id: 'map', label: 'Interactive Map', icon: Map, description: 'Location selection & analysis' },
  { id: 'charts', label: 'Data Visualization', icon: BarChart3, description: 'Trends & insights' },
  { id: 'chatbot', label: 'AI Assistant', icon: Bot, description: 'Smart urban guidance' },
  { id: 'simulation', label: '3D Simulation', icon: Box, description: 'Urban planning & design' },
  { id: 'usecases', label: 'Use Cases', icon: Lightbulb, description: 'Recommendations & reports' },
];

export function NavigationHeader({ 
  currentSection, 
  onSectionChange, 
  currentLocation,
  onLocationChange
}: NavigationHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  const handleLocationEdit = () => {
    setIsEditingLocation(true);
    setSearchQuery(currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : '');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleLocationCancel = () => {
    setIsEditingLocation(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLocationSave = async () => {
    if (!searchQuery.trim()) return;
    
    const coordinates = parseCoordinates(searchQuery);
    if (coordinates && onLocationChange) {
      onLocationChange(coordinates);
      setIsEditingLocation(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const coordinates = parseCoordinates(query);
      if (coordinates) {
        setSearchResults([{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          displayName: `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`,
          city: 'Custom Coordinates',
          country: 'Manual Entry'
        } as LocationResult]);
      } else {
        const results = await searchLocationByName(query);
        setSearchResults(results.slice(0, 5));
      }
    } catch (error) {
      console.error('Location search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    if (onLocationChange) {
      onLocationChange({
        latitude: location.latitude,
        longitude: location.longitude
      });
    }
    setIsEditingLocation(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (onLocationChange) {
        onLocationChange({
          latitude: location.latitude,
          longitude: location.longitude
        });
      }
      setIsEditingLocation(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLocationSave();
    } else if (e.key === 'Escape') {
      handleLocationCancel();
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && searchQuery !== `${currentLocation?.latitude.toFixed(4)}, ${currentLocation?.longitude.toFixed(4)}`) {
        handleLocationSearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b-2 border-primary/20 bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-md shadow-xl"
    >
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center w-full">
          {/* Logo Section - Left */}
          <div className="flex items-center flex-1">
            <button 
              onClick={() => handleNavClick('dashboard')}
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <img 
                src={lupusLogo} 
                alt="Lupus Cortex" 
                className="h-12 sm:h-14 lg:h-16 w-auto object-contain flex-shrink-0"
              />
            </button>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "flex items-center gap-1 px-2 lg:px-3 py-1 rounded-lg text-xs lg:text-sm font-medium transition-all duration-300 border min-h-[44px]",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105" 
                        : "text-foreground hover:text-primary hover:bg-primary/5 border-transparent hover:border-primary/20 hover:shadow-md"
                    )}
                  >
                    <Icon className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
              );
            })}
          </nav>

          {/* Location Badge Section - Right */}
          <div className="hidden lg:flex items-center justify-end flex-1">
            <div className="flex items-center relative">
              {currentLocation && (
                <div className="relative">
                  {!isEditingLocation ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLocationEdit}
                      className="h-auto p-0 hover:bg-transparent group"
                    >
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 transition-colors text-xs cursor-pointer">
                        <MapPin className="w-2 h-2 mr-1" />
                        {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
                        <Edit3 className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Badge>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <Input
                          ref={inputRef}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="City name or lat, lng"
                          className="w-48 h-8 text-xs"
                        />
                        {searchResults.length > 0 && (
                          <Card className="absolute top-full left-0 w-full mt-1 z-50 max-h-48 overflow-auto">
                            {searchResults.map((result, index) => (
                              <button
                                key={index}
                                onClick={() => handleLocationSelect(result)}
                                className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-xs border-b last:border-b-0 transition-colors"
                              >
                                <div className="font-medium">{result.city || 'Unknown'}</div>
                                <div className="text-muted-foreground truncate">{result.displayName}</div>
                                <div className="text-muted-foreground">{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</div>
                              </button>
                            ))}
                          </Card>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        className="h-8 w-8 p-0"
                        title="Use current location"
                      >
                        <Navigation className={cn("w-3 h-3", isGettingLocation && "animate-spin")} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleLocationSave}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        title="Save location"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleLocationCancel}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side for tablet and mobile */}
          <div className="lg:hidden flex items-center gap-3 ml-auto">
            {/* Tablet Navigation - positioned at far right */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                
                return (
                   <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-lg transition-all duration-300 border min-h-[44px] min-w-[44px]",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                          : "text-foreground hover:text-primary hover:bg-primary/5 border-transparent hover:border-primary/20"
                      )}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                );
              })}
            </nav>

            {/* Mobile Menu - positioned at far right */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-foreground hover:text-primary min-h-[44px] min-w-[44px]">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-sm bg-background">
                  <div className="mt-6 space-y-3">
                    <div className="text-center pb-4 border-b border-border">
                      <img 
                        src={lupusLogo} 
                        alt="Lupus Cortex" 
                        className="h-8 w-auto mx-auto mb-2"
                      />
                      <p className="text-sm text-muted-foreground">Advanced Analytics Platform</p>
                      {currentLocation && (
                        <Button
                          variant="ghost"
                          size="sm"  
                          onClick={handleLocationEdit}
                          className="h-auto p-0 hover:bg-transparent group mt-2"
                        >
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 transition-colors text-xs cursor-pointer">
                            <MapPin className="w-2 h-2 mr-1" />
                            {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
                            <Edit3 className="w-3 h-3 ml-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        </Button>
                      )}
                    </div>
                    
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentSection === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-lg text-left transition-all duration-200 min-h-[60px]",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-base">{item.label}</div>
                            <div className="text-sm opacity-70">{item.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}