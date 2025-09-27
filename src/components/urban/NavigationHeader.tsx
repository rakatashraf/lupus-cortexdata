import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, BarChart3, Map, Bot, Info, Box, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import lupusLogo from '@/assets/lupus-cortex-logo.png';

interface NavigationHeaderProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  currentLocation?: { latitude: number; longitude: number };
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'City health overview' },
  { id: 'map', label: 'Interactive Map', icon: Map, description: 'Location selection & analysis' },
  { id: 'charts', label: 'Data Visualization', icon: BarChart3, description: 'Trends & insights' },
  { id: 'chatbot', label: 'AI Assistant', icon: Bot, description: 'Smart urban guidance' },
  { id: 'simulation', label: '3D Simulation', icon: Box, description: 'Urban planning & design' },
  { id: 'usecases', label: 'Use Cases', icon: Lightbulb, description: 'Recommendations & reports' },
];

export function NavigationHeader({ 
  currentSection, 
  onSectionChange, 
  currentLocation 
}: NavigationHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header 
      className="sticky top-0 z-50 w-full border-b-2 border-primary/20 bg-gradient-to-r from-background via-background/95 to-background backdrop-blur-md shadow-xl"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={lupusLogo} 
              alt="Lupus Cortex" 
              className="h-16 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 border",
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105" 
                      : "text-foreground hover:text-primary hover:bg-primary/5 border-transparent hover:border-primary/20 hover:shadow-md"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Status Badge and Location */}
          <div className="hidden lg:flex items-center gap-3">
            {currentLocation && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 transition-colors">
                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
              </Badge>
            )}
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 hover:bg-success/20 transition-colors">
              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
              System Active
            </Badge>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background">
              <div className="mt-6 space-y-4">
                <div className="text-center pb-4 border-b border-border">
                  <img 
                    src={lupusLogo} 
                    alt="Lupus Cortex" 
                    className="h-8 w-auto mx-auto mb-2"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                  <p className="text-sm text-muted-foreground">Advanced Analytics Platform</p>
                </div>
                
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-70">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
                
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div className="font-medium">System Status</div>
                      <div className="text-xs text-muted-foreground">All services operational</div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}