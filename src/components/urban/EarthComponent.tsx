import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const NASA_API_KEY = 'GXcqYeyqgnHgWfdabi6RYhLPhdY1uIyiPsB922ZV';

interface EarthProps {
  rotationSpeed: number;
  selectedLayer: string;
}

export function Earth({ rotationSpeed, selectedLayer }: EarthProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [elevationTexture, setElevationTexture] = useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const layerEndpoints = {
    'Visible Earth': {
      primary: `https://api.nasa.gov/planetary/earth/imagery?lat=0&lon=0&dim=0.15&api_key=${NASA_API_KEY}`,
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg'
      ]
    },
    'Air Temperature': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147890/iss069e000715_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg'
      ]
    },
    'Visible Light': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147190/iss068e059806_lrg.jpg'
      ]
    },
    'Infrared': {
      primary: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57723/greenland_vir_2017210_lrg.jpg',
      fallbacks: [
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/147000/147890/iss069e000715_lrg.jpg',
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78314/VIIRS_3Feb2012_lrg.jpg'
      ]
    }
  };

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
    const loadTextures = async () => {
      setLoading(true);
      setUsingFallback(false);
      console.log(`🛰️ Loading ${selectedLayer} imagery...`);
      
      const loader = new THREE.TextureLoader();
      
      // Load elevation texture
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
      
      // Load cloud texture
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
      
      // Load main Earth texture
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
          console.warn(`Failed to load texture from URL ${i + 1}`);
          continue;
        }
      }
      
      // Create fallback texture if all URLs failed
      if (!textureLoaded) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        
        // Ocean background
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#1e40af');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 512);
        
        // Simple continents
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

    loadTextures();
  }, [selectedLayer]);

  useFrame(() => {
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