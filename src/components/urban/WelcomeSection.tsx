import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Globe, Activity, Shield, Lightbulb, TrendingUp } from 'lucide-react';
import heroImage from '@/assets/hero-urban-dashboard.jpg';

interface WelcomeSectionProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Activity,
    title: "Real-time Monitoring",
    description: "9 urban health indices tracked continuously"
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Satellite data from NASA and ESA missions"
  },
  {
    icon: Shield,
    title: "AI-Powered Analysis", 
    description: "Gemini AI provides smart insights"
  },
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description: "Forecast urban health trends"
  }
];

export function WelcomeSection({ onGetStarted }: WelcomeSectionProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Section - responsive */}
      <Card 
        className="relative overflow-hidden border-0 text-white min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] flex items-center"
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary-light) / 0.8) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <CardContent className="relative z-10 max-w-full sm:max-w-2xl lg:max-w-4xl p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <Badge className="bg-white/20 text-white border-white/30 text-xs sm:text-sm">
                <Zap className="w-3 h-3 mr-1" />
                Advanced Urban Intelligence
              </Badge>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
              Monitor Your City's
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Health & Sustainability
              </span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-white/90 leading-relaxed max-w-3xl">
              Comprehensive real-time analysis of urban environmental quality, 
              social well-being, and disaster preparedness using satellite data and AI insights.
            </p>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2 sm:pt-4">
              <Button 
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-white/90 shadow-glow w-full sm:w-auto min-h-[48px] text-base"
              >
                <Activity className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto min-h-[48px] text-base"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </CardContent>
        
        {/* Decorative elements - responsive positioning */}
        <div className="absolute top-10 right-10 sm:top-20 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-20 sm:bottom-20 sm:right-40 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white/10 rounded-full blur-xl"></div>
      </Card>

      {/* Features Grid - responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="bg-gradient-card shadow-card hover:shadow-interactive transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3 p-4 sm:p-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Section - responsive */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">9</div>
              <div className="text-sm text-muted-foreground">Urban Health Indices</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Real-time Monitoring</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Powered Analysis</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}