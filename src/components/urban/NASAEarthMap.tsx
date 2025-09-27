import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, Calendar, Settings, Globe, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface NASAEarthMapProps {
  height?: string;
  enableRotation?: boolean;
  onRotationChange?: (isRotating: boolean) => void;
  isSimulationRunning?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
}

interface Satellite {
  name: string;
  position: [number, number, number];
  type: string;
  active: boolean;
}

// Earth Component with NASA GIBS texture
function Earth({ rotationSpeed }: { rotationSpeed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    // Load NASA GIBS Earth texture
    const loader = new THREE.TextureLoader();
    loader.load(
      'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/1.0.0/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2024-09-27/GoogleMapsCompatible_Level9/4/4/4.jpg',
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      () => {
        // Fallback to a blue sphere if texture fails
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#4FC3F7';
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.fillStyle = '#2E7D32';
        // Draw simple continents
        ctx.fillRect(50, 80, 60, 40); // North America
        ctx.fillRect(120, 90, 50, 70); // Europe/Africa
        ctx.fillRect(180, 100, 40, 30); // Asia
        
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        setTexture(fallbackTexture);
      }
    );
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshPhongMaterial
        map={texture}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

// Satellite Component
function SatellitePoint({ satellite }: { satellite: Satellite }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      // Simple orbital animation
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={satellite.position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color={satellite.active ? '#00ff00' : '#ff9800'} />
      </mesh>
      <Text
        position={[0.1, 0.1, 0]}
        fontSize={0.08}
        color="white"
        anchorX="left"
        anchorY="middle"
      >
        {satellite.name}
      </Text>
    </group>
  );
}

// Orbital Path Component
function OrbitalPath({ radius, color }: { radius: number; color: string }) {
  const points = [];
  for (let i = 0; i <= 360; i += 5) {
    const angle = (i * Math.PI) / 180;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }))} />
  );
}

// Main Scene Component
function Scene({ 
  isPlaying, 
  satellites, 
  onSatelliteClick 
}: { 
  isPlaying: boolean;
  satellites: Satellite[];
  onSatelliteClick: (satellite: Satellite) => void;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 6);
  }, [camera]);

  return (
    <>
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0.5} fade speed={1} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      {/* Earth */}
      <Earth rotationSpeed={isPlaying ? 0.005 : 0} />
      
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.1, 32, 32]} />
        <meshBasicMaterial 
          color="#4FC3F7" 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Orbital paths */}
      <group>
        <OrbitalPath radius={2.5} color="#00ff00" />
        <OrbitalPath radius={3.0} color="#ff9800" />
        <OrbitalPath radius={3.5} color="#2196F3" />
      </group>
      
      {/* Satellites */}
      {satellites.map((satellite, index) => (
        <SatellitePoint key={index} satellite={satellite} />
      ))}
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
      />
    </>
  );
}

export function NASAEarthMap({
  height = '100vh',
  enableRotation = true,
  onRotationChange,
  isSimulationRunning = true,
  onLocationSelect
}: NASAEarthMapProps) {
  const [isPlaying, setIsPlaying] = useState(isSimulationRunning);
  const [currentDate] = useState(new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }));
  const [selectedLayer, setSelectedLayer] = useState('Visible Earth');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  
  // NASA satellites data
  const [satellites] = useState<Satellite[]>([
    { name: 'PACE', position: [0, 1, 2.5], type: 'Earth Science', active: true },
    { name: 'NOAA 20', position: [2.8, 0.5, 0], type: 'Weather', active: true },
    { name: 'Landsat 8', position: [-2.5, 0, 1.5], type: 'Earth Observation', active: true },
    { name: 'Jason-3', position: [0, -2.8, 1], type: 'Ocean', active: true },
    { name: 'CYGNSS 8', position: [3.2, -0.8, -1], type: 'Hurricane', active: true },
    { name: 'CYGNSS 5', position: [-3.0, 1.2, 0.5], type: 'Hurricane', active: true },
    { name: 'SWOT', position: [1, -3.5, -0.5], type: 'Water', active: true },
    { name: 'NISAR', position: [-1.5, 2.8, 1.2], type: 'Radar', active: false },
    { name: 'Sentinel-6 Michael Freilich', position: [2.2, -2.0, -1.8], type: 'Ocean', active: true },
  ]);

  const dataLayers = [
    'Satellites Now',
    'Visible Earth', 
    'Air Temperature',
    'Carbon Dioxide',
    'Carbon Monoxide',
    'Chlorophyll',
    'Precipitation',
    'Sea Level',
    'Sea Surface Temperature',
    'Soil Moisture',
    'Ozone',
    'Water Vapor',
    'Water Storage',
    'Nitrous Oxide'
  ];

  const vitalSigns = [
    {
      name: 'Visible Earth',
      description: 'NOAA-20 / VIIRS Daily Mosaics',
      about: 'This is a composite image of how the entire Earth appeared from space yesterday.',
      expanded: true
    }
  ];

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    onRotationChange?.(!isPlaying);
  }, [isPlaying, onRotationChange]);

  const handleSatelliteClick = useCallback((satellite: Satellite) => {
    console.log('Satellite clicked:', satellite.name);
  }, []);

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl&hourly=temperature_2m,precipitation&forecast_days=1`
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    }
  };

  return (
    <div className="relative w-full bg-black" style={{ height }}>
      {/* Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/20">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div>
                <h1 className="text-white font-bold">Eyes on the Earth</h1>
                <p className="text-gray-400 text-xs">Vital Signs of the Planet</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
              HOME
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
              VITAL SIGNS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
              MISSIONS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
              EVENTS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
              ABOUT
            </Button>
            <Button variant="outline" size="sm">
              MAIN MENU
            </Button>
          </div>
        </div>
      </nav>

      {/* Latest Event Banner */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-orange-600/90 text-white px-4 py-2 rounded-md text-sm">
          LATEST EVENT: Hurricane Erin ›
        </div>
      </div>

      {/* Left Sidebar - Vital Signs */}
      <div className="absolute left-4 top-24 bottom-4 w-80 z-40">
        <Card className="bg-black/80 backdrop-blur-sm border-white/20 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium">VITAL SIGNS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vitalSigns.map((sign, index) => (
              <div key={index} className="border border-white/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-cyan-400 font-medium">{sign.name}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  >
                    {sidebarExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-gray-300 text-xs mb-2">{sign.description}</p>
                {sidebarExpanded && (
                  <>
                    <h4 className="text-white text-xs font-medium mb-1">About {sign.name}</h4>
                    <p className="text-gray-400 text-xs mb-3">{sign.about}</p>
                    <h4 className="text-white text-xs font-medium mb-1">About This Dataset</h4>
                    <p className="text-gray-400 text-xs">
                      The Visible Infrared Imaging Radiometer Suite (VIIRS) instrument collects visible and infrared imagery and radiometric measurements of the land, atmosphere, cryosphere and oceans.
                    </p>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar - Date & Controls */}
      <div className="absolute right-4 top-24 w-64 z-40 space-y-4">
        <Card className="bg-blue-600/90 backdrop-blur-sm border-white/20">
          <CardContent className="p-4">
            <p className="text-white text-sm mb-2">Data observed on</p>
            <p className="text-white font-bold text-lg mb-3">{currentDate}</p>
            <Button className="w-full bg-blue-500 hover:bg-blue-400">
              <Calendar className="w-4 h-4 mr-2" />
              Create Timelapse
            </Button>
          </CardContent>
        </Card>

        {weatherData && (
          <Card className="bg-black/80 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Weather Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Temp:</span>
                  <span className="text-white ml-1">{weatherData.current?.temperature_2m || '--'}°C</span>
                </div>
                <div>
                  <span className="text-gray-400">Humidity:</span>
                  <span className="text-white ml-1">{weatherData.current?.relative_humidity_2m || '--'}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3D Canvas */}
      <Canvas className="absolute inset-0">
        <Scene 
          isPlaying={isPlaying} 
          satellites={satellites}
          onSatelliteClick={handleSatelliteClick}
        />
      </Canvas>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm border-t border-white/20">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {dataLayers.map((layer) => (
              <Button
                key={layer}
                variant={selectedLayer === layer ? "default" : "ghost"}
                size="sm"
                className={`text-xs whitespace-nowrap ${
                  selectedLayer === layer 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => setSelectedLayer(layer)}
              >
                {layer}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="destructive" className="animate-pulse">
              LIVE
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePlayPause}
              className="text-white"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}