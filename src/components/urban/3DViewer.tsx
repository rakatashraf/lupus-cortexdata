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
  EyeOff,
  Menu,
  X
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

export interface ViewerToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onAddObject: (type: SceneObject['type']) => void;
  onResetCamera: () => void;
  onClearScene: () => void;
  objects: SceneObject[];
  onToggleVisibility: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onDuplicateObject: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Toolbar Component
export function ViewerToolbar({ 
  selectedTool, 
  onToolSelect, 
  onAddObject, 
  onResetCamera, 
  onClearScene,
  objects,
  onToggleVisibility,
  onDeleteObject,
  onDuplicateObject,
  isCollapsed = false,
  onToggleCollapse
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
    <div className="relative">
      {/* Hamburger Menu Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={onToggleCollapse}
        className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm border shadow-sm"
      >
        {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>

      {/* Collapsible Toolbar Content */}
      {!isCollapsed && (
        <Card className="glass-card mt-2 max-w-lg">
          <CardContent className="p-3">
            <div className="flex flex-col gap-3">
                {/* Tool Selection */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">Tools:</Badge>
                  {['select', 'move', 'rotate', 'scale'].map((tool) => (
                    <Button
                      key={tool}
                      size="sm"
                      variant={selectedTool === tool ? "default" : "outline"}
                      onClick={() => onToolSelect(tool)}
                      className="h-7 px-2 text-xs"
                    >
                      {tool === 'move' && <Move3D className="h-3 w-3" />}
                      {tool === 'rotate' && <RotateCw className="h-3 w-3" />}
                      {tool === 'scale' && <ZoomIn className="h-3 w-3" />}
                      {tool === 'select' && 'Select'}
                    </Button>
                  ))}
                </div>

                <Separator />

                {/* Object Creation */}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">Add Objects:</Badge>
                  {objectTypes.map((objType) => {
                    const Icon = objType.icon;
                    return (
                      <Button
                        key={objType.type}
                        size="sm"
                        variant="outline"
                        onClick={() => onAddObject(objType.type as SceneObject['type'])}
                        className="h-7 px-2 text-xs"
                      >
                        <Icon className="h-3 w-3 mr-1" style={{ color: objType.color }} />
                        {objType.label}
                      </Button>
                    );
                  })}
                </div>

                <Separator />

                {/* Scene Controls */}
                <div className="flex flex-wrap gap-1 items-center">
                  <Badge variant="secondary" className="text-xs">Scene:</Badge>
                  <Button size="sm" variant="outline" onClick={onResetCamera} className="h-7 px-2 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button size="sm" variant="outline" onClick={onClearScene} className="h-7 px-2 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Badge variant="outline" className="ml-auto text-xs">
                    Objects: {objects.length}
                  </Badge>
                </div>

                {/* Object List (if any objects exist) */}
                {objects.length > 0 && (
                  <>
                    <Separator />
                    <div className="max-h-24 overflow-y-auto">
                      <Badge variant="secondary" className="text-xs mb-1">Scene Objects:</Badge>
                      <div className="space-y-1">
                        {objects.map((obj, index) => (
                          <div key={obj.id} className="flex items-center gap-1 p-1 rounded bg-muted/50">
                            <span className="text-xs flex-1">{obj.type} {index + 1}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onToggleVisibility(obj.id)}
                              className="h-5 w-5 p-0"
                            >
                              {obj.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDuplicateObject(obj.id)}
                              className="h-5 w-5 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteObject(obj.id)}
                              className="h-5 w-5 p-0"
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
      )}
    </div>
  );
}

// Main 3D Viewer Component  
interface ThreeDViewerProps {
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

export function ThreeDViewer({
  selectedTool,
  onToolSelect,
  onAddObject: onAddObjectProp,
  onResetCamera: onResetCameraProp,
  onClearScene: onClearSceneProp,
  objects: objectsProp,
  onToggleVisibility: onToggleVisibilityProp,
  onDeleteObject: onDeleteObjectProp,
  onDuplicateObject: onDuplicateObjectProp
}: ThreeDViewerProps) {
  const [objects, setObjects] = useState<SceneObject[]>(objectsProp);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(true);
  const orbitRef = useRef<any>();

  // Use the passed props but fall back to internal state for callback functions
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
    onAddObjectProp?.(type);
  }, [onAddObjectProp]);

  const resetCamera = useCallback(() => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
    onResetCameraProp?.();
  }, [onResetCameraProp]);

  const clearScene = useCallback(() => {
    setObjects([]);
    onClearSceneProp?.();
  }, [onClearSceneProp]);

  const toggleVisibility = useCallback((id: string) => {
    setObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, visible: !obj.visible } : obj
    ));
    onToggleVisibilityProp?.(id);
  }, [onToggleVisibilityProp]);

  const deleteObject = useCallback((id: string) => {
    setObjects(prev => prev.filter(obj => obj.id !== id));
    onDeleteObjectProp?.(id);
  }, [onDeleteObjectProp]);

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
      onDuplicateObjectProp?.(id);
    }
  }, [objects, onDuplicateObjectProp]);

  return (
    <div className="relative w-full h-full">
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
      
      {/* Collapsible toolbar positioned inside the canvas */}
      <div className="absolute top-4 left-4 z-10">
        <ViewerToolbar
          selectedTool={selectedTool}
          onToolSelect={onToolSelect}
          onAddObject={addObject}
          onResetCamera={resetCamera}
          onClearScene={clearScene}
          objects={objects}
          onToggleVisibility={toggleVisibility}
          onDeleteObject={deleteObject}
          onDuplicateObject={duplicateObject}
          isCollapsed={isToolbarCollapsed}
          onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
        />
      </div>
    </div>
  );
}