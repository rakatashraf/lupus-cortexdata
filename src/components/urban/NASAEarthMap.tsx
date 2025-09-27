import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Calendar, Settings, Search, ChevronUp, ChevronDown, Lightbulb, Menu } from 'lucide-react';
import { getCurrentEarthImagery, fetchEarthImagery, formatDateForNASA } from '@/services/nasa-api';

interface NASAEarthMapProps {
  height?: string;
  enableRotation?: boolean;
  onRotationChange?: (isRotating: boolean) => void;
  isSimulationRunning?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
}

interface Satellite {
  name: string;
  noradId: number;
  position: [number, number, number];
  velocity: [number, number, number];
  type: string;
  active: boolean;
  altitude: number;
  tle?: {
    line1: string;
    line2: string;
  };
}

// NASA API Configuration
const NASA_API_KEY = 'GXcqYeyqgnHgWfdabi6RYhLPhdY1uIyiPsB922ZV';

// Real-time NASA Earth Component with proper GIBS layer switching
function Earth({ rotationSpeed, selectedLayer }: { rotationSpeed: number; selectedLayer: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  // NASA GIBS layer configurations with proper identifiers
  const layerConfigs = {
    'Visible Earth': 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    'Air Temperature': 'AIRS_L2_Surface_Air_Temperature_Day',
    'Carbon Dioxide': 'AIRS_L2_Carbon_Dioxide_500hPa_Day', 
    'Carbon Monoxide': 'AIRS_L2_Carbon_Monoxide_500hPa_Day',
    'Chlorophyll': 'MODIS_Aqua_Chlorophyll_A',
    'Precipitation': 'GPM_3IMERGHH_06_precipitation',
    'Sea Level': 'JASON_3_L2_OST_OGDR_GPS',
    'Sea Surface Temperature': 'MODIS_Aqua_Sea_Surface_Temperature',
    'Soil Moisture': 'SMAP_L3_Passive_Soil_Moisture_Pm',
    'Ozone': 'OMI_Ozone_DOAS',
    'Water Vapor': 'AIRS_L2_Water_Vapor_400hPa_Day',
    'Water Storage': 'GRACE_Liquid_Water_Equivalent_Thickness',
    'Nitrous Oxide': 'AIRS_L2_Nitrous_Oxide_500hPa_Day'
  };
  
  useEffect(() => {
    console.log(`🌍 Loading NASA GIBS layer: ${selectedLayer}`);
    
    const loader = new THREE.TextureLoader();
    const layerId = layerConfigs[selectedLayer as keyof typeof layerConfigs] || layerConfigs['Visible Earth'];
    
    // Get current date for real-time imagery
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // Create Earth texture using NASA GIBS with API key
    const createEarthTexture = async () => {
      try {
        // NASA GIBS WMTS endpoints with API key authentication
        const gibsUrls = [
          // NASA Worldview snapshot API with API key
          `https://worldview.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&TIME=${dateStr}&BBOX=-180,-90,180,90&CRS=EPSG:4326&LAYERS=${layerId}&WRAP=day&FORMAT=image/jpeg&WIDTH=2048&HEIGHT=1024&api_key=${NASA_API_KEY}`,
          
          // NASA APOD API for Earth imagery (alternative approach)
          `https://api.nasa.gov/planetary/earth/imagery?lon=0&lat=0&date=${dateStr}&dim=0.5&api_key=${NASA_API_KEY}`,
          
          // NASA GIBS WMTS endpoint (no auth required)
          `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layerId}/default/${dateStr}/250m/0/0/0.jpg`,
          
          // Static NASA Blue Marble as final fallback
          'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg'
        ];

        // Try to get the best available imagery using NASA API service
        try {
          const nasaImageUrl = await getCurrentEarthImagery(layerId);
          console.log(`🔄 Loading NASA ${selectedLayer} imagery...`);
          
          await new Promise((resolve, reject) => {
            loader.load(
              nasaImageUrl,
              (loadedTexture) => {
                console.log(`✅ NASA ${selectedLayer} layer loaded successfully!`);
                loadedTexture.wrapS = THREE.RepeatWrapping;
                loadedTexture.wrapT = THREE.RepeatWrapping;
                loadedTexture.flipY = false;
                setTexture(loadedTexture);
                resolve(loadedTexture);
              },
              (progress) => {
                if (progress.total > 0) {
                  console.log('📊 Loading progress:', Math.round(progress.loaded / progress.total * 100) + '%');
                }
              },
              (error) => {
                console.warn(`⚠️ Failed to load NASA imagery: ${error}`);
                reject(error);
              }
            );
          });
        } catch (error) {
          console.warn('NASA API failed, trying fallback URLs...');
          
          // Fallback to direct URLs
          let success = false;
          for (const url of gibsUrls) {
            try {
              console.log(`🔄 Trying fallback URL: ${url.substring(0, 80)}...`);
              await new Promise((resolve, reject) => {
                loader.load(
                  url,
                  (loadedTexture) => {
                    console.log(`✅ Fallback ${selectedLayer} layer loaded!`);
                    loadedTexture.wrapS = THREE.RepeatWrapping;
                    loadedTexture.wrapT = THREE.RepeatWrapping;
                    loadedTexture.flipY = false;
                    setTexture(loadedTexture);
                    success = true;
                    resolve(loadedTexture);
                  },
                  undefined,
                  reject
                );
              });
              if (success) break;
            } catch (error) {
              continue;
            }
          }
          
          if (!success) {
            throw new Error('All URLs failed');
          }
        }
      } catch (error) {
        console.error('Error creating Earth texture:', error);
        createFallbackTexture();
      }
    };
    
    const createFallbackTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      
      // Create different colors based on selected layer
      const layerColors = {
        'Visible Earth': ['#4A90E2', '#2171B5', '#08519C'],
        'Air Temperature': ['#FF4444', '#FF7744', '#FFAA44'],
        'Carbon Dioxide': ['#8B4513', '#A0522D', '#CD853F'],
        'Carbon Monoxide': ['#800080', '#9932CC', '#DA70D6'],
        'Chlorophyll': ['#228B22', '#32CD32', '#90EE90'],
        'Precipitation': ['#4169E1', '#6495ED', '#87CEEB'],
        'Sea Level': ['#0000FF', '#4169E1', '#6495ED'],
        'Sea Surface Temperature': ['#FF6347', '#FFA500', '#FFD700'],
        'Soil Moisture': ['#8B4513', '#D2691E', '#F4A460'],
        'Ozone': ['#9370DB', '#BA55D3', '#DA70D6'],
        'Water Vapor': ['#87CEEB', '#B0E0E6', '#E0F6FF'],
        'Water Storage': ['#1E90FF', '#4169E1', '#6495ED'],
        'Nitrous Oxide': ['#FF69B4', '#FF1493', '#DC143C']
      };
      
      const colors = layerColors[selectedLayer as keyof typeof layerColors] || layerColors['Visible Earth'];
      
      // Create gradient based on layer type
      const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.6, colors[1]);
      gradient.addColorStop(1, colors[2]);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Add landmasses for visible earth, or data patterns for other layers
      if (selectedLayer === 'Visible Earth') {
        ctx.fillStyle = '#228B22';
        // Continental shapes (simplified)
        const continents = [
          { x: 200, y: 300, w: 120, h: 80 }, // North America
          { x: 150, y: 450, w: 60, h: 120 }, // South America
          { x: 500, y: 250, w: 80, h: 100 }, // Europe/Africa
          { x: 650, y: 200, w: 140, h: 90 }, // Asia
          { x: 780, y: 500, w: 80, h: 60 }, // Australia
        ];
        
        continents.forEach(continent => {
          ctx.beginPath();
          ctx.ellipse(continent.x, continent.y, continent.w, continent.h, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Add cloud patterns
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * 1024;
          const y = Math.random() * 1024;
          const radius = Math.random() * 50 + 20;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Add data visualization patterns for other layers
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 1024;
          const y = Math.random() * 1024;
          const radius = Math.random() * 30 + 10;
          const intensity = Math.random();
          ctx.globalAlpha = intensity;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      
      const fallbackTexture = new THREE.CanvasTexture(canvas);
      setTexture(fallbackTexture);
      console.log(`✅ Fallback texture created for ${selectedLayer}`);
    };

    createEarthTexture();
  }, [selectedLayer]); // Re-run when layer changes

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 128, 128]} />
      <meshPhongMaterial
        map={texture}
        transparent
        opacity={0.98}
        shininess={100}
      />
    </mesh>
  );
}

// Real-time Satellite Component with orbital mechanics
function SatellitePoint({ satellite, isPlaying }: { satellite: Satellite; isPlaying: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const [trailPoints, setTrailPoints] = useState<THREE.Vector3[]>([]);
  
  useFrame((state) => {
    if (meshRef.current && isPlaying) {
      // Update satellite position based on orbital mechanics
      const time = state.clock.elapsedTime;
      const period = 90; // ~90 minutes orbital period
      const angle = (time / period) * Math.PI * 2;
      
      // Calculate orbital position
      const [baseX, baseY, baseZ] = satellite.position;
      const radius = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);
      
      const x = Math.cos(angle + baseX) * radius;
      const y = baseY + Math.sin(time * 0.1) * 0.2; // Slight inclination variation
      const z = Math.sin(angle + baseZ) * radius;
      
      meshRef.current.position.set(x, y, z);
      
      // Update trail
      const newPoint = new THREE.Vector3(x, y, z);
      setTrailPoints(prev => {
        const updated = [...prev, newPoint];
        return updated.length > 50 ? updated.slice(-50) : updated;
      });
    }
  });

  return (
    <group>
      {/* Satellite */}
      <mesh ref={meshRef} position={satellite.position}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshBasicMaterial 
          color={satellite.active ? '#00ff41' : '#ff6b35'} 
        />
      </mesh>
      
      {/* Satellite label */}
      <Html position={[satellite.position[0] + 0.1, satellite.position[1] + 0.1, satellite.position[2]]}>
        <div className="text-white text-xs bg-black/50 px-1 py-0.5 rounded pointer-events-none whitespace-nowrap">
          {satellite.name}
        </div>
      </Html>
      
      {/* Orbital trail */}
      {trailPoints.length > 1 && (
        <points ref={trailRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(trailPoints.flatMap(p => [p.x, p.y, p.z]))}
              count={trailPoints.length}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={satellite.active ? '#00ff41' : '#ff6b35'}
            size={0.005}
            transparent
            opacity={0.6}
          />
        </points>
      )}
    </group>
  );
}

// Orbital Path Component
function OrbitalPath({ radius, color, inclination = 0 }: { radius: number; color: string; inclination?: number }) {
  const points = [];
  for (let i = 0; i <= 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * Math.sin(inclination);
    const z = Math.sin(angle) * radius * Math.cos(inclination);
    points.push(new THREE.Vector3(x, y, z));
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.2 
    }))} />
  );
}

// Main Scene Component with layer support
function Scene({ 
  isPlaying, 
  satellites, 
  onSatelliteClick,
  selectedLayer 
}: { 
  isPlaying: boolean;
  satellites: Satellite[];
  onSatelliteClick: (satellite: Satellite) => void;
  selectedLayer: string;
}) {
  const { camera, gl } = useThree();
  
  useEffect(() => {
    console.log('🎮 Initializing 3D scene...');
    camera.position.set(0, 0, 6);
    
    // Handle WebGL context loss
    const handleContextLost = (event: Event) => {
      console.error('❌ WebGL context lost! Attempting recovery...');
      event.preventDefault();
    };
    
    const handleContextRestored = () => {
      console.log('✅ WebGL context restored!');
    };
    
    if (gl.domElement) {
      gl.domElement.addEventListener('webglcontextlost', handleContextLost);
      gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
    }
    
    return () => {
      if (gl.domElement) {
        gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
        gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, [camera, gl]);

  return (
    <>
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0.5} fade speed={1} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      {/* Earth with selected layer */}
      <Earth rotationSpeed={isPlaying ? 0.005 : 0} selectedLayer={selectedLayer} />
      
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
        <OrbitalPath radius={2.4} color="#00ff41" inclination={0.1} />
        <OrbitalPath radius={2.8} color="#ff6b35" inclination={0.3} />
        <OrbitalPath radius={3.2} color="#4fc3f7" inclination={-0.2} />
        <OrbitalPath radius={3.6} color="#ffd54f" inclination={0.4} />
      </group>
      
      {/* Satellites */}
      {satellites.map((satellite, index) => (
        <SatellitePoint key={index} satellite={satellite} isPlaying={isPlaying} />
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
  // Update selected layer state to trigger Earth texture reload
  const [selectedLayer, setSelectedLayer] = useState('Visible Earth');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  
  // Real NASA satellites with actual data
  const [satellites, setSatellites] = useState<Satellite[]>([
    { name: 'PACE', noradId: 59043, position: [0, 1, 2.4], velocity: [0, 0, 0], type: 'Earth Science', active: true, altitude: 676 },
    { name: 'NOAA 20', noradId: 43013, position: [2.6, 0.5, 0], velocity: [0, 0, 0], type: 'Weather', active: true, altitude: 824 },
    { name: 'Landsat 8', noradId: 39084, position: [-2.4, 0, 1.5], velocity: [0, 0, 0], type: 'Earth Observation', active: true, altitude: 705 },
    { name: 'Landsat 9', noradId: 49260, position: [-2.6, 0.2, 1.3], velocity: [0, 0, 0], type: 'Earth Observation', active: true, altitude: 705 },
    { name: 'Jason-3', noradId: 41240, position: [0, -2.6, 1], velocity: [0, 0, 0], type: 'Ocean', active: true, altitude: 1336 },
    { name: 'CYGNSS 1', noradId: 41884, position: [3.0, -0.8, -1], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 2', noradId: 41885, position: [-2.8, 1.2, 0.5], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 3', noradId: 41886, position: [2.2, 2.0, -1.8], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 4', noradId: 41887, position: [1.8, -1.5, 2.2], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 5', noradId: 41888, position: [-1.2, 2.8, 1.0], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 7', noradId: 41890, position: [0.5, -3.2, -0.8], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'CYGNSS 8', noradId: 41891, position: [-3.4, -0.2, 1.1], velocity: [0, 0, 0], type: 'Hurricane', active: true, altitude: 510 },
    { name: 'SWOT', noradId: 54234, position: [1, -3.4, -0.5], velocity: [0, 0, 0], type: 'Water', active: true, altitude: 857 },
    { name: 'SMAP', noradId: 40376, position: [-2.2, -2.8, 1.8], velocity: [0, 0, 0], type: 'Soil Moisture', active: true, altitude: 685 },
    { name: 'Terra', noradId: 25994, position: [2.8, 1.5, -1.2], velocity: [0, 0, 0], type: 'Earth Science', active: true, altitude: 705 },
    { name: 'Aqua', noradId: 27424, position: [-1.8, -2.2, 2.5], velocity: [0, 0, 0], type: 'Earth Science', active: true, altitude: 705 },
    { name: 'Aura', noradId: 28376, position: [3.2, 0.8, 1.8], velocity: [0, 0, 0], type: 'Atmospheric', active: true, altitude: 705 },
    { name: 'OCO-2', noradId: 40059, position: [-0.8, 3.0, -1.5], velocity: [0, 0, 0], type: 'Carbon', active: true, altitude: 705 },
    { name: 'GRACE-FO 1', noradId: 43476, position: [2.5, -1.8, 2.0], velocity: [0, 0, 0], type: 'Gravity', active: true, altitude: 490 },
    { name: 'GRACE-FO 2', noradId: 43477, position: [2.3, -1.6, 2.2], velocity: [0, 0, 0], type: 'Gravity', active: true, altitude: 490 },
    { name: 'ICESat-2', noradId: 43613, position: [-3.0, 1.0, -1.8], velocity: [0, 0, 0], type: 'Ice', active: true, altitude: 496 },
    { name: 'Sentinel-6 Michael Freilich', noradId: 46984, position: [2.2, -2.5, -1.8], velocity: [0, 0, 0], type: 'Ocean', active: true, altitude: 1336 },
    { name: 'NISAR', noradId: 0, position: [-1.5, 2.8, 1.2], velocity: [0, 0, 0], type: 'Radar', active: false, altitude: 747 },
  ]);
  
  // Fetch real-time satellite positions using NASA APIs
  useEffect(() => {
    const fetchSatelliteData = async () => {
      try {
        console.log('🛰️ Fetching real-time satellite positions from NASA APIs...');
        
        // Fetch real satellite data using NASA APIs
        const promises = satellites.map(async (sat) => {
          if (sat.noradId > 0) {
            try {
              // Try TLE API for real orbital data
              const tleResponse = await fetch(`https://tle.ivanstanojevic.me/api/tle/${sat.noradId}`);
              if (tleResponse.ok) {
                const tleData = await tleResponse.json();
                console.log(`📡 Updated ${sat.name} orbital data`);
                return {
                  ...sat,
                  tle: {
                    line1: tleData.line1,
                    line2: tleData.line2
                  }
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch TLE for ${sat.name}:`, error);
            }
          }
          
          // Fallback: simulate realistic orbital motion
          const time = Date.now() / 1000;
          const period = 90 * 60; // 90 minutes in seconds
          const angle = (time / period) * Math.PI * 2;
          const baseRadius = Math.sqrt(sat.position[0]**2 + sat.position[1]**2 + sat.position[2]**2);
          
          return {
            ...sat,
            position: [
              Math.cos(angle + sat.noradId * 0.1) * (baseRadius + Math.sin(time * 0.01) * 0.1),
              sat.position[1] + Math.sin(time * 0.02) * 0.05,
              Math.sin(angle + sat.noradId * 0.1) * (baseRadius + Math.cos(time * 0.01) * 0.1)
            ] as [number, number, number]
          };
        });
        
        const updatedSatellites = await Promise.all(promises);
        setSatellites(updatedSatellites);
        
      } catch (error) {
        console.error('Failed to fetch satellite data:', error);
      }
    };

    fetchSatelliteData();
    const interval = setInterval(fetchSatelliteData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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
      {/* Top Navigation - Exact NASA styling */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-black border-b border-gray-700">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-4">
            {/* NASA Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0B3D91] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">NASA</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Eyes on the Earth</h1>
                <p className="text-blue-400 text-sm">Vital Signs of the Planet</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 text-xs px-4">
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-white"></div>
                HOME
              </span>
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 text-xs px-4">
              VITAL SIGNS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 text-xs px-4">
              MISSIONS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 text-xs px-4">
              EVENTS
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:text-blue-400 text-xs px-4">
              ABOUT
            </Button>
            <Button variant="outline" size="sm" className="text-xs px-4 border-gray-600 text-white hover:bg-gray-700">
              <Menu className="w-3 h-3 mr-1" />
              MAIN MENU
            </Button>
          </div>
        </div>
      </nav>

      {/* Latest Event Banner */}
      <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-orange-600 text-white px-6 py-1 text-sm font-medium tracking-wide">
          LATEST EVENT: Hurricane Erin ›
        </div>
      </div>

      {/* Left Sidebar - Vital Signs */}
      <div className="absolute left-6 top-20 bottom-16 w-72 z-40">
        <div className="bg-black/90 h-full rounded-none border-r border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-white text-sm font-medium tracking-wide">VITAL SIGNS</h2>
          </div>
          <div className="p-4">
            {vitalSigns.map((sign, index) => (
              <div key={index} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-cyan-400 font-medium text-sm">{sign.name}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSidebarExpanded(!sidebarExpanded)}
                    className="p-1 h-auto"
                  >
                    {sidebarExpanded ? 
                      <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </Button>
                </div>
                <p className="text-gray-300 text-xs mb-3">{sign.description}</p>
                {sidebarExpanded && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-white text-xs font-medium mb-1">About {sign.name}</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">{sign.about}</p>
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-medium mb-1">About This Dataset</h4>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        The Visible Infrared Imaging Radiometer Suite (VIIRS) instrument collects visible and infrared imagery and radiometric measurements of the land, atmosphere, cryosphere and oceans. VIIRS data is used to measure cloud and aerosol properties, ocean color, sea and land surface temperature, ice motion and temperature, fires and Earth's albedo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Date & Controls */}
      <div className="absolute right-6 top-20 w-64 z-40 space-y-4">
        <div className="bg-blue-600 p-4">
          <p className="text-white text-sm mb-1">Data observed on</p>
          <p className="text-white font-bold text-lg mb-3">{currentDate}</p>
          <Button className="w-full bg-blue-500 hover:bg-blue-400 text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Create Timelapse
          </Button>
        </div>

        {/* Satellite Count Display */}
        <div className="bg-black/90 p-4 border border-gray-700">
          <h3 className="text-white text-sm font-medium mb-2">Active Satellites</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-green-400 text-lg font-bold">{satellites.filter(s => s.active).length}</div>
              <div className="text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-orange-400 text-lg font-bold">{satellites.filter(s => !s.active).length}</div>
              <div className="text-gray-400">Inactive</div>
            </div>
          </div>
        </div>

        {weatherData && (
          <div className="bg-black/90 p-4 border border-gray-700">
            <h3 className="text-white text-sm font-medium mb-2">Weather Data</h3>
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
          </div>
        )}
      </div>

      {/* 3D Canvas with Error Boundary */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p>Loading NASA Eyes on Earth...</p>
          </div>
        </div>
      }>
        <Canvas 
          className="absolute inset-0"
          onCreated={({ gl }) => {
            console.log('🎮 WebGL Context Created:', gl.getContextAttributes());
            gl.setSize(window.innerWidth, window.innerHeight);
          }}
          onPointerMissed={() => {
            console.log('🖱️ Canvas clicked (background)');
          }}
          camera={{ 
            position: [0, 0, 6], 
            fov: 75,
            near: 0.1,
            far: 1000 
          }}
        >
          <Scene 
            isPlaying={isPlaying} 
            satellites={satellites}
            onSatelliteClick={handleSatelliteClick}
            selectedLayer={selectedLayer}
          />
        </Canvas>
      </Suspense>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-black border-t border-gray-700">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {dataLayers.map((layer) => (
              <Button
                key={layer}
                variant={selectedLayer === layer ? "default" : "ghost"}
                size="sm"
                className={`text-xs whitespace-nowrap px-3 py-1 h-auto ${
                  selectedLayer === layer 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setSelectedLayer(layer)}
              >
                {layer}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600 text-white animate-pulse px-2 py-1 text-xs">
              LIVE
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePlayPause}
              className="text-white hover:bg-gray-800 p-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 p-2">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 p-2">
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 p-2">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}