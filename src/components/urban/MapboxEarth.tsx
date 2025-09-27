import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface MapboxEarthProps {
  rotationSpeed: number;
  selectedLayer: string;
  mapboxToken?: string;
}

interface MapTileConfig {
  name: string;
  url: string;
  attribution: string;
  requiresToken?: boolean;
}

export const MapboxEarth: React.FC<MapboxEarthProps> = ({ rotationSpeed, selectedLayer, mapboxToken = '' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(true);

  // Beautiful map tile configurations
  const mapConfigs: Record<string, MapTileConfig> = {
    'Visible Earth': {
      name: 'Mapbox Satellite',
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
      attribution: '© Mapbox © OpenStreetMap',
      requiresToken: true
    },
    'Air Temperature': {
      name: 'Mapbox Outdoors',
      url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
      attribution: '© Mapbox © OpenStreetMap',
      requiresToken: true
    },
    'Visible Light': {
      name: 'Mapbox Streets',
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
      attribution: '© Mapbox © OpenStreetMap',
      requiresToken: true
    },
    'Infrared': {
      name: 'Mapbox Dark',
      url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
      attribution: '© Mapbox © OpenStreetMap',
      requiresToken: true
    }
  };

  // Enhanced fallback configurations with beautiful styling
  const fallbackConfigs: Record<string, MapTileConfig> = {
    'Visible Earth': {
      name: 'Esri World Imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri © Maxar © Earthstar Geographics'
    },
    'Air Temperature': {
      name: 'CartoDB Positron',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CartoDB'
    },
    'Visible Light': {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    'Infrared': {
      name: 'CartoDB Dark Matter',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap © CartoDB'
    }
  };

  const createGorgeousEarthTexture = useCallback(async () => {
    setLoading(true);
    console.log(`🗺️ Creating gorgeous Earth texture for ${selectedLayer}...`);

    try {
      // Try Mapbox first if token is available
      if (mapboxToken && mapboxToken.length > 10) {
        console.log('🚀 Using Mapbox for premium map quality...');
        await loadMapboxTiles();
      } else {
        console.log('🌍 Using enhanced fallback tiles...');
        await loadEnhancedFallbackTiles();
      }
    } catch (error) {
      console.error('Failed to load map tiles:', error);
      await createStyledFallbackTexture();
    }
  }, [selectedLayer, mapboxToken]);

  const loadMapboxTiles = async () => {
    const config = mapConfigs[selectedLayer];
    if (!config) throw new Error('Invalid layer');

    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    // Create a beautiful gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 2048);
    if (selectedLayer === 'Infrared') {
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#1a1a2e');
    } else {
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(1, '#4682B4'); // Steel blue
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4096, 2048);

    // Load high-quality tiles
    const zoomLevel = 3; // Higher resolution
    const tilesX = Math.pow(2, zoomLevel);
    const tilesY = Math.pow(2, zoomLevel);
    
    const tilePromises = [];
    
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tileUrl = config.url
          .replace('{z}', zoomLevel.toString())
          .replace('{x}', x.toString())
          .replace('{y}', y.toString())
          .replace('{s}', ['a', 'b', 'c'][x % 3]);
        
        const promise = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            const canvasX = (x * 512) * (4096 / (tilesX * 512));
            const canvasY = (y * 512) * (2048 / (tilesY * 512));
            const canvasWidth = 4096 / tilesX;
            const canvasHeight = 2048 / tilesY;
            
            // Apply beautiful blending
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(img, canvasX, canvasY, canvasWidth, canvasHeight);
            ctx.globalCompositeOperation = 'source-over';
            resolve(null);
          };
          
          img.onerror = () => resolve(null);
          img.src = tileUrl;
        });
        
        tilePromises.push(promise);
      }
    }
    
    await Promise.race([
      Promise.all(tilePromises),
      new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
    ]);

    // Add atmospheric effects
    addAtmosphericEffects(ctx, canvas.width, canvas.height);
    
    createTextureFromCanvas(canvas);
  };

  const loadEnhancedFallbackTiles = async () => {
    const config = fallbackConfigs[selectedLayer];
    if (!config) throw new Error('Invalid fallback layer');

    const canvas = document.createElement('canvas');
    canvas.width = 3072;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d')!;

    // Enhanced background based on layer type
    const gradient = ctx.createRadialGradient(1536, 768, 0, 1536, 768, 1536);
    
    switch (selectedLayer) {
      case 'Visible Earth':
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#191970');
        break;
      case 'Air Temperature':
        gradient.addColorStop(0, '#FFE4B5');
        gradient.addColorStop(1, '#8B4513');
        break;
      case 'Infrared':
        gradient.addColorStop(0, '#2F2F4F');
        gradient.addColorStop(1, '#000000');
        break;
      default:
        gradient.addColorStop(0, '#F0F8FF');
        gradient.addColorStop(1, '#4169E1');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 3072, 1536);

    // Load enhanced tiles
    const zoomLevel = 3;
    const tilesX = Math.pow(2, zoomLevel);
    const tilesY = Math.pow(2, zoomLevel);
    
    const tilePromises = [];
    
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tileUrl = config.url
          .replace('{z}', zoomLevel.toString())
          .replace('{x}', x.toString())
          .replace('{y}', y.toString())
          .replace('{s}', ['a', 'b', 'c'][x % 3])
          .replace('{r}', '');
        
        const promise = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            const canvasX = (x * 256) * (3072 / (tilesX * 256));
            const canvasY = (y * 256) * (1536 / (tilesY * 256));
            const canvasWidth = 3072 / tilesX;
            const canvasHeight = 1536 / tilesY;
            
            // Enhanced blending for beautiful appearance
            ctx.globalAlpha = 0.85;
            ctx.drawImage(img, canvasX, canvasY, canvasWidth, canvasHeight);
            ctx.globalAlpha = 1.0;
            resolve(null);
          };
          
          img.onerror = () => resolve(null);
          img.src = tileUrl;
        });
        
        tilePromises.push(promise);
      }
    }
    
    await Promise.race([
      Promise.all(tilePromises),
      new Promise(resolve => setTimeout(resolve, 8000))
    ]);

    // Add beautiful overlays
    addEnhancedEffects(ctx, canvas.width, canvas.height);
    createTextureFromCanvas(canvas);
  };

  const addAtmosphericEffects = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add subtle atmospheric glow
    const atmosphereGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
    atmosphereGradient.addColorStop(0, 'rgba(135, 206, 235, 0.1)');
    atmosphereGradient.addColorStop(0.7, 'rgba(135, 206, 235, 0.3)');
    atmosphereGradient.addColorStop(1, 'rgba(25, 25, 112, 0.6)');
    
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = atmosphereGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  };

  const addEnhancedEffects = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add subtle enhancement overlays
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.2;
    
    const enhancementGradient = ctx.createLinearGradient(0, 0, width, height);
    enhancementGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    enhancementGradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.2)');
    enhancementGradient.addColorStop(1, 'rgba(72, 61, 139, 0.4)');
    
    ctx.fillStyle = enhancementGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  };

  const createStyledFallbackTexture = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Create gorgeous procedural Earth
    const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 1024);
    gradient.addColorStop(0, '#4A90E2');
    gradient.addColorStop(0.7, '#2E5BBA');
    gradient.addColorStop(1, '#1B365D');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    
    // Add stylized continents with beautiful colors
    ctx.fillStyle = '#34C759'; // Beautiful green
    
    const continents = [
      { x: 400, y: 300, w: 150, h: 100, rotation: 0.2 }, // North America
      { x: 400, y: 600, w: 100, h: 150, rotation: -0.1 }, // South America
      { x: 800, y: 350, w: 120, h: 180, rotation: 0.1 }, // Europe/Africa
      { x: 1200, y: 250, w: 200, h: 120, rotation: 0.15 }, // Asia
      { x: 1400, y: 650, w: 100, h: 70, rotation: -0.2 } // Australia
    ];
    
    continents.forEach(continent => {
      ctx.save();
      ctx.translate(continent.x, continent.y);
      ctx.rotate(continent.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, continent.w, continent.h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    // Add atmospheric effects
    addAtmosphericEffects(ctx, 2048, 1024);
    
    createTextureFromCanvas(canvas);
  };

  const createTextureFromCanvas = (canvas: HTMLCanvasElement) => {
    const mapTexture = new THREE.CanvasTexture(canvas);
    mapTexture.wrapS = THREE.RepeatWrapping;
    mapTexture.wrapT = THREE.ClampToEdgeWrapping;
    mapTexture.flipY = false;
    mapTexture.minFilter = THREE.LinearFilter;
    mapTexture.magFilter = THREE.LinearFilter;
    
    // Enhanced texture settings for beautiful appearance
    mapTexture.generateMipmaps = true;
    mapTexture.anisotropy = 16; // Maximum anisotropy for crisp textures
    
    setTexture(mapTexture);
    setLoading(false);
    console.log(`✅ Gorgeous Earth texture created for ${selectedLayer}`);
  };

  useEffect(() => {
    createGorgeousEarthTexture();
  }, [createGorgeousEarthTexture]);

  // Rotation animation
  useEffect(() => {
    if (!meshRef.current) return;
    
    let animationId: number;
    const animate = () => {
      if (meshRef.current) {
        meshRef.current.rotation.y += rotationSpeed;
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [rotationSpeed]);

  return (
    <>
      <group>
        <mesh ref={meshRef}>
          <sphereGeometry args={[2, 256, 128]} /> {/* Higher resolution geometry */}
          <meshPhongMaterial
            map={texture}
            transparent={false}
            opacity={1.0}
            shininess={100} // Enhanced shininess for water reflection
            specular={new THREE.Color(0x222222)} // Subtle specular highlights
            bumpScale={0.02} // Add subtle bump mapping effect
          />
        </mesh>
        
        {/* Enhanced atmospheric layer */}
        <mesh>
          <sphereGeometry args={[2.05, 64, 32]} />
          <meshBasicMaterial
            color={0x88BBFF}
            transparent={true}
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* Loading indicator */}
        {loading && (
          <Html center>
            <div className="text-white text-sm bg-black/70 px-3 py-2 rounded-lg border border-blue-500">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                Loading gorgeous Earth...
              </div>
            </div>
          </Html>
        )}
      </group>
    </>
  );
};