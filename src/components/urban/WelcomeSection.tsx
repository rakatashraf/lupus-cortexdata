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
    <div className="space-y-8">
      {/* Hero Section */}
      <Card 
        className="relative overflow-hidden border-0 text-white min-h-[400px] flex items-center"
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary-light) / 0.8) 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <CardContent className="relative z-10 max-w-2xl p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-white/20 text-white border-white/30">
                <Zap className="w-3 h-3 mr-1" />
                Advanced Urban Intelligence
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Monitor Your City's
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Health & Sustainability
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 leading-relaxed">
              Comprehensive real-time analysis of urban environmental quality, 
              social well-being, and disaster preparedness using satellite data and AI insights.
            </p>
            
            <div className="flex flex-wrap gap-3 pt-4">
              <Button 
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-white/90 shadow-glow"
              >
                <Activity className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </CardContent>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-40 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="bg-gradient-card shadow-card hover:shadow-interactive transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Section */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">9</div>
              <div className="text-sm text-muted-foreground">Urban Health Indices</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Real-time Monitoring</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">AI</div>
              <div className="text-sm text-muted-foreground">Powered Analysis</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}