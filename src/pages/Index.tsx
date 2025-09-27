import { HealthDashboard } from '@/components/urban/HealthDashboard';
import { InteractiveMap } from '@/components/urban/InteractiveMap';
import { DataVisualization } from '@/components/urban/DataVisualization';
import { AIChatbot } from '@/components/urban/AIChatbot';
import { NavigationHeader } from '@/components/urban/NavigationHeader';
import { WelcomeSection } from '@/components/urban/WelcomeSection';
import { Simulation3D } from '@/components/urban/Simulation3D';
import { UseCases } from '@/components/urban/UseCases';
import { useState, useCallback, useEffect } from 'react';
import { MapSelectionBounds } from '@/types/urban-indices';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [currentSection, setCurrentSection] = useState('welcome');
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 23.8103,
    longitude: 90.4125
  });
  const [hasStarted, setHasStarted] = useState(false);
  const { toast } = useToast();

  // Auto-detect user location on first load
  useEffect(() => {
    if ('geolocation' in navigator && !hasStarted) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast({
            title: "Location Detected",
            description: `Using your current location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Continue with default location (Dhaka, Bangladesh)
        }
      );
    }
  }, [hasStarted, toast]);

  const handleGetStarted = useCallback(() => {
    setHasStarted(true);
    setCurrentSection('dashboard');
  }, []);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setCurrentLocation({ latitude: lat, longitude: lng });
    toast({
      title: "Location Updated",
      description: `New coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    });
  }, [toast]);

  const handleAreaSelect = useCallback((bounds: MapSelectionBounds) => {
    // Calculate center of selected area
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    setCurrentLocation({ latitude: centerLat, longitude: centerLng });
    toast({
      title: "Area Selected",
      description: `Analysis area selected. Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`,
    });
  }, [toast]);

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'welcome':
        return <WelcomeSection onGetStarted={handleGetStarted} />;
      case 'dashboard':
        return (
          <HealthDashboard
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            onLocationUpdate={handleLocationSelect}
          />
        );
      case 'map':
        return (
          <InteractiveMap
            initialLat={currentLocation.latitude}
            initialLng={currentLocation.longitude}
            onLocationSelect={handleLocationSelect}
            onAreaSelect={handleAreaSelect}
          />
        );
      case 'charts':
        return (
          <DataVisualization
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
          />
        );
      case 'chatbot':
        return (
          <AIChatbot
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
          />
        );
      case 'simulation':
        return <Simulation3D onLocationSelect={handleLocationSelect} />;
      case 'usecases':
        return (
          <UseCases
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
          />
        );
      default:
        return <WelcomeSection onGetStarted={handleGetStarted} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-ambient">
      {currentSection !== 'welcome' && (
        <NavigationHeader
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          currentLocation={currentLocation}
        />
      )}
      
      <main className={`${currentSection === 'welcome' ? 'container mx-auto px-4 py-8' : 'container mx-auto px-4 py-8'}`}>
        {renderCurrentSection()}
      </main>

      {/* Footer positioned exactly like in the reference image - at absolute bottom */}
      <div className="w-full bg-teal-100/60 py-3 mt-8">
        <div className="text-center">
          <div className="text-xs text-teal-600">
            © 2024 LUPUS CORTEX - Urban Intelligence Solutions | www.lupus-cortex.com
          </div>
          <div className="text-xs text-teal-600 mt-1">
            Proprietary analysis - authorized use only.
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default Index;
