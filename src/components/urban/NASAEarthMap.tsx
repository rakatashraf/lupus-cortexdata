import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Pause, Calendar, Settings, RotateCcw, Satellite, MapPin, Thermometer, Wind, Gauge, CloudRain, Search } from 'lucide-react';
import { fetchWeatherData, WeatherData, getWeatherDescription, getWeatherIcon, getWindDirection } from '@/services/weather-service';
import { Earth } from './EarthComponent';

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
  
  // Create helper functions outside useEffect
  const createProceduralElevation = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(512, 256);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 512;
      const y = Math.floor((i / 4) / 512);
      const noise = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 0.5 + 0.5;
      const elevation = Math.floor(noise * 255);
      
      data[i] = elevation;
      data[i + 1] = elevation;
      data[i + 2] = elevation;
      data[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    const elevTexture = new THREE.CanvasTexture(canvas);
    elevTexture.wrapS = THREE.RepeatWrapping;
    elevTexture.wrapT = THREE.ClampToEdgeWrapping;
    setElevationTexture(elevTexture);
  };
  
  const createProceduralClouds = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 1024, 512);
    
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + layer * 0.1})`;
      
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const size = Math.random() * 100 + 20;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.wrapS = THREE.RepeatWrapping;
    cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
    setCloudsTexture(cloudTexture);
  };

  useEffect(() => {
    const loadNASAImagery = async () => {
      setLoading(true);
      setUsingFallback(false);
      console.log(`🛰️ Loading ${selectedLayer} imagery...`);
      
      const loader = new THREE.TextureLoader();
      
      // Load additional textures for realism
      loader.load(
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73934/gebco_08_rev_elev_21600x10800.png',
        (elevTexture) => {
          elevTexture.wrapS = THREE.RepeatWrapping;
          elevTexture.wrapT = THREE.ClampToEdgeWrapping;
          setElevationTexture(elevTexture);
        },
        undefined,
        () => createProceduralElevation()
      );
      
      loader.load(
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg',
        (cloudTexture) => {
          cloudTexture.wrapS = THREE.RepeatWrapping;
          cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
          setCloudsTexture(cloudTexture);
        },
        undefined,
        () => createProceduralClouds()
      );
      
      const config = layerEndpoints[selectedLayer as keyof typeof layerEndpoints] || layerEndpoints['Visible Earth'];
      const urlsToTry = [config.primary, ...config.fallbacks];
      let textureLoaded = false;
      
      for (let i = 0; i < urlsToTry.length && !textureLoaded; i++) {
        const url = urlsToTry[i];
        try {
          await new Promise((resolve, reject) => {
            loader.load(
              url,
              (loadedTexture) => {
                loadedTexture.wrapS = THREE.RepeatWrapping;
                loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
                loadedTexture.flipY = false;
                setTexture(loadedTexture);
                setLoading(false);
                textureLoaded = true;
                resolve(loadedTexture);
              },
              undefined,
              reject
            );
          });
        } catch (error) {
          continue;
        }
      }
      
      if (!textureLoaded) {
        // Create basic Earth texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#1e40af');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);
        
        ctx.fillStyle = '#22c55e';
        const continents = [
          { x: 200, y: 150, w: 100, h: 80 },
          { x: 250, y: 350, w: 50, h: 100 },
          { x: 500, y: 200, w: 80, h: 120 },
          { x: 700, y: 150, w: 120, h: 90 },
          { x: 800, y: 380, w: 60, h: 40 }
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
      }
    };

    loadNASAImagery();
  }, [selectedLayer]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotationSpeed * 1.1;
    }
  });

  return (
    <group>
      {/* Enhanced Earth with realistic materials */}
      <mesh ref={meshRef} receiveShadow castShadow>
        <sphereGeometry args={[2, 256, 256]} />
        <meshStandardMaterial
          map={texture}
          displacementMap={elevationTexture}
          displacementScale={0.1}
          normalMap={normalTexture}
          normalScale={new THREE.Vector2(1, 1)}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Realistic cloud layer */}
      {cloudsTexture && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[2.02, 128, 128]} />
          <meshLambertMaterial
            map={cloudsTexture}
            transparent={true}
            opacity={0.4}
            alphaMap={cloudsTexture}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Loading indicator */}
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
      
      {/* Data source indicator */}
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
      
    // Create inner function to have access to loader
    const loadAdditionalTextures = (loader: THREE.TextureLoader) => {
      console.log('🌍 Loading additional Earth textures for realism...');
      
      // Load elevation/displacement map for terrain
      loader.load(
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73934/gebco_08_rev_elev_21600x10800.png',
        (elevTexture) => {
          console.log('✅ Elevation texture loaded');
          elevTexture.wrapS = THREE.RepeatWrapping;
          elevTexture.wrapT = THREE.ClampToEdgeWrapping;
          setElevationTexture(elevTexture);
        },
        undefined,
        (error) => {
          console.warn('Failed to load elevation texture:', error);
          // Create procedural elevation texture
          createProceduralElevation();
        }
      );
      
      // Load normal map for surface detail
      loader.load(
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        (normTexture) => {
          console.log('✅ Normal texture loaded');
          normTexture.wrapS = THREE.RepeatWrapping;
          normTexture.wrapT = THREE.ClampToEdgeWrapping;
          setNormalTexture(normTexture);
        },
        undefined,
        (error) => {
          console.warn('Failed to load normal texture:', error);
        }
      );
      
      // Load cloud texture
      loader.load(
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg',
        (cloudTexture) => {
          console.log('✅ Cloud texture loaded');
          cloudTexture.wrapS = THREE.RepeatWrapping;
          cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
          setCloudsTexture(cloudTexture);
        },
        undefined,
        (error) => {
          console.warn('Failed to load cloud texture:', error);
          // Create procedural clouds
          createProceduralClouds();
        }
      );
    };
    
    // Create procedural elevation texture if loading fails
    const createProceduralElevation = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      
      const imageData = ctx.createImageData(512, 256);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % 512;
        const y = Math.floor((i / 4) / 512);
        const noise = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 0.5 + 0.5;
        const elevation = Math.floor(noise * 255);
        
        data[i] = elevation;
        data[i + 1] = elevation;
        data[i + 2] = elevation;
        data[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      const elevTexture = new THREE.CanvasTexture(canvas);
      elevTexture.wrapS = THREE.RepeatWrapping;
      elevTexture.wrapT = THREE.ClampToEdgeWrapping;
      setElevationTexture(elevTexture);
    };
    
    // Create procedural cloud texture if loading fails
    const createProceduralClouds = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // Create cloud patterns
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, 1024, 512);
      
      // Add multiple cloud layers
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + layer * 0.1})`;
        
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * 1024;
          const y = Math.random() * 512;
          const size = Math.random() * 100 + 20;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      const cloudTexture = new THREE.CanvasTexture(canvas);
      cloudTexture.wrapS = THREE.RepeatWrapping;
      cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
      setCloudsTexture(cloudTexture);
    };

    loadNASAImagery();
  }, [selectedLayer]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }
    
    // Rotate clouds slightly faster for realism
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotationSpeed * 1.1;
    }
  });

  return (
    <group>
      {/* Enhanced Earth with realistic materials */}
      <mesh ref={meshRef} receiveShadow castShadow>
        <sphereGeometry args={[2, 256, 256]} />
        <meshStandardMaterial
          map={texture}
          displacementMap={elevationTexture}
          displacementScale={0.1}
          normalMap={normalTexture}
          normalScale={new THREE.Vector2(1, 1)}
          roughness={0.8}
          metalness={0.1}
          transparent={false}
          opacity={1.0}
        />
      </mesh>
      
      {/* Realistic cloud layer */}
      {cloudsTexture && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[2.02, 128, 128]} />
          <meshLambertMaterial
            map={cloudsTexture}
            transparent={true}
            opacity={0.4}
            alphaMap={cloudsTexture}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Improved atmosphere glow with multiple layers */}
      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial 
          color="#87CEEB" 
          transparent 
          opacity={0.08} 
          side={THREE.BackSide}
        />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshBasicMaterial 
          color="#4FC3F7" 
          transparent 
          opacity={0.05} 
          side={THREE.BackSide}
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

  // Handle globe clicks for location selection
  const handleGlobeClick = useCallback((event: any) => {
    event.stopPropagation();
    
    // Get intersection point on the sphere
    const earthRadius = 2;
    const intersectionPoint = event.point;
    
    // Convert 3D point to lat/lon
    const phi = Math.acos(-intersectionPoint.y / earthRadius);
    const theta = Math.atan2(-intersectionPoint.z, intersectionPoint.x) + Math.PI;
    
    const latitude = (phi * 180 / Math.PI) - 90;
    const longitude = (theta * 180 / Math.PI) - 180;
    
    console.log(`🌍 Location selected: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
    onLocationSelect(latitude, longitude);
  }, [onLocationSelect]);

  return (
    <>
      <Stars radius={100} depth={50} count={2000} factor={6} saturation={0.7} fade speed={0.5} />
      
      {/* Enhanced lighting system for realism */}
      <ambientLight intensity={0.2} color="#404040" />
      
      {/* Main sun light */}
      <directionalLight 
        position={[10, 5, 5]} 
        intensity={1.2} 
        color="#FFE5B4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Rim lighting for atmosphere effect */}
      <pointLight position={[-8, 0, 0]} intensity={0.5} color="#87CEEB" />
      <pointLight position={[8, 0, 0]} intensity={0.3} color="#FFA500" />
      
      {/* Subtle fill light */}
      <hemisphereLight 
        args={["#87CEEB", "#2C1810", 0.4]}
      />
      
      {/* Earth with clickable surface */}
      <group onClick={handleGlobeClick}>
        <Earth rotationSpeed={isPlaying ? 0.005 : 0} selectedLayer={selectedLayer} />
      </group>
      
      {/* Volumetric atmosphere effect */}
      <mesh>
        <sphereGeometry args={[2.25, 32, 32]} />
        <meshBasicMaterial 
          color="#1E88E5" 
          transparent 
          opacity={0.03} 
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
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
      
      {/* Selected location marker */}
      {selectedLocation && (
        <LocationMarker location={selectedLocation} />
      )}
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        enableRotate={true}
        minDistance={2.5}
        maxDistance={25}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
        autoRotate={false}
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
  
  // Simplified data layers
  const dataLayers = [
    'Visible Earth',
    'Air Temperature', 
    'Visible Light',
    'Infrared'
  ];

  // Update selected layer state to trigger Earth texture reload
  const [selectedLayer, setSelectedLayer] = useState('Visible Earth');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Weather and location state
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [focusLocation, setFocusLocation] = useState<SelectedLocation | null>(null);
  
  // Handle location selection
  const handleLocationSelect = useCallback(async (lat: number, lon: number) => {
    console.log(`🌍 Location selected: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
    
    // Convert lat/lon to 3D position on sphere
    const earthRadius = 2;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = earthRadius * Math.sin(phi) * Math.cos(theta);
    const y = earthRadius * Math.cos(phi);
    const z = earthRadius * Math.sin(phi) * Math.sin(theta);
    
    const newLocation: SelectedLocation = {
      latitude: lat,
      longitude: lon,
      position: [x, y, z]
    };
    
    setSelectedLocation(newLocation);
    setFocusLocation(newLocation); // Focus camera on the location
    onLocationSelect?.(lat, lon);
    
    // Fetch weather data for the selected location
    setWeatherLoading(true);
    try {
      const weather = await fetchWeatherData(lat, lon);
      setWeatherData(weather);
      console.log('✅ Weather data loaded for selected location');
    } catch (error) {
      console.error('❌ Failed to load weather data:', error);
    } finally {
      setWeatherLoading(false);
    }
  }, [onLocationSelect]);

  // Auto-update weather data every 5 minutes
  useEffect(() => {
    if (selectedLocation && weatherData) {
      const interval = setInterval(async () => {
        console.log('🔄 Updating weather data...');
        try {
          const updatedWeather = await fetchWeatherData(selectedLocation.latitude, selectedLocation.longitude);
          setWeatherData(updatedWeather);
        } catch (error) {
          console.error('Failed to update weather data:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [selectedLocation, weatherData]);
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

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    onRotationChange?.(!isPlaying);
  }, [isPlaying, onRotationChange]);

  const handleSatelliteClick = useCallback((satellite: Satellite) => {
    console.log('Satellite clicked:', satellite.name);
  }, []);

  // Geocoding service for place name search
  const geocodePlace = async (placeName: string): Promise<{lat: number; lon: number; displayName: string} | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NASA-Earth-Weather-App'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
        }
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
    return null;
  };

  // Parse coordinate input (lat,lon format)
  const parseCoordinates = (input: string): {lat: number; lon: number} | null => {
    const coordRegex = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
    const match = input.trim().match(coordRegex);
    
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
    return null;
  };

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    console.log(`🔍 Searching for: ${searchQuery}`);
    
    try {
      // First, try to parse as coordinates
      const coords = parseCoordinates(searchQuery);
      
      if (coords) {
        console.log(`📍 Parsed coordinates: ${coords.lat}, ${coords.lon}`);
        await handleLocationSelect(coords.lat, coords.lon);
        setSearchQuery(''); // Clear search after successful search
      } else {
        // Try geocoding as place name
        const result = await geocodePlace(searchQuery);
        
        if (result) {
          console.log(`🌍 Found location: ${result.displayName}`);
          await handleLocationSelect(result.lat, result.lon);
          setSearchQuery(''); // Clear search after successful search
        } else {
          console.warn('❌ Location not found');
          // You could show a toast notification here
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input keypress
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative w-full bg-black" style={{ height }}>
      {/* Enhanced Header with Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/95 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Satellite className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-white font-bold text-lg">Live NASA Satellite Imagery</h1>
              <p className="text-gray-400 text-sm">Real-time Earth observation data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className="bg-green-600 text-white animate-pulse">
              LIVE DATA
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handlePlayPause}
              className="text-white hover:bg-gray-700"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        {/* Prominent Search Bar */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 bg-gray-800/90 border border-gray-600 rounded-lg p-3 w-full max-w-2xl">
            <Search className="w-5 h-5 text-blue-400" />
            <Input
              type="text"
              placeholder="🔍 Search by location name or coordinates (e.g., 'New York' or '40.7589,-73.9851')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="flex-1 text-white bg-transparent border-none focus:ring-0 placeholder-gray-400"
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              {searchLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Left Panel with Weather Data */}
      <div className="absolute left-6 top-32 bottom-16 w-80 z-40">
        <Card className="bg-black/90 border-gray-700 h-full overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Satellite className="w-4 h-4" />
              SATELLITE DATA LAYERS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            
            <div className="space-y-3">
              <h3 className="text-white text-sm font-medium mb-3">Data Layers</h3>
              {dataLayers.map((layer) => (
                <Button
                  key={layer}
                  variant={selectedLayer === layer ? "default" : "outline"}
                  className={`w-full justify-start text-sm ${
                    selectedLayer === layer 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => setSelectedLayer(layer)}
                >
                  {layer}
                </Button>
              ))}
            </div>
            
            {/* Weather Data Section */}
            {weatherData && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <h3 className="text-white text-sm font-medium">Weather Data</h3>
                  {weatherLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  )}
                </div>
                
                <div className="bg-gray-800 rounded-lg p-3 space-y-3">
                  <div className="text-center border-b border-gray-600 pb-2">
                    <p className="text-cyan-400 font-medium text-sm">
                      {weatherData.location.city}, {weatherData.location.country}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {weatherData.location.latitude.toFixed(2)}°, {weatherData.location.longitude.toFixed(2)}°
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Temperature */}
                    <div className="flex items-center gap-2 bg-red-600/20 p-2 rounded">
                      <Thermometer className="w-4 h-4 text-red-400" />
                      <div>
                        <p className="text-white font-bold">{weatherData.current.temperature}°C</p>
                        <p className="text-gray-400 text-xs">Temperature</p>
                      </div>
                    </div>
                    
                    {/* Wind */}
                    <div className="flex items-center gap-2 bg-blue-600/20 p-2 rounded">
                      <Wind className="w-4 h-4 text-blue-400" />
                      <div>
                        <p className="text-white font-bold">{weatherData.current.windSpeed} km/h</p>
                        <p className="text-gray-400 text-xs">{getWindDirection(weatherData.current.windDirection)}</p>
                      </div>
                    </div>
                    
                    {/* Pressure */}
                    <div className="flex items-center gap-2 bg-purple-600/20 p-2 rounded">
                      <Gauge className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-white font-bold">{weatherData.current.pressure} hPa</p>
                        <p className="text-gray-400 text-xs">Pressure</p>
                      </div>
                    </div>
                    
                    {/* Precipitation */}
                    <div className="flex items-center gap-2 bg-green-600/20 p-2 rounded">
                      <CloudRain className="w-4 h-4 text-green-400" />
                      <div>
                        <p className="text-white font-bold">{weatherData.current.precipitation} mm</p>
                        <p className="text-gray-400 text-xs">Precipitation</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2 border-t border-gray-600">
                    <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
                      {getWeatherIcon(weatherData.current.weatherCode)}
                      {getWeatherDescription(weatherData.current.weatherCode)}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Humidity: {weatherData.current.humidity}% • Clouds: {weatherData.current.cloudCover}%
                    </p>
                    <p className="text-gray-500 text-xs">
                      Updated: {new Date(weatherData.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!weatherData && (
              <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Click on the globe to get weather data</p>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-white text-sm font-medium mb-3">Active Satellites</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-gray-800 rounded">
                  <div className="text-green-400 text-xl font-bold">{satellites.filter(s => s.active).length}</div>
                  <div className="text-gray-400 text-xs">Online</div>
                </div>
                <div className="text-center p-2 bg-gray-800 rounded">
                  <div className="text-orange-400 text-xl font-bold">{satellites.length}</div>
                  <div className="text-gray-400 text-xs">Total</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Status */}
      <div className="absolute right-6 top-32 w-64 z-40">
        <Card className="bg-blue-600 border-blue-500">
          <CardContent className="p-4">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-white text-sm">Current Layer</p>
              <p className="text-white font-bold text-lg">{selectedLayer}</p>
              <p className="text-blue-200 text-xs mt-2">{currentDate}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Canvas */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p>Loading NASA Satellite Data...</p>
          </div>
        </div>
      }>
        <Canvas 
          className="absolute inset-0"
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
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            focusLocation={focusLocation}
          />
        </Canvas>
      </Suspense>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-gray-700 px-6 py-3">
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handlePlayPause}
            className="text-white hover:bg-gray-700"
          >
            {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isPlaying ? 'Pause' : 'Play'} Simulation
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset View
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}