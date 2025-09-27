import React, { useRef, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, Cylinder, Text, PerspectiveCamera } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Box as BoxIcon, 
  Circle, 
  Cylinder as CylinderIcon, 
  Building, 
  TreePine, 
  Waves, 
  RotateCcw, 
  Move3D, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import * as THREE from 'three';

interface SceneObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'building' | 'tree' | 'water';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  visible: boolean;
}

interface BuildingProps extends SceneObject {
  height?: number;
}

// 3D Building Component
function Building3D({ position, rotation, scale, color, height = 2 }: BuildingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, height, 1]} />
      <meshStandardMaterial color={hovered ? '#ff6b6b' : color} />
    </mesh>
  );
}

// Tree Component
function Tree3D({ position, rotation, scale, color }: SceneObject) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Crown */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Water Feature Component
function Water3D({ position, rotation, scale, color }: SceneObject) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <cylinderGeometry args={[1, 1, 0.1, 8]} />
      <meshStandardMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

// Generic 3D Object Component
function SceneObject3D({ object }: { object: SceneObject }) {
  if (!object.visible) return null;

  switch (object.type) {
    case 'box':
      return (
        <Box position={object.position} rotation={object.rotation} scale={object.scale}>
          <meshStandardMaterial color={object.color} />
        </Box>
      );
    case 'sphere':
      return (
        <Sphere position={object.position} rotation={object.rotation} scale={object.scale}>
          <meshStandardMaterial color={object.color} />
        </Sphere>
      );
    case 'cylinder':
      return (
        <Cylinder position={object.position} rotation={object.rotation} scale={object.scale}>
          <meshStandardMaterial color={object.color} />
        </Cylinder>
      );
    case 'building':
      return <Building3D {...object} height={2} />;
    case 'tree':
      return <Tree3D {...object} />;
    case 'water':
      return <Water3D {...object} />;
    default:
      return null;
  }
}

// Loading Component
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-white">Loading 3D Scene...</p>
      </div>
    </div>
  );
}

interface ViewerToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onAddObject: (type: SceneObject['type']) => void;
  onResetCamera: () => void;
  onClearScene: () => void;
  objects: SceneObject[];
  onToggleVisibility: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onDuplicateObject: (id: string) => void;
}

// Toolbar Component
function ViewerToolbar({ 
  selectedTool, 
  onToolSelect, 
  onAddObject, 
  onResetCamera, 
  onClearScene,
  objects,
  onToggleVisibility,
  onDeleteObject,
  onDuplicateObject
}: ViewerToolbarProps) {
  const objectTypes = [
    { type: 'building', label: 'Building', icon: Building, color: '#3b82f6' },
    { type: 'tree', label: 'Tree', icon: TreePine, color: '#22c55e' },
    { type: 'water', label: 'Water', icon: Waves, color: '#06b6d4' },
    { type: 'box', label: 'Box', icon: BoxIcon, color: '#8b5cf6' },
    { type: 'sphere', label: 'Sphere', icon: Circle, color: '#f59e0b' },
    { type: 'cylinder', label: 'Cylinder', icon: CylinderIcon, color: '#ef4444' },
  ];

  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Tool Selection */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Tools:</Badge>
              {['select', 'move', 'rotate', 'scale'].map((tool) => (
                <Button
                  key={tool}
                  size="sm"
                  variant={selectedTool === tool ? "default" : "outline"}
                  onClick={() => onToolSelect(tool)}
                  className="h-8 px-3"
                >
                  {tool === 'move' && <Move3D className="h-4 w-4" />}
                  {tool === 'rotate' && <RotateCw className="h-4 w-4" />}
                  {tool === 'scale' && <ZoomIn className="h-4 w-4" />}
                  {tool === 'select' && 'Select'}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Object Creation */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Add Objects:</Badge>
              {objectTypes.map((objType) => {
                const Icon = objType.icon;
                return (
                  <Button
                    key={objType.type}
                    size="sm"
                    variant="outline"
                    onClick={() => onAddObject(objType.type as SceneObject['type'])}
                    className="h-8 px-3"
                  >
                    <Icon className="h-4 w-4 mr-1" style={{ color: objType.color }} />
                    {objType.label}
                  </Button>
                );
              })}
            </div>

            <Separator />

            {/* Scene Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary" className="text-xs">Scene:</Badge>
              <Button size="sm" variant="outline" onClick={onResetCamera} className="h-8">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset View
              </Button>
              <Button size="sm" variant="outline" onClick={onClearScene} className="h-8">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
              <Badge variant="outline" className="ml-auto">
                Objects: {objects.length}
              </Badge>
            </div>

            {/* Object List (if any objects exist) */}
            {objects.length > 0 && (
              <>
                <Separator />
                <div className="max-h-32 overflow-y-auto">
                  <Badge variant="secondary" className="text-xs mb-2">Scene Objects:</Badge>
                  <div className="space-y-1">
                    {objects.map((obj, index) => (
                      <div key={obj.id} className="flex items-center gap-2 p-1 rounded bg-muted/50">
                        <span className="text-xs flex-1">{obj.type} {index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggleVisibility(obj.id)}
                          className="h-6 w-6 p-0"
                        >
                          {obj.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicateObject(obj.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteObject(obj.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main 3D Viewer Component
export function ThreeDViewer() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedTool, setSelectedTool] = useState('select');
  const orbitRef = useRef<any>();

  const addObject = useCallback((type: SceneObject['type']) => {
    const colors = {
      building: '#3b82f6',
      tree: '#22c55e',
      water: '#06b6d4',
      box: '#8b5cf6',
      sphere: '#f59e0b',
      cylinder: '#ef4444'
    };

    const newObject: SceneObject = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: [
        (Math.random() - 0.5) * 10,
        0,
        (Math.random() - 0.5) * 10
      ],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: colors[type],
      visible: true
    };

    setObjects(prev => [...prev, newObject]);
  }, []);

  const resetCamera = useCallback(() => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
  }, []);

  const clearScene = useCallback(() => {
    setObjects([]);
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ));
  }, []);

  const deleteObject = useCallback((id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
  }, []);

  const duplicateObject = useCallback((id: string) => {
    const objToDuplicate = objects.find(obj => obj.id === id);
    if (objToDuplicate) {
      const newObject: SceneObject = {
        ...objToDuplicate,
        id: `${objToDuplicate.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: [
          objToDuplicate.position[0] + 1,
          objToDuplicate.position[1],
          objToDuplicate.position[2] + 1
        ]
      };
      setObjects(prev => [...prev, newObject]);
    }
  }, [objects]);

  return (
    <div className="relative w-full h-full">
      <ViewerToolbar
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        onAddObject={addObject}
        onResetCamera={resetCamera}
        onClearScene={clearScene}
        objects={objects}
        onToggleVisibility={toggleVisibility}
        onDeleteObject={deleteObject}
        onDuplicateObject={duplicateObject}
      />
      
      <Suspense fallback={<LoadingFallback />}>
        <Canvas className="w-full h-full">
          <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={60} />
          <OrbitControls 
            ref={orbitRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {/* Scene Objects */}
          {objects.map(object => (
            <SceneObject3D key={object.id} object={object} />
          ))}

          {/* Ground Grid */}
          <Grid 
            args={[20, 20]} 
            position={[0, -0.01, 0]}
            cellColor="#444"
            sectionColor="#666"
            fadeDistance={30}
          />

          {/* Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>

          {/* Sample Buildings for Demo */}
          <Building3D
            id="demo-building-1"
            type="building"
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={[1, 1, 1]}
            color="#3b82f6"
            visible={true}
            height={3}
          />
          <Building3D
            id="demo-building-2"
            type="building"
            position={[3, 0, 0]}
            rotation={[0, 0, 0]}
            scale={[1, 1, 1]}
            color="#8b5cf6"
            visible={true}
            height={4}
          />
          <Tree3D
            id="demo-tree-1"
            type="tree"
            position={[-2, 0, 2]}
            rotation={[0, 0, 0]}
            scale={[1, 1, 1]}
            color="#22c55e"
            visible={true}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}