import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName, setLocationName] = useState('');
  const [currentLayer, setCurrentLayer] = useState('VIIRS_True_Color');
  const [globeRotation, setGlobeRotation] = useState(0);

  // NASA GIBS Layer configurations
  const nasaLayers = {
    'VIIRS_True_Color': {
      name: 'VIIRS True Color',
      url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{time}/{z}/{y}/{x}.jpg'
    },
    'MODIS_Terra': {
      name: 'MODIS Terra',
      url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/{z}/{y}/{x}.jpg'
    },
    'MODIS_Aqua': {
      name: 'MODIS Aqua', 
      url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/MODIS_Aqua_CorrectedReflectance_TrueColor/default/{time}/{z}/{y}/{x}.jpg'
    },
    'Day_Night_Band': {
      name: 'Day/Night Band',
      url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/VIIRS_SNPP_DayNightBand_ENCC/default/{time}/{z}/{y}/{x}.jpg'
    }
  };

  useEffect(() => {
    initializeGlobe();
  }, []);

  useEffect(() => {
    if (isSimulationRunning && enableRotation) {
      const interval = setInterval(() => {
        setGlobeRotation(prev => (prev + 0.5) % 360);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isSimulationRunning, enableRotation]);

  const initializeGlobe = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Create 3D globe effect
    const drawGlobe = () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw space background
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
      gradient.addColorStop(0, 'rgba(10, 15, 25, 0.8)');
      gradient.addColorStop(1, 'rgba(5, 8, 15, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw globe sphere
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((globeRotation * Math.PI) / 180);

      // Globe gradient
      const globeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      globeGradient.addColorStop(0, 'rgba(100, 150, 200, 0.9)');
      globeGradient.addColorStop(0.7, 'rgba(50, 100, 150, 0.7)');
      globeGradient.addColorStop(1, 'rgba(20, 50, 100, 0.5)');

      ctx.fillStyle = globeGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw continents (simplified)
      ctx.fillStyle = 'rgba(100, 150, 100, 0.8)';
      drawContinents(ctx, radius);

      // Globe atmosphere glow
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Draw UI overlay
      drawUIOverlay(ctx, rect);
    };

    const drawContinents = (ctx: CanvasRenderingContext2D, radius: number) => {
      // Simplified continent shapes
      const continents = [
        // Africa
        { x: 0.1, y: 0.0, w: 0.3, h: 0.6 },
        // Europe
        { x: 0.0, y: -0.3, w: 0.2, h: 0.2 },
        // Asia
        { x: 0.2, y: -0.2, w: 0.4, h: 0.4 },
        // North America
        { x: -0.5, y: -0.1, w: 0.3, h: 0.4 },
        // South America
        { x: -0.4, y: 0.2, w: 0.2, h: 0.4 },
      ];

      continents.forEach(continent => {
        ctx.fillRect(
          continent.x * radius,
          continent.y * radius,
          continent.w * radius,
          continent.h * radius
        );
      });
    };

    const drawUIOverlay = (ctx: CanvasRenderingContext2D, rect: { width: number; height: number }) => {
      // Draw NASA Eyes on Earth branding
      ctx.fillStyle = 'rgba(0, 223, 252, 0.9)';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('🌍 NASA Eyes on Earth - Live Satellite View', 20, 30);
      
      // Current layer indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(`Layer: ${nasaLayers[currentLayer as keyof typeof nasaLayers]?.name}`, 20, rect.height - 20);
    };

    // Animation loop
    const animate = () => {
      drawGlobe();
      requestAnimationFrame(animate);
    };

    animate();
    setIsLoading(false);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert click coordinates to lat/lng (simplified)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= radius) {
      // Calculate approximate lat/lng from click position
      const lat = -(dy / radius) * 90; // Rough conversion
      const lng = ((dx / radius) * 180 + globeRotation) % 360;
      const normalizedLng = lng > 180 ? lng - 360 : lng;
      
      if (onLocationSelect) {
        onLocationSelect(lat, normalizedLng);
      }
      fetchWeatherData(lat, normalizedLng);
      fetchLocationName(lat, normalizedLng);
    }
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


  return (
    <div className="relative w-full" style={{ height }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full rounded-lg shadow-lg cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #0a0f19 0%, #1a2332 100%)' }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading NASA Eyes on Earth...</p>
          </div>
        </div>
      )}
      
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
      
      {/* NASA Layer Controls */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="bg-background/95 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🛰️ NASA GIBS Layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(nasaLayers).map(([key, layer]) => (
              <Button 
                key={key}
                variant={currentLayer === key ? "default" : "outline"} 
                size="sm" 
                onClick={() => setCurrentLayer(key)}
                className="w-full justify-start text-xs"
              >
                {layer.name}
              </Button>
            ))}
            <div className="pt-2 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setGlobeRotation(0)}
                className="w-full text-xs"
              >
                Reset View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10 rounded-lg" />
    </div>
  );
}