import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NASAEarthMapProps {
  height?: string;
  enableRotation?: boolean;
  onRotationChange?: (isRotating: boolean) => void;
  isSimulationRunning?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
}

export function NASAEarthMap({
  height = '100vh',
  enableRotation = true,
  onRotationChange,
  isSimulationRunning = true,
  onLocationSelect
}: NASAEarthMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName, setLocationName] = useState('');

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;
    
    setIsLoading(true);
    
    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;
    
    try {
      // Initialize map with NASA Eyes on Earth style
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: 'globe' as any,
        zoom: 1.5,
        center: [0, 0],
        pitch: 0,
        bearing: 0,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add geolocate control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );

      // Add scale control
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

      // Add atmosphere and fog effects
      map.current.on('style.load', () => {
        // Add NASA GIBS satellite layers
        addNASALayers();
        
        // Set up atmosphere
        map.current?.setFog({
          color: 'rgb(10, 15, 20)',
          'high-color': 'rgb(50, 100, 150)',
          'horizon-blend': 0.1,
          'space-color': 'rgb(5, 10, 15)',
          'star-intensity': 0.8,
        });
        
        setIsLoading(false);
        setIsMapInitialized(true);
      });

      // Globe rotation for NASA Eyes on Earth experience
      if (enableRotation && isSimulationRunning) {
        setupGlobeRotation();
      }

      // Handle map clicks for location selection
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
        fetchWeatherData(lat, lng);
        fetchLocationName(lat, lng);
      });

      // Handle rotation change
      if (onRotationChange) {
        onRotationChange(enableRotation && isSimulationRunning);
      }

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setIsLoading(false);
    }
  };

  const addNASALayers = () => {
    if (!map.current) return;

    // NASA GIBS VIIRS True Color - Live Satellite Imagery
    map.current.addSource('nasa-viirs-true-color', {
      type: 'raster',
      tiles: [
        'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/{z}/{y}/{x}.jpg'
      ],
      tileSize: 256,
      attribution: '© NASA GIBS'
    });

    map.current.addLayer({
      id: 'nasa-viirs-layer',
      type: 'raster',
      source: 'nasa-viirs-true-color',
      paint: {
        'raster-opacity': 0.8
      }
    });

    // NASA GIBS MODIS Terra True Color
    map.current.addSource('nasa-modis-terra', {
      type: 'raster',
      tiles: [
        'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/{z}/{y}/{x}.jpg'
      ],
      tileSize: 256,
      attribution: '© NASA GIBS'
    });

    map.current.addLayer({
      id: 'nasa-modis-terra-layer',
      type: 'raster',
      source: 'nasa-modis-terra',
      paint: {
        'raster-opacity': 0.6
      }
    });

    // NASA GIBS Active Fires
    map.current.addSource('nasa-fires', {
      type: 'raster',
      tiles: [
        'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/VIIRS_SNPP_Fires_375m_Day/default/{time}/{z}/{y}/{x}.png'
      ],
      tileSize: 256,
      attribution: '© NASA GIBS'
    });

    map.current.addLayer({
      id: 'nasa-fires-layer',
      type: 'raster',
      source: 'nasa-fires',
      paint: {
        'raster-opacity': 0.9
      }
    });
  };

  const setupGlobeRotation = () => {
    if (!map.current) return;

    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    // Event listeners for interaction
    map.current.on('mousedown', () => {
      userInteracting = true;
    });
    
    map.current.on('dragstart', () => {
      userInteracting = true;
    });
    
    map.current.on('mouseup', () => {
      userInteracting = false;
      spinGlobe();
    });
    
    map.current.on('touchend', () => {
      userInteracting = false;
      spinGlobe();
    });

    map.current.on('moveend', () => {
      spinGlobe();
    });

    // Start the globe spinning
    spinGlobe();
  };

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,weather_code&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=1`
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    }
  };

  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setLocationName(data.display_name);
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Failed to fetch location name:', error);
      setLocationName(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (!isMapInitialized) {
    return (
      <div className="relative w-full" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center">NASA Eyes on Earth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your Mapbox public token to view live satellite imagery from NASA
              </p>
              <Input
                type="text"
                placeholder="Enter Mapbox Public Token"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your token from{' '}
                <a
                  href="https://mapbox.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>{' '}
                in the Tokens section
              </p>
              <Button 
                onClick={initializeMap}
                disabled={!mapboxToken || isLoading}
                className="w-full"
              >
                {isLoading ? 'Loading NASA Earth...' : 'Launch NASA Earth View'}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
      
      {/* Weather Data Overlay */}
      {weatherData && (
        <div className="absolute top-4 left-4 z-10">
          <Card className="w-80 bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Real-Time Weather
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {locationName || 'Unknown Location'}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Temperature</div>
                  <div className="text-lg font-semibold">
                    {weatherData.current?.temperature_2m || '--'}°C
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Humidity</div>
                  <div className="text-lg font-semibold">
                    {weatherData.current?.relative_humidity_2m || '--'}%
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Wind Speed</div>
                  <div className="text-lg font-semibold">
                    {weatherData.current?.wind_speed_10m || '--'} km/h
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Pressure</div>
                  <div className="text-lg font-semibold">
                    {weatherData.current?.pressure_msl || '--'} hPa
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Layer Controls */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="bg-background/95 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">NASA Satellite Layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (map.current?.getLayer('nasa-viirs-layer')) {
                  const visibility = map.current.getLayoutProperty('nasa-viirs-layer', 'visibility');
                  map.current.setLayoutProperty(
                    'nasa-viirs-layer', 
                    'visibility', 
                    visibility === 'visible' ? 'none' : 'visible'
                  );
                }
              }}
            >
              Toggle VIIRS
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (map.current?.getLayer('nasa-modis-terra-layer')) {
                  const visibility = map.current.getLayoutProperty('nasa-modis-terra-layer', 'visibility');
                  map.current.setLayoutProperty(
                    'nasa-modis-terra-layer', 
                    'visibility', 
                    visibility === 'visible' ? 'none' : 'visible'
                  );
                }
              }}
            >
              Toggle MODIS
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (map.current?.getLayer('nasa-fires-layer')) {
                  const visibility = map.current.getLayoutProperty('nasa-fires-layer', 'visibility');
                  map.current.setLayoutProperty(
                    'nasa-fires-layer', 
                    'visibility', 
                    visibility === 'visible' ? 'none' : 'visible'
                  );
                }
              }}
            >
              Toggle Fires
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-lg" />
    </div>
  );
}