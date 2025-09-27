import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Home, 
  Users, 
  Droplets, 
  Hospital, 
  Trees, 
  Building2, 
  Thermometer, 
  Leaf, 
  Wheat, 
  Trash2, 
  Zap,
  Download,
  MapPin,
  Star,
  Info,
  UserCheck,
  Building
} from 'lucide-react';
import { n8nService } from '@/services/n8n-service';
import jsPDF from 'jspdf';
import lupusLogo from '@/assets/lupus-cortex-logo.png';

interface UseCase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  relevantIndices: string[];
  scenario: string;
  urbanPlannerUse: string;
  residentUse: string;
  detailedDescription: string;
}

interface Recommendation {
  area: string;
  rating: number;
  reasons: string[];
  coordinates: { lat: number; lng: number };
  indexScores: { [key: string]: number };
}

const USE_CASES: UseCase[] = [
  {
    id: 'university',
    title: 'University Selection',
    description: 'Find the best location to study based on education quality, safety, and livability indices.',
    icon: <GraduationCap className="h-5 w-5" />,
    category: 'Education',
    relevantIndices: ['CRI', 'UHVI', 'AQHI'],
    scenario: 'A high school graduate is looking for the perfect university location that offers not just good education but also a safe and healthy environment to live and study in.',
    urbanPlannerUse: 'Identify areas lacking educational infrastructure and determine optimal locations for new educational facilities based on safety, air quality, and urban heat resilience.',
    residentUse: 'Compare different university locations based on crime rates, air quality, and overall livability to make informed decisions about where to pursue higher education.',
    detailedDescription: 'This analysis considers multiple factors including campus safety (Crime Rate Index), environmental conditions (Air Quality Health Index), and urban comfort (Urban Heat Vulnerability Index) to recommend the most suitable study locations.'
  },
  {
    id: 'housing',
    title: 'Housing Recommendations',
    description: 'Discover ideal neighborhoods for buying or renting based on safety, accessibility, and quality of life.',
    icon: <Home className="h-5 w-5" />,
    category: 'Housing',
    relevantIndices: ['CRI', 'UHVI', 'AQHI'],
    scenario: 'A young family is relocating and needs to find a neighborhood that is safe for children, has good air quality, and comfortable living conditions year-round.',
    urbanPlannerUse: 'Analyze housing demand patterns and identify areas where residential development should be prioritized based on safety metrics, environmental conditions, and infrastructure capacity.',
    residentUse: 'Evaluate potential neighborhoods by comparing crime statistics, air quality levels, and climate resilience to find the best place to call home.',
    detailedDescription: 'Comprehensive neighborhood analysis that weighs safety statistics, environmental health factors, and climate comfort to guide housing decisions for families and individuals.'
  },
  {
    id: 'urban-planning',
    title: 'Community Resource Planning',
    description: 'Identify communities needing better access to food, housing, or transportation.',
    icon: <Users className="h-5 w-5" />,
    category: 'Urban Planning',
    relevantIndices: ['CRI', 'UHVI'],
    scenario: 'City officials need to allocate limited budget resources to improve community services and infrastructure where they are needed most.',
    urbanPlannerUse: 'Prioritize infrastructure investments by identifying underserved communities with high vulnerability indices and safety concerns that need immediate attention.',
    residentUse: 'Understand community needs in their area and advocate for better services by presenting data-driven evidence of local deficiencies.',
    detailedDescription: 'Data-driven community assessment that highlights areas lacking essential services and infrastructure, enabling targeted resource allocation and community development initiatives.'
  },
  {
    id: 'pollution',
    title: 'Pollution Assessment',
    description: 'Locate areas with air or water pollution issues and develop remediation strategies.',
    icon: <Droplets className="h-5 w-5" />,
    category: 'Environment',
    relevantIndices: ['AQHI', 'UHVI'],
    scenario: 'Environmental health officials are investigating pollution hotspots that may be affecting public health and need immediate intervention.',
    urbanPlannerUse: 'Identify pollution sources and affected areas to develop targeted remediation strategies and implement environmental protection measures.',
    residentUse: 'Stay informed about local pollution levels and take appropriate health precautions, or advocate for environmental improvements in their community.',
    detailedDescription: 'Environmental monitoring analysis that identifies pollution hotspots and assesses their impact on community health, supporting both remediation efforts and public awareness.'
  },
  {
    id: 'healthcare',
    title: 'Healthcare Facility Planning',
    description: 'Determine optimal locations for new healthcare facilities based on population needs.',
    icon: <Hospital className="h-5 w-5" />,
    category: 'Healthcare',
    relevantIndices: ['CRI', 'UHVI'],
    scenario: 'Healthcare administrators are planning to establish new clinics or hospitals and need to identify areas with the greatest need and accessibility.',
    urbanPlannerUse: 'Analyze healthcare accessibility gaps and demographic needs to strategically place medical facilities where they can serve the most vulnerable populations.',
    residentUse: 'Understand healthcare accessibility in their area and identify the nearest quality medical facilities, or advocate for better healthcare services.',
    detailedDescription: 'Healthcare accessibility analysis that considers population density, existing medical infrastructure, and community vulnerability to optimize healthcare service delivery.'
  },
  {
    id: 'parks',
    title: 'Green Space Access',
    description: 'Identify communities lacking access to parks and recreational areas.',
    icon: <Trees className="h-5 w-5" />,
    category: 'Recreation',
    relevantIndices: ['UHVI', 'CRI'],
    scenario: 'Community leaders want to improve quality of life by ensuring all residents have access to green spaces and recreational facilities.',
    urbanPlannerUse: 'Map green space deficiencies and plan new parks or recreational facilities in areas with high urban heat vulnerability and limited recreational options.',
    residentUse: 'Find nearby parks and recreational facilities, or organize community efforts to advocate for new green spaces in underserved areas.',
    detailedDescription: 'Green space accessibility assessment that identifies recreation deserts and evaluates the need for new parks based on population density and environmental factors.'
  },
  {
    id: 'development',
    title: 'Housing Development',
    description: 'Find areas experiencing growth where new housing development is most needed.',
    icon: <Building2 className="h-5 w-5" />,
    category: 'Development',
    relevantIndices: ['CRI', 'UHVI'],
    scenario: 'Real estate developers are looking for optimal locations for new housing projects that meet growing demand while ensuring resident safety and comfort.',
    urbanPlannerUse: 'Identify high-growth areas with adequate infrastructure capacity and favorable conditions for sustainable residential development.',
    residentUse: 'Stay informed about planned developments in their area and understand how new housing projects might affect their community and property values.',
    detailedDescription: 'Development opportunity analysis that balances growth potential with infrastructure capacity and environmental suitability for sustainable community expansion.'
  },
  {
    id: 'climate',
    title: 'Climate Resilience',
    description: 'Address extreme weather conditions with appropriate public health and safety measures.',
    icon: <Thermometer className="h-5 w-5" />,
    category: 'Climate',
    relevantIndices: ['UHVI', 'AQHI'],
    scenario: 'Emergency management officials need to prepare for extreme weather events and protect vulnerable populations from climate-related health risks.',
    urbanPlannerUse: 'Develop climate adaptation strategies and emergency response plans for areas with high vulnerability to extreme weather and poor air quality.',
    residentUse: 'Understand local climate risks and prepare for extreme weather events by knowing evacuation routes, cooling centers, and health precautions.',
    detailedDescription: 'Climate vulnerability assessment that identifies areas at risk from extreme weather and air quality issues, supporting both emergency preparedness and long-term adaptation planning.'
  },
  {
    id: 'habitat',
    title: 'Habitat Conservation',
    description: 'Assess impact of industrial growth on freshwater, coastal, and forest habitats.',
    icon: <Leaf className="h-5 w-5" />,
    category: 'Conservation',
    relevantIndices: ['AQHI', 'UHVI'],
    scenario: 'Environmental conservationists are evaluating the impact of urban development on local ecosystems and wildlife habitats.',
    urbanPlannerUse: 'Balance development needs with environmental protection by identifying sensitive habitats that require conservation measures or development restrictions.',
    residentUse: 'Learn about local ecosystems and participate in conservation efforts to protect natural habitats in their community.',
    detailedDescription: 'Environmental impact assessment that evaluates how urban development affects local ecosystems and identifies priority areas for habitat conservation and restoration.'
  },
  {
    id: 'agriculture',
    title: 'Agricultural Expansion',
    description: 'Identify suitable land for agricultural activities to support growing populations.',
    icon: <Wheat className="h-5 w-5" />,
    category: 'Agriculture',
    relevantIndices: ['UHVI', 'CRI'],
    scenario: 'Agricultural planners need to find suitable land for farming that can support food security while considering environmental and safety factors.',
    urbanPlannerUse: 'Identify areas suitable for agricultural development that balance food production needs with environmental sustainability and safety considerations.',
    residentUse: 'Support local food systems by understanding agricultural opportunities in their region and participating in community gardening or farmers markets.',
    detailedDescription: 'Agricultural suitability analysis that considers environmental conditions, land use patterns, and safety factors to identify optimal areas for sustainable food production.'
  },
  {
    id: 'waste',
    title: 'Waste Management',
    description: 'Improve waste management systems based on population density and environmental factors.',
    icon: <Trash2 className="h-5 w-5" />,
    category: 'Infrastructure',
    relevantIndices: ['CRI', 'UHVI'],
    scenario: 'Waste management officials are optimizing collection routes and facility locations to improve efficiency while minimizing environmental and health impacts.',
    urbanPlannerUse: 'Optimize waste management infrastructure by analyzing population density, waste generation patterns, and environmental impact to improve service efficiency.',
    residentUse: 'Understand local waste management services and participate in recycling programs or advocate for better waste management in their community.',
    detailedDescription: 'Waste management optimization analysis that considers population density, service accessibility, and environmental impact to improve waste collection and processing efficiency.'
  },
  {
    id: 'energy',
    title: 'Energy Access',
    description: 'Address communities with limited access to electricity and energy sources.',
    icon: <Zap className="h-5 w-5" />,
    category: 'Energy',
    relevantIndices: ['CRI', 'UHVI'],
    scenario: 'Energy planners are working to ensure reliable electricity access for all communities while considering safety and environmental factors.',
    urbanPlannerUse: 'Identify energy access gaps and plan infrastructure improvements to ensure reliable electricity supply for underserved communities.',
    residentUse: 'Stay informed about energy reliability in their area and explore renewable energy options or energy efficiency programs available to them.',
    detailedDescription: 'Energy accessibility analysis that identifies communities with limited electricity access and evaluates opportunities for infrastructure improvements and renewable energy deployment.'
  }
];

interface UseCasesProps {
  latitude?: number;
  longitude?: number;
}

export const UseCases: React.FC<UseCasesProps> = ({ 
  latitude = 23.8103, 
  longitude = 90.4125 
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState<string>('');
  const [location, setLocation] = useState(`${latitude}, ${longitude}`);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateRecommendations = useCallback(async () => {
    if (!selectedUseCase) {
      toast({
        title: "Error",
        description: "Please select a use case",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Parse location coordinates
      const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
      
      // Get health data for the area
      const healthData = await n8nService.getDashboardData(lat, lng);
      
      // Generate recommendations based on use case and indices
      const useCase = USE_CASES.find(uc => uc.id === selectedUseCase);
      if (!useCase) return;

      // Convert indices object to array
      const indicesArray = Object.values(healthData.indices);

      // Create mock recommendations with real data
      const mockRecommendations: Recommendation[] = [
        {
          area: `Area A (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round(healthData.overall_score / 20))),
          reasons: generateReasons(useCase, indicesArray),
          coordinates: { lat, lng },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = index.total_score;
            return acc;
          }, {} as { [key: string]: number })
        },
        {
          area: `Area B (${(lat + 0.01).toFixed(4)}, ${(lng + 0.01).toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round((healthData.overall_score + 10) / 20))),
          reasons: generateReasons(useCase, indicesArray, true),
          coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = Math.min(100, index.total_score + 5);
            return acc;
          }, {} as { [key: string]: number })
        },
        {
          area: `Area C (${(lat - 0.01).toFixed(4)}, ${(lng - 0.01).toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round((healthData.overall_score - 5) / 20))),
          reasons: generateReasons(useCase, indicesArray, false, true),
          coordinates: { lat: lat - 0.01, lng: lng - 0.01 },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = Math.max(0, index.total_score - 3);
            return acc;
          }, {} as { [key: string]: number })
        }
      ];

      setRecommendations(mockRecommendations.sort((a, b) => b.rating - a.rating));
      
      toast({
        title: "Recommendations Generated",
        description: `Found ${mockRecommendations.length} recommendations for ${useCase.title}`,
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedUseCase, location, toast]);

  const generateReasons = (useCase: UseCase, indices: any[], isGood = false, isBad = false) => {
    const reasons: string[] = [];
    
    switch (useCase.id) {
      case 'university':
        if (isGood) {
          reasons.push('Excellent air quality for student health');
          reasons.push('Low crime rates ensure campus safety');
          reasons.push('Strong urban heat resilience');
        } else if (isBad) {
          reasons.push('Higher pollution levels may affect study environment');
          reasons.push('Safety concerns in the area');
        } else {
          reasons.push('Moderate environmental conditions');
          reasons.push('Acceptable safety levels');
        }
        break;
      case 'housing':
        if (isGood) {
          reasons.push('Low crime rates provide safe living environment');
          reasons.push('Good air quality for family health');
          reasons.push('Excellent urban heat management');
        } else if (isBad) {
          reasons.push('Higher crime rates may affect property values');
          reasons.push('Air quality concerns for residents');
        } else {
          reasons.push('Balanced living conditions');
          reasons.push('Moderate safety and environmental factors');
        }
        break;
      default:
        if (isGood) {
          reasons.push('Favorable environmental conditions');
          reasons.push('Strong community resilience indicators');
        } else if (isBad) {
          reasons.push('Environmental challenges present');
          reasons.push('May require additional infrastructure support');
        } else {
          reasons.push('Standard conditions for this use case');
          reasons.push('Meets basic requirements');
        }
    }
    
    return reasons;
  };

  const downloadPDF = useCallback(async (recommendation: Recommendation) => {
    try {
      const useCase = USE_CASES.find(uc => uc.id === selectedUseCase);
      
      // Create PDF
      const doc = new jsPDF();
      
      // Header with logo
      doc.setFontSize(20);
      doc.setTextColor(34, 139, 34); // Primary green color
      doc.text('LUPUS CORTEX', 20, 30);
      doc.text('RECOMMENDATION REPORT', 20, 45);
      
      // Seal/Badge
      doc.setFontSize(14);
      doc.setTextColor(0, 100, 0);
      doc.text('✓ LUPUS RECOMMENDED', 20, 60);
      
      // Rating stars
      const stars = '★'.repeat(recommendation.rating) + '☆'.repeat(5 - recommendation.rating);
      doc.setFontSize(16);
      doc.setTextColor(255, 215, 0); // Gold color for stars
      doc.text(`${stars} ${recommendation.rating}/5`, 20, 75);
      
      // Use case and area info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Use Case: ${useCase?.title || 'Unknown'}`, 20, 95);
      doc.text(`Area: ${recommendation.area}`, 20, 110);
      doc.text(`Coordinates: ${recommendation.coordinates.lat}, ${recommendation.coordinates.lng}`, 20, 125);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 140);
      
      // Index Scores
      doc.setFontSize(14);
      doc.setTextColor(34, 139, 34);
      doc.text('INDEX SCORES', 20, 165);
      
      let yPos = 180;
      Object.entries(recommendation.indexScores).forEach(([index, score]) => {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${index}: ${score.toFixed(1)}/100`, 25, yPos);
        yPos += 15;
      });
      
      // Recommendations
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(34, 139, 34);
      doc.text('KEY FACTORS', 20, yPos);
      
      yPos += 15;
      recommendation.reasons.forEach((reason, i) => {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(`${i + 1}. ${reason}`, 170);
        doc.text(lines, 25, yPos);
        yPos += lines.length * 12;
      });
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by Lupus Cortex Urban Intelligence Dashboard', 20, pageHeight - 30);
      doc.text('© 2024 Lupus Cortex. All rights reserved.', 20, pageHeight - 20);
      doc.text('For more analysis, visit: https://lupus-cortex.lovable.app', 20, pageHeight - 10);
      
      // Save PDF
      doc.save(`lupus-recommendation-${recommendation.area.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);

      toast({
        title: "Download Complete",
        description: "Your recommendation report has been downloaded as PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [selectedUseCase, toast]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Use Cases & Recommendations
        </h1>
        <p className="text-muted-foreground">
          Get AI-powered recommendations based on urban intelligence indices
        </p>
      </div>

      {/* Use Case Selection */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Select Your Use Case</CardTitle>
          <CardDescription>
            Choose what type of recommendation you need based on urban data analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {USE_CASES.map((useCase) => (
              <Dialog key={useCase.id}>
                <DialogTrigger asChild>
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedUseCase === useCase.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-primary">{useCase.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{useCase.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {useCase.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {useCase.category}
                            </Badge>
                            <Info className="h-3 w-3 text-primary" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className="text-primary">{useCase.icon}</div>
                      {useCase.title}
                    </DialogTitle>
                    <DialogDescription>
                      {useCase.detailedDescription}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Real-World Scenario</h4>
                      <p className="text-muted-foreground">{useCase.scenario}</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">For Urban Planners</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{useCase.urbanPlannerUse}</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">For Residents</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{useCase.residentUse}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Relevant Indices</h4>
                      <div className="flex gap-2">
                        {useCase.relevantIndices.map((index) => (
                          <Badge key={index} variant="outline" className="text-primary border-primary">
                            {index}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => setSelectedUseCase(useCase.id)}
                        className="w-full sm:w-auto"
                      >
                        Select This Use Case
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="location">Location (Latitude, Longitude)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="23.8103, 90.4125"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateRecommendations} 
                disabled={loading || !selectedUseCase}
                className="min-w-[140px]"
              >
                {loading ? 'Analyzing...' : 'Get Recommendations'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recommendations</h2>
          <div className="grid gap-4">
            {recommendations.map((rec, index) => (
              <Card key={index} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{rec.area}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < rec.rating
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`font-medium ${getRatingColor(rec.rating)}`}>
                            {rec.rating}/5
                          </span>
                          <Badge variant="outline" className="text-primary border-primary">
                            LUPUS RECOMMENDED
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadPDF(rec)}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Index Scores</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(rec.indexScores).map(([index, score]) => (
                          <div key={index} className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {score.toFixed(0)}
                            </div>
                            <div className="text-xs text-muted-foreground">{index}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Key Factors</h4>
                      <ul className="space-y-1">
                        {rec.reasons.map((reason, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};