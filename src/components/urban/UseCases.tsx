import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Star
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
    relevantIndices: ['CRI', 'UHVI', 'AQHI']
  },
  {
    id: 'housing',
    title: 'Housing Recommendations',
    description: 'Discover ideal neighborhoods for buying or renting based on safety, accessibility, and quality of life.',
    icon: <Home className="h-5 w-5" />,
    category: 'Housing',
    relevantIndices: ['CRI', 'UHVI', 'AQHI']
  },
  {
    id: 'urban-planning',
    title: 'Community Resource Planning',
    description: 'Identify communities needing better access to food, housing, or transportation.',
    icon: <Users className="h-5 w-5" />,
    category: 'Urban Planning',
    relevantIndices: ['CRI', 'UHVI']
  },
  {
    id: 'pollution',
    title: 'Pollution Assessment',
    description: 'Locate areas with air or water pollution issues and develop remediation strategies.',
    icon: <Droplets className="h-5 w-5" />,
    category: 'Environment',
    relevantIndices: ['AQHI', 'UHVI']
  },
  {
    id: 'healthcare',
    title: 'Healthcare Facility Planning',
    description: 'Determine optimal locations for new healthcare facilities based on population needs.',
    icon: <Hospital className="h-5 w-5" />,
    category: 'Healthcare',
    relevantIndices: ['CRI', 'UHVI']
  },
  {
    id: 'parks',
    title: 'Green Space Access',
    description: 'Identify communities lacking access to parks and recreational areas.',
    icon: <Trees className="h-5 w-5" />,
    category: 'Recreation',
    relevantIndices: ['UHVI', 'CRI']
  },
  {
    id: 'development',
    title: 'Housing Development',
    description: 'Find areas experiencing growth where new housing development is most needed.',
    icon: <Building2 className="h-5 w-5" />,
    category: 'Development',
    relevantIndices: ['CRI', 'UHVI']
  },
  {
    id: 'climate',
    title: 'Climate Resilience',
    description: 'Address extreme weather conditions with appropriate public health and safety measures.',
    icon: <Thermometer className="h-5 w-5" />,
    category: 'Climate',
    relevantIndices: ['UHVI', 'AQHI']
  },
  {
    id: 'habitat',
    title: 'Habitat Conservation',
    description: 'Assess impact of industrial growth on freshwater, coastal, and forest habitats.',
    icon: <Leaf className="h-5 w-5" />,
    category: 'Conservation',
    relevantIndices: ['AQHI', 'UHVI']
  },
  {
    id: 'agriculture',
    title: 'Agricultural Expansion',
    description: 'Identify suitable land for agricultural activities to support growing populations.',
    icon: <Wheat className="h-5 w-5" />,
    category: 'Agriculture',
    relevantIndices: ['UHVI', 'CRI']
  },
  {
    id: 'waste',
    title: 'Waste Management',
    description: 'Improve waste management systems based on population density and environmental factors.',
    icon: <Trash2 className="h-5 w-5" />,
    category: 'Infrastructure',
    relevantIndices: ['CRI', 'UHVI']
  },
  {
    id: 'energy',
    title: 'Energy Access',
    description: 'Address communities with limited access to electricity and energy sources.',
    icon: <Zap className="h-5 w-5" />,
    category: 'Energy',
    relevantIndices: ['CRI', 'UHVI']
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
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={lupusLogo} alt="Lupus Cortex" className="h-12 w-12" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Use Cases & Recommendations
            </h1>
            <p className="text-muted-foreground">
              Get AI-powered recommendations based on urban intelligence indices
            </p>
          </div>
        </div>
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
              <Card
                key={useCase.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedUseCase === useCase.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedUseCase(useCase.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-primary">{useCase.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{useCase.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {useCase.description}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {useCase.category}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
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