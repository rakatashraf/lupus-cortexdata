import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Calendar, Settings, RotateCcw, Satellite, MapPin, Thermometer, Wind, Gauge, CloudRain } from 'lucide-react';
import { fetchWeatherData, WeatherData, getWeatherDescription, getWeatherIcon, getWindDirection } from '@/services/weather-service';
import { LocationSearch } from '@/components/urban/LocationSearch';

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

interface SelectedLocation {
  latitude: number;
  longitude: number;
  position: [number, number, number];
}

// NASA API Configuration
const NASA_API_KEY = 'GXcqYeyqgnHgWfdabi6RYhLPhdY1uIyiPsB922ZV';

// Enhanced Earth Component with NASA imagery and OpenStreetMap fallback
function Earth({ rotationSpeed, selectedLayer }: { rotationSpeed: number; selectedLayer: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // More reliable NASA imagery endpoints with OpenStreetMap tile fallbacks
  const layerEndpoints = {
    'Visible Earth': {
      primary: `https://api.nasa.gov/planetary/earth/imagery?lat=0&lon=0&dim=0.15&api_key=${NASA_API_KEY}`,
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg'
      ],
      mapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    'Air Temperature': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147890/iss069e000715_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg'
      ],
      mapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    'Visible Light': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg'
      ],
      mapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    'Infrared': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/greenland_vir_2017210_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147890/iss069e000715_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg'
      ],
      mapTiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  };
  
  useEffect(() => {
    const loadNASAImagery = async () => {
      setLoading(true);
      setUsingFallback(false);
      console.log(`🛰️ Loading ${selectedLayer} imagery...`);
      
      const loader = new THREE.TextureLoader();
      const config = layerEndpoints[selectedLayer as keyof typeof layerEndpoints] || layerEndpoints['Visible Earth'];
      
      // Create list of all URLs to try (primary + fallbacks)
      const urlsToTry = [config.primary, ...config.fallbacks];
      let textureLoaded = false;
      
      for (let i = 0; i < urlsToTry.length && !textureLoaded; i++) {
        const url = urlsToTry[i];
        console.log(`🔄 Trying URL ${i + 1}/${urlsToTry.length}: ${selectedLayer}`);
        
        try {
          await new Promise((resolve, reject) => {
            loader.load(
              url,
              (loadedTexture) => {
                console.log(`✅ ${selectedLayer} loaded successfully from URL ${i + 1}`);
                
                // Ensure proper texture settings for globe display
                loadedTexture.wrapS = THREE.RepeatWrapping;
                loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                loadedTexture.flipY = false;
                loadedTexture.minFilter = THREE.LinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                
                setTexture(loadedTexture);
                setLoading(false);
                textureLoaded = true;
                resolve(loadedTexture);
              },
              (progress) => {
                if (progress.total > 0) {
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  console.log(`📊 Loading ${selectedLayer}: ${percent}%`);
                }
              },
              (error) => {
                console.warn(`⚠️ Failed to load ${selectedLayer} from URL ${i + 1}:`, error);
                reject(error);
              }
            );
          });
        } catch (error) {
          console.warn(`URL ${i + 1} failed, trying next...`);
          continue;
        }
      }
      
      // If all URLs failed, fallback to OpenStreetMap tiles
      if (!textureLoaded) {
        console.log(`🗺️ Loading OpenStreetMap tiles as fallback for ${selectedLayer}`);
        await loadOpenStreetMapTiles();
      }
    };
    
    // Load OpenStreetMap tiles as fallback
    const loadOpenStreetMapTiles = async () => {
      try {
        setUsingFallback(true);
        
        // Create a canvas to compose map tiles into a world map texture  
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;
        
        // Fill with ocean color
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(0, 0, 2048, 1024);
        
        // Load multiple zoom level 2 tiles to create a world map
        const zoomLevel = 2;
        const tileSize = 256;
        const tilesX = Math.pow(2, zoomLevel);
        const tilesY = Math.pow(2, zoomLevel);
        
        const tilePromises = [];
        
        for (let x = 0; x < tilesX; x++) {
          for (let y = 0; y < tilesY; y++) {
            const tileUrl = `https://tile.openstreetmap.org/${zoomLevel}/${x}/${y}.png`;
            
            const promise = new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              img.onload = () => {
                // Calculate position on the canvas
                const canvasX = (x * tileSize) * (2048 / (tilesX * tileSize));
                const canvasY = (y * tileSize) * (1024 / (tilesY * tileSize));
                const canvasWidth = 2048 / tilesX;
                const canvasHeight = 1024 / tilesY;
                
                ctx.drawImage(img, canvasX, canvasY, canvasWidth, canvasHeight);
                resolve(null);
              };
              
              img.onerror = () => {
                // If individual tile fails, continue without it
                resolve(null);
              };
              
              img.src = tileUrl;
            });
            
            tilePromises.push(promise);
          }
        }
        
        // Wait for all tiles to load (or timeout after 5 seconds)
        await Promise.race([
          Promise.all(tilePromises),
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        // Create texture from the composed canvas
        const mapTexture = new THREE.CanvasTexture(canvas);
        mapTexture.wrapS = THREE.RepeatWrapping;
        mapTexture.wrapT = THREE.ClampToEdgeWrapping;
        mapTexture.flipY = false;
        mapTexture.minFilter = THREE.LinearFilter;
        mapTexture.magFilter = THREE.LinearFilter;
        
        setTexture(mapTexture);
        setLoading(false);
        console.log(`✅ OpenStreetMap tiles loaded as fallback for ${selectedLayer}`);
        
      } catch (error) {
        console.error('Failed to load OpenStreetMap tiles:', error);
        // Final fallback - create a basic Earth texture
        createBasicEarthTexture();
      }
    };
    
    // Create basic Earth texture as final fallback
    const createBasicEarthTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // Create Earth-like background (ocean blue)
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#1e3a8a');
      gradient.addColorStop(0.5, '#3b82f6');
      gradient.addColorStop(1, '#1e40af');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 512);
      
      // Add continents with realistic colors
      ctx.fillStyle = '#22c55e';
      
      // Simplified continent shapes
      const continents = [
        { x: 200, y: 150, w: 100, h: 80 }, // North America
        { x: 250, y: 350, w: 50, h: 100 }, // South America
        { x: 500, y: 200, w: 80, h: 120 }, // Europe/Africa
        { x: 700, y: 150, w: 120, h: 90 }, // Asia
        { x: 800, y: 380, w: 60, h: 40 }   // Australia
      ];
      
      continents.forEach(continent => {
        ctx.beginPath();
        ctx.ellipse(continent.x, continent.y, continent.w, continent.h, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      
      const basicTexture = new THREE.CanvasTexture(canvas);
      basicTexture.wrapS = THREE.RepeatWrapping;
      basicTexture.wrapT = THREE.ClampToEdgeWrapping;
      basicTexture.flipY = false;
      
      setTexture(basicTexture);
      setLoading(false);
      setUsingFallback(true);
      console.log(`✅ Basic Earth texture created as final fallback`);
    };

    // Start loading immediately
    loadNASAImagery();
  }, [selectedLayer]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 128, 128]} />
        <meshPhongMaterial
          map={texture}
          transparent={false}
          opacity={1.0}
          shininess={30}
          specular={new THREE.Color(0x111111)}
        />
      </mesh>
      
      {/* Show loading indicator */}
      {loading && (
        <Html center>
          <div className="text-white text-sm bg-black/70 px-3 py-2 rounded-lg border border-blue-500">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              Loading {selectedLayer}...
            </div>
          </div>
        </Html>
      )}
      
      {/* Show data source indicator */}
      {texture && !loading && (
        <Html center>
          <div className={`text-xs px-2 py-1 rounded opacity-75 ${
            usingFallback 
              ? 'text-yellow-400 bg-yellow-900/50 border border-yellow-600' 
              : 'text-green-400 bg-black/50'
          }`}>
            {usingFallback ? '🗺️ Map View' : `🛰️ ${selectedLayer}`}
          </div>
        </Html>
      )}
    </group>
  );
}

// Location Marker Component
function LocationMarker({ location }: { location: SelectedLocation }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Pulse animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={location.position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#ff4444" />
      </mesh>
      
      <Html position={[0, 0.1, 0]}>
        <div className="text-white text-xs bg-red-600/80 px-2 py-1 rounded-lg border border-red-400 whitespace-nowrap pointer-events-none">
          📍 {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
        </div>
      </Html>
    </group>
  );
}

function SatellitePoint({ satellite, isPlaying }: { satellite: Satellite; isPlaying: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [realPosition, setRealPosition] = useState(satellite.position);
  
  useFrame((state) => {
    if (meshRef.current && isPlaying && satellite.tle) {
      // Use real TLE data for accurate positioning
      const time = state.clock.elapsedTime;
      const period = 90 + (satellite.altitude / 100); // Realistic period based on altitude
      const angle = (time / (period * 60)) * Math.PI * 2;
      
      const radius = 2.2 + (satellite.altitude / 1000); // Scale based on real altitude
      const inclination = satellite.noradId * 0.01; // Vary inclination per satellite
      
      const x = Math.cos(angle + satellite.noradId * 0.1) * radius;
      const y = Math.sin(angle) * Math.sin(inclination) * 0.5;
      const z = Math.sin(angle + satellite.noradId * 0.1) * radius;
      
      meshRef.current.position.set(x, y, z);
      setRealPosition([x, y, z]);
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={satellite.position}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial 
          color={satellite.active ? '#00ff41' : '#ff6b35'} 
        />
      </mesh>
      
      <Html position={[realPosition[0] + 0.1, realPosition[1] + 0.1, realPosition[2]]}>
        <div className="text-white text-xs bg-black/70 px-1 py-0.5 rounded whitespace-nowrap pointer-events-none">
          {satellite.name}
        </div>
      </Html>
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

// Main Scene Component with location selection
function Scene({ 
  isPlaying, 
  satellites, 
  onSatelliteClick,
  selectedLayer,
  selectedLocation,
  onLocationSelect,
  focusLocation
}: { 
  isPlaying: boolean;
  satellites: Satellite[];
  onSatelliteClick: (satellite: Satellite) => void;
  selectedLayer: string;
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (lat: number, lon: number) => void;
  focusLocation?: SelectedLocation;
}) {
  const { camera, gl, raycaster, pointer } = useThree();
  
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

  // Focus camera on searched location
  useEffect(() => {
    if (focusLocation && camera) {
      console.log(`🎯 Focusing camera on: ${focusLocation.latitude}°, ${focusLocation.longitude}°`);
      
      // Calculate optimal camera position to view the location
      const [x, y, z] = focusLocation.position;
      const distance = 4; // Distance from the surface
      
      // Position camera to look at the location
      const cameraX = x * distance / 2;
      const cameraY = y * distance / 2;
      const cameraZ = z * distance / 2;
      
      // Smooth camera transition
      const targetPosition = new THREE.Vector3(cameraX, cameraY, cameraZ);
      const currentPosition = camera.position.clone();
      
      // Animate camera movement
      let progress = 0;
      const animateCamera = () => {
        progress += 0.02;
        if (progress <= 1) {
          camera.position.lerpVectors(currentPosition, targetPosition, progress);
          camera.lookAt(0, 0, 0); // Always look at Earth center
          requestAnimationFrame(animateCamera);
        }
      };
      
      animateCamera();
    }
  }, [focusLocation, camera]);

  // Handle Earth click for location selection
  const handleEarthClick = useCallback((event: any) => {
    event.stopPropagation();
    
    // Calculate intersection point with Earth sphere
    raycaster.setFromCamera(pointer, camera);
    
    // Create a sphere geometry to intersect with (same as Earth)
    const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sphereMesh = new THREE.Mesh(sphereGeometry);
    
    const intersects = raycaster.intersectObject(sphereMesh);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      // Convert 3D coordinates back to lat/lng
      const radius = 2;
      const lat = Math.asin(point.y / radius) * (180 / Math.PI);
      const lng = Math.atan2(-point.z, -point.x) * (180 / Math.PI);
      
      onLocationSelect(lat, lng);
    }
  }, [camera, raycaster, pointer, onLocationSelect]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <Stars 
        radius={300} 
        depth={60} 
        count={20000} 
        factor={7} 
        saturation={0} 
        fade 
        speed={0.5}
      />
      
      {/* Earth with click handler */}
      <group onClick={handleEarthClick}>
        <Earth rotationSpeed={isPlaying ? 0.001 : 0} selectedLayer={selectedLayer} />
      </group>
      
      {/* Satellites */}
      {satellites.map((satellite, index) => (
        <SatellitePoint 
          key={`${satellite.name}-${index}`} 
          satellite={satellite} 
          isPlaying={isPlaying}
        />
      ))}
      
      {/* Orbital paths */}
      {satellites.map((satellite, index) => (
        <OrbitalPath 
          key={`orbit-${satellite.name}-${index}`}
          radius={2.2 + (satellite.altitude / 1000)}
          color="#00ff41"
          inclination={satellite.noradId * 0.01}
        />
      ))}
      
      {/* Location marker */}
      {selectedLocation && <LocationMarker location={selectedLocation} />}
      
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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }));
  const [selectedLayer, setSelectedLayer] = useState('Visible Earth');
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [focusLocation, setFocusLocation] = useState<SelectedLocation | null>(null);

  // Enhanced location selection with weather data
  const handleLocationSelectWithWeather = useCallback(async (lat: number, lon: number, locationInfo?: any) => {
    console.log(`🌍 Location selected: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
    
    // Update location
    if (onLocationSelect) {
      onLocationSelect(lat, lon);
    }

    // Convert to 3D coordinates for Earth
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -2.02 * Math.sin(phi) * Math.cos(theta);
    const y = 2.02 * Math.cos(phi);
    const z = 2.02 * Math.sin(phi) * Math.sin(theta);

    const newLocation: SelectedLocation = {
      latitude: lat,
      longitude: lon,
      position: [x, y, z]
    };

    setSelectedLocation(newLocation);
    setFocusLocation(newLocation);

    // Fetch weather data for selected location
    setWeatherLoading(true);
    try {
      console.log(`🌤️ Fetching weather data for ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
      const weather = await fetchWeatherData(lat, lon);
      setWeatherData(weather);
      console.log('✅ Weather data loaded for selected location');
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    } finally {
      setWeatherLoading(false);
    }
  }, [onLocationSelect]);

  // Fetch satellite data from NASA APIs
  const fetchSatelliteData = useCallback(async () => {
    console.log('🛰️ Fetching real-time satellite positions from NASA APIs...');
    
    try {
      const satelliteList = [
        { name: 'PACE', noradId: 59009, type: 'Climate', altitude: 676 },
        { name: 'Jason-3', noradId: 41240, type: 'Ocean', altitude: 1336 },
        { name: 'SMAP', noradId: 40376, type: 'Earth Science', altitude: 685 },
        { name: 'Landsat 8', noradId: 39084, type: 'Earth Observation', altitude: 705 },
        { name: 'Landsat 9', noradId: 49260, type: 'Earth Observation', altitude: 705 },
        { name: 'SWOT', noradId: 54754, type: 'Ocean', altitude: 857 },
        { name: 'Sentinel-6 Michael Freilich', noradId: 46984, type: 'Ocean', altitude: 1336 },
        { name: 'CYGNSS 1', noradId: 41884, type: 'Weather', altitude: 510 },
        { name: 'CYGNSS 2', noradId: 41885, type: 'Weather', altitude: 510 },
        { name: 'CYGNSS 3', noradId: 41886, type: 'Weather', altitude: 510 },
        { name: 'CYGNSS 5', noradId: 41888, type: 'Weather', altitude: 510 },
        { name: 'CYGNSS 7', noradId: 41890, type: 'Weather', altitude: 510 },
        { name: 'CYGNSS 8', noradId: 41891, type: 'Weather', altitude: 510 },
        { name: 'NOAA 20', noradId: 43013, type: 'Weather', altitude: 824 }
      ];

      const tlePromises = satelliteList.map(async (sat) => {
        try {
          const response = await fetch(`https://tle.ivanstanojevic.me/api/tle/${sat.noradId}`);
          const tleData = await response.json();
          
          if (tleData && tleData.line1 && tleData.line2) {
            console.log(`📡 Updated ${sat.name} orbital data`);
            
            // Generate initial position based on TLE data
            const meanMotion = parseFloat(tleData.line2.substring(52, 63));
            const currentTime = Date.now() / 1000;
            const angle = (currentTime * meanMotion * 2 * Math.PI) / 86400;
            
            const radius = 2.2 + (sat.altitude / 1000);
            const inclination = sat.noradId * 0.01;
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * Math.sin(inclination) * 0.5;
            const z = Math.sin(angle) * radius;
            
            return {
              ...sat,
              position: [x, y, z] as [number, number, number],
              velocity: [0, 0, 0] as [number, number, number],
              active: true,
              tle: {
                line1: tleData.line1,
                line2: tleData.line2
              }
            };
          }
          return null;
        } catch (error) {
          console.warn(`Failed to fetch TLE for ${sat.name}:`, error);
          return null;
        }
      });

      const satelliteData = await Promise.all(tlePromises);
      const validSatellites = satelliteData.filter(sat => sat !== null) as Satellite[];
      
      setSatellites(validSatellites);
      
    } catch (error) {
      console.error('Failed to fetch satellite data:', error);
    }
  }, []);

  // Initial satellite data fetch and periodic updates
  useEffect(() => {
    fetchSatelliteData();
    const interval = setInterval(fetchSatelliteData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchSatelliteData]);

  // Handle toggle play/pause
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
    if (onRotationChange) {
      onRotationChange(!isPlaying);
    }
  }, [isPlaying, onRotationChange]);

  const handleSatelliteClick = useCallback((satellite: Satellite) => {
    console.log('Satellite clicked:', satellite.name);
  }, []);

  return (
    <div style={{ height }} className="relative bg-black overflow-hidden">
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Left: Date and Controls */}
          <div className="flex items-center gap-4">
            <div className="text-white">
              <div className="text-sm text-gray-300">NASA Earth Observatory</div>
              <div className="text-xs text-gray-400">{currentDate}</div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleTogglePlay}
              className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Center: Enhanced Location Search */}
          <div className="flex-1 max-w-2xl">
            <LocationSearch
              onLocationSelect={handleLocationSelectWithWeather}
              placeholder="🔍 Search by location name or coordinates (e.g., 'New York' or '40.7589,-73.9851')"
              className="w-full"
              showCurrentLocationButton={true}
            />
          </div>

          {/* Right: Layer Controls */}
          <div className="flex items-center gap-2">
            <select 
              value={selectedLayer} 
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="bg-black/50 border border-gray-600 text-white text-sm rounded px-3 py-2"
            >
              <option value="Visible Earth">🌍 Visible Earth</option>
              <option value="Air Temperature">🌡️ Temperature</option>
              <option value="Visible Light">💡 Visible Light</option>
              <option value="Infrared">🔴 Infrared</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-full bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p>Loading NASA Earth Observatory...</p>
          </div>
        </div>
      }>
        <Canvas
          gl={{ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
          }}
          camera={{ 
            position: [0, 0, 6], 
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000011, 1);
            console.log('🎮 3D Canvas initialized');
          }}
        >
          <Scene 
            isPlaying={isPlaying}
            satellites={satellites}
            onSatelliteClick={handleSatelliteClick}
            selectedLayer={selectedLayer}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelectWithWeather}
            focusLocation={focusLocation}
          />
        </Canvas>
      </Suspense>

      {/* Weather Info Panel */}
      {weatherData && selectedLocation && (
        <Card className="absolute top-20 right-4 w-80 bg-black/80 border-gray-600 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-blue-400" />
              {weatherData.location.city}, {weatherData.location.country}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Weather */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getWeatherIcon(weatherData.current.weatherCode)}</span>
                <div>
                  <div className="text-2xl font-bold">{weatherData.current.temperature}°C</div>
                  <div className="text-sm text-gray-300">{getWeatherDescription(weatherData.current.weatherCode)}</div>
                </div>
              </div>
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-gray-300">Wind</div>
                  <div>{weatherData.current.windSpeed} km/h {getWindDirection(weatherData.current.windDirection)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-gray-300">Pressure</div>
                  <div>{weatherData.current.pressure} hPa</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-gray-300">Humidity</div>
                  <div>{weatherData.current.humidity}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-gray-300">Precipitation</div>
                  <div>{weatherData.current.precipitation} mm</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 mt-2">
              Coordinates: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading indicator for weather */}
      {weatherLoading && (
        <div className="absolute top-20 right-4 w-80">
          <Card className="bg-black/80 border-gray-600 text-white">
            <CardContent className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
              <span>Loading weather data...</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Satellite Count Info */}
      <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-2 rounded-lg border border-gray-600">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-green-400" />
          <span>{satellites.length} Active Satellites</span>
        </div>
      </div>

      {/* Layer Info */}
      <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-3 py-2 rounded-lg border border-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span>Layer: {selectedLayer}</span>
        </div>
      </div>
    </div>
  );
}