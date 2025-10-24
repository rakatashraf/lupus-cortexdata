import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Thermometer, Wind, Gauge, CloudRain, RefreshCw, X, Search } from 'lucide-react';
import { fetchWeatherData, WeatherData, getWeatherDescription, getWeatherIcon, getWindDirection } from '@/services/weather-service';
import { reverseGeocode } from '@/services/geolocation-service';

interface NASAEarthMapProps {
  height?: string;
  enableRotation?: boolean;
  onRotationChange?: (isRotating: boolean) => void;
  isSimulationRunning?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
}

interface SelectedLocation {
  latitude: number;
  longitude: number;
  placeName?: string;
  city?: string;
  country?: string;
}

export function NASAEarthMap({
  height = '100vh',
  onLocationSelect
}: NASAEarthMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  const nasaEyesUrl = 'https://eyes.nasa.gov/apps/earth/#/';

  const handleCoordinateSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    const coordPattern = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/;
    const match = searchQuery.match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        await handleLocationSelect(lat, lng);
      } else {
        alert('Invalid coordinates! Latitude must be between -90 and 90, Longitude between -180 and 180.');
      }
    } else {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
          { headers: { 'User-Agent': 'LupusCortex-UrbanIntelligence/1.0' } }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          await handleLocationSelect(lat, lng);
        } else {
          alert('Location not found! Try entering coordinates like: 40.7589, -73.9851');
        }
      } catch (error) {
        console.error('Geocoding failed:', error);
        alert('Failed to find location. Try entering coordinates like: 40.7589, -73.9851');
      }
    }
  }, [searchQuery]);

  const handleLocationSelect = useCallback(async (lat: number, lon: number) => {
    console.log(`🌍 Location selected: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
    
    setWeatherLoading(true);
    
    try {
      console.log('📍 Fetching place name...');
      const locationInfo = await reverseGeocode(lat, lon);
      
      console.log('🌤️ Fetching weather data...');
      const weather = await fetchWeatherData(lat, lon);
      
      setSelectedLocation({
        latitude: lat,
        longitude: lon,
        city: locationInfo.city || weather.location.city || 'Unknown',
        country: locationInfo.country || weather.location.country || 'Unknown',
        placeName: locationInfo.displayName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
      });
      
      setWeatherData(weather);
      console.log('✅ Location and weather data loaded successfully');
      
      if (onLocationSelect) {
        onLocationSelect(lat, lon);
      }
      
      setShowInstructions(false);
      
    } catch (error) {
      console.error('❌ Failed to fetch location/weather data:', error);
      alert('Failed to fetch weather data. Please try again.');
    } finally {
      setWeatherLoading(false);
    }
  }, [onLocationSelect]);

  return (
    <div style={{ height }} className="relative bg-black overflow-hidden">
      {showInstructions && (
        <Card className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 w-96 bg-blue-900/90 border-blue-600 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">🌍 How to Use</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(false)}
                className="text-white hover:bg-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. Use the search bar above to enter coordinates or location name</p>
            <p>2. Example: "40.7589, -73.9851" or "New York"</p>
            <p>3. Press Enter or click Search</p>
            <p>4. Weather data will appear on the right</p>
            <p className="text-blue-200 mt-3">💡 Explore NASA Eyes on Earth below!</p>
          </CardContent>
        </Card>
      )}

      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-black/80 border-gray-600">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCoordinateSearch()}
                  placeholder="🔍 Enter coordinates (e.g., 40.7589, -73.9851) or location name (e.g., New York)"
                  className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:outline-none"
                />
                <Button
                  onClick={handleCoordinateSearch}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <iframe
        ref={iframeRef}
        src={nasaEyesUrl}
        title="NASA Eyes on Earth"
        className="w-full h-full border-none"
        allow="geolocation; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        loading="eager"
      />

      {weatherData && selectedLocation && !weatherLoading && (
        <Card className="absolute top-20 right-4 w-80 bg-black/90 border-gray-600 text-white shadow-2xl z-10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span className="text-sm">{selectedLocation.city}, {selectedLocation.country}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedLocation(null);
                  setWeatherData(null);
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getWeatherIcon(weatherData.current.weatherCode)}</span>
                <div>
                  <div className="text-3xl font-bold">{weatherData.current.temperature}°C</div>
                  <div className="text-sm text-gray-300">{getWeatherDescription(weatherData.current.weatherCode)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Wind className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Wind Speed</span>
                </div>
                <div className="text-lg font-semibold">
                  {weatherData.current.windSpeed} km/h
                </div>
                <div className="text-xs text-gray-400">
                  {getWindDirection(weatherData.current.windDirection)}
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Pressure</span>
                </div>
                <div className="text-lg font-semibold">
                  {weatherData.current.pressure} hPa
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Humidity</span>
                </div>
                <div className="text-lg font-semibold">
                  {weatherData.current.humidity}%
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Precipitation</span>
                </div>
                <div className="text-lg font-semibold">
                  {weatherData.current.precipitation} mm
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Coordinates</div>
              <div className="font-mono text-sm">
                {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
              </div>
            </div>

            <Button
              onClick={() => handleLocationSelect(selectedLocation.latitude, selectedLocation.longitude)}
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-white hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}

      {weatherLoading && (
        <div className="absolute top-20 right-4 w-80 z-10">
          <Card className="bg-black/90 border-gray-600 text-white">
            <CardContent className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
              <span>Loading location & weather data...</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <div className="bg-black/70 border border-gray-600 rounded-lg p-3">
          <div className="text-white text-xs mb-2 font-semibold">Quick Locations:</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleLocationSelect(40.7128, -74.0060)} size="sm" variant="outline" className="text-xs border-gray-600 text-white hover:bg-gray-700">New York</Button>
            <Button onClick={() => handleLocationSelect(51.5074, -0.1278)} size="sm" variant="outline" className="text-xs border-gray-600 text-white hover:bg-gray-700">London</Button>
            <Button onClick={() => handleLocationSelect(35.6762, 139.6503)} size="sm" variant="outline" className="text-xs border-gray-600 text-white hover:bg-gray-700">Tokyo</Button>
            <Button onClick={() => handleLocationSelect(48.8566, 2.3522)} size="sm" variant="outline" className="text-xs border-gray-600 text-white hover:bg-gray-700">Paris</Button>
            <Button onClick={() => handleLocationSelect(-33.8688, 151.2093)} size="sm" variant="outline" className="text-xs border-gray-600 text-white hover:bg-gray-700">Sydney</Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-black/70 border-gray-600 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-white text-xs">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>NASA Eyes on Earth</span>
        </div>
      </div>
    </div>
  );
}
