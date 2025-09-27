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
import lupusLogoPdf from '@/assets/lupus-cortex-logo-pdf.png';

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
  const [userDescription, setUserDescription] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateRecommendations = useCallback(async () => {
    if (!userDescription.trim()) {
      toast({
        title: "Error",
        description: "Please describe what kind of recommendation you need",
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
      
      // Use ALL indices from the dashboard for comprehensive evaluation
      const indicesArray = Object.values(healthData.indices);

      // Create comprehensive recommendations based on all indices and user description
      const mockRecommendations: Recommendation[] = [
        {
          area: `Primary Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round(healthData.overall_score / 20))),
          reasons: generateCustomReasons(userDescription, indicesArray, healthData.overall_score),
          coordinates: { lat, lng },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = index.total_score;
            return acc;
          }, {} as { [key: string]: number })
        },
        {
          area: `Alternative A (${(lat + 0.01).toFixed(4)}, ${(lng + 0.01).toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round((healthData.overall_score + 15) / 20))),
          reasons: generateCustomReasons(userDescription, indicesArray, healthData.overall_score + 15, true),
          coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = Math.min(100, index.total_score + 8);
            return acc;
          }, {} as { [key: string]: number })
        },
        {
          area: `Alternative B (${(lat - 0.01).toFixed(4)}, ${(lng - 0.01).toFixed(4)})`,
          rating: Math.min(5, Math.max(1, Math.round((healthData.overall_score - 8) / 20))),
          reasons: generateCustomReasons(userDescription, indicesArray, healthData.overall_score - 8, false, true),
          coordinates: { lat: lat - 0.01, lng: lng - 0.01 },
          indexScores: indicesArray.reduce((acc, index) => {
            acc[index.index_name] = Math.max(0, index.total_score - 5);
            return acc;
          }, {} as { [key: string]: number })
        }
      ];

      setRecommendations(mockRecommendations.sort((a, b) => b.rating - a.rating));
      
      toast({
        title: "Comprehensive Evaluation Complete",
        description: `Generated ${mockRecommendations.length} location recommendations based on all urban indices`,
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
  }, [userDescription, location, toast]);

  const generateCustomReasons = (description: string, indices: any[], score: number, isGood = false, isBad = false) => {
    const reasons: string[] = [];
    
    // Analyze user description for keywords and context
    const lowerDesc = description.toLowerCase();
    
    // Determine relevance of each index based on scenario
    const isRelevantForScenario = (indexName: string, description: string) => {
      const desc = description.toLowerCase();
      
      switch (indexName) {
        case 'CRI':
          // Crime rate is relevant for most scenarios except pure environmental assessments
          if (desc.includes('pollution only') || desc.includes('environmental monitoring') || desc.includes('air quality only')) {
            return false;
          }
          return true;
          
        case 'AQHI':
          // Air quality is relevant for health, living, but less for pure security or infrastructure
          if (desc.includes('security only') || desc.includes('crime prevention') || desc.includes('police') || desc.includes('infrastructure maintenance')) {
            return false;
          }
          return true;
          
        case 'UHVI':
          // Heat vulnerability relevant for living, health, but less for underground facilities or industrial
          if (desc.includes('underground') || desc.includes('basement') || desc.includes('indoor only') || desc.includes('warehouse')) {
            return false;
          }
          return true;
          
        default:
          return true;
      }
    };
    
    // Base analysis on all indices with relevance check
    indices.forEach(index => {
      const indexScore = isGood ? Math.min(100, index.total_score + 8) : 
                       isBad ? Math.max(0, index.total_score - 5) : index.total_score;
      
      const isRelevant = isRelevantForScenario(index.index_name, description);
      
      if (index.index_name === 'CRI') {
        if (!isRelevant) {
          reasons.push(`Crime Rate Index: Not applicable for this scenario`);
        } else if (indexScore > 70) {
          reasons.push(`Excellent safety conditions (Crime Rate Index: ${indexScore.toFixed(1)})`);
        } else if (indexScore > 50) {
          reasons.push(`Moderate safety levels (Crime Rate Index: ${indexScore.toFixed(1)})`);
        } else {
          reasons.push(`⚠️ Safety concerns present (Crime Rate Index: ${indexScore.toFixed(1)}) - Not recommended`);
        }
      }
      
      if (index.index_name === 'AQHI') {
        if (!isRelevant) {
          reasons.push(`Air Quality Index: Not applicable for this scenario`);
        } else if (indexScore > 70) {
          reasons.push(`Superior air quality for health (Air Quality Index: ${indexScore.toFixed(1)})`);
        } else if (indexScore > 50) {
          reasons.push(`Acceptable air quality levels (Air Quality Index: ${indexScore.toFixed(1)})`);
        } else {
          reasons.push(`⚠️ Air quality requires attention (Air Quality Index: ${indexScore.toFixed(1)}) - Health risk present`);
        }
      }
      
      if (index.index_name === 'UHVI') {
        if (!isRelevant) {
          reasons.push(`Heat Vulnerability Index: Not applicable for this scenario`);
        } else if (indexScore > 70) {
          reasons.push(`High resilience to urban heat (Heat Vulnerability: ${indexScore.toFixed(1)})`);
        } else if (indexScore > 50) {
          reasons.push(`Moderate climate comfort (Heat Vulnerability: ${indexScore.toFixed(1)})`);
        } else {
          reasons.push(`⚠️ Climate adaptation needed (Heat Vulnerability: ${indexScore.toFixed(1)}) - Not suitable for heat-sensitive activities`);
        }
      }
    });

    // Add context-specific recommendations based on user description
    if (lowerDesc.includes('family') || lowerDesc.includes('children')) {
      const hasGoodSafety = indices.find(i => i.index_name === 'CRI')?.total_score > 60;
      const hasGoodAir = indices.find(i => i.index_name === 'AQHI')?.total_score > 60;
      
      if (hasGoodSafety && hasGoodAir) {
        reasons.push('✅ Excellent for family with children - Safe and healthy environment');
      } else if (!hasGoodSafety) {
        reasons.push('❌ Not recommended for families - Safety concerns present');
      } else if (!hasGoodAir) {
        reasons.push('⚠️ Limited suitability for families - Air quality concerns');
      }
    }
    
    if (lowerDesc.includes('business') || lowerDesc.includes('commercial')) {
      const hasGoodSafety = indices.find(i => i.index_name === 'CRI')?.total_score > 50;
      if (hasGoodSafety) {
        reasons.push('✅ Good for business operations - Adequate security conditions');
      } else {
        reasons.push('❌ Not recommended for business - Security risks may affect operations');
      }
    }
    
    if (lowerDesc.includes('retirement') || lowerDesc.includes('elderly')) {
      const hasGoodAir = indices.find(i => i.index_name === 'AQHI')?.total_score > 65;
      const hasGoodClimate = indices.find(i => i.index_name === 'UHVI')?.total_score > 65;
      
      if (hasGoodAir && hasGoodClimate) {
        reasons.push('✅ Excellent for seniors - Health-supportive environment');
      } else {
        reasons.push('❌ Not recommended for elderly residents - Health concerns present');
      }
    }
    
    if (lowerDesc.includes('student') || lowerDesc.includes('university')) {
      const hasGoodSafety = indices.find(i => i.index_name === 'CRI')?.total_score > 55;
      if (hasGoodSafety) {
        reasons.push('✅ Suitable for students - Safe learning environment');
      } else {
        reasons.push('❌ Not recommended for students - Safety concerns present');
      }
    }
    
    // Add specific "not applicable" cases based on scenario
    if (lowerDesc.includes('underground') || lowerDesc.includes('basement')) {
      reasons.push('🔍 Heat Vulnerability Index: Not applicable for underground facilities');
    }
    
    if (lowerDesc.includes('industrial') && lowerDesc.includes('no residents')) {
      reasons.push('🔍 Air Quality Index: Limited relevance for non-residential industrial use');
    }
    
    return reasons.slice(0, 6); // Increased to 6 reasons to show more context
  };

  const downloadPDF = useCallback(async (recommendation: Recommendation) => {
    try {
      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      // Create a canvas to convert logo to black
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data to manipulate pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to black (keep transparency)
        for (let i = 0; i < data.length; i += 4) {
          // If pixel is not transparent
          if (data[i + 3] > 0) {
            data[i] = 0;     // Red to 0
            data[i + 1] = 0; // Green to 0
            data[i + 2] = 0; // Blue to 0
            // Keep alpha (transparency) as is
          }
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to data URL
        const blackLogoDataUrl = canvas.toDataURL('image/png');
        
        // Continue with PDF generation
        generateRestOfPDF(blackLogoDataUrl);
      };
      
      const generateRestOfPDF = (logoDataUrl: string) => {
        // Add logo watermark behind text (large and semi-transparent)
        const img = new Image();
        img.onload = () => {
          // Add watermark (jsPDF doesn't support opacity directly, use light color overlay)
          doc.addImage(img, 'PNG', pageWidth/2 - 60, pageHeight/2 - 40, 120, 80, undefined, 'NONE');
          
          // Continue with rest of PDF generation
          generatePDFContent();
        };
        img.src = lupusLogoPdf;
        
        const generatePDFContent = () => {
          // Define current date for use throughout the PDF
          const currentDate = new Date().toISOString().split('T')[0];
          // Corporate header with gradient-like effect
          doc.setFillColor(41, 128, 185); // Corporate blue
          doc.rect(0, 0, pageWidth, 42, 'F');
          
          // Accent stripe for modern corporate look
          doc.setFillColor(52, 152, 219); // Lighter blue accent
          doc.rect(0, 42, pageWidth, 4, 'F');
          
          // White logo at the most left side
          doc.addImage(logoDataUrl, 'PNG', 5, 8, 50, 32);
          
          // Company details at the most right side in white (right-aligned)
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('times', 'bold');
          const text1 = 'Urban Intelligence & Analytics Solutions';
          const text1Width = doc.getTextWidth(text1);
          doc.text(text1, pageWidth - text1Width - 5, 20);
          
          doc.setFontSize(7);
          doc.setFont('times', 'normal');
          const text2 = 'AI-Powered Location Intelligence Platform';
          const text2Width = doc.getTextWidth(text2);
          doc.text(text2, pageWidth - text2Width - 5, 28);
          
          const text3 = 'Contact: info@lupus-cortex.com | www.lupus-cortex.com';
          const text3Width = doc.getTextWidth(text3);
          doc.text(text3, pageWidth - text3Width - 5, 36);
          
          // Professional report title with teal theme
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(20);
          doc.setFont('times', 'bold');
          doc.text('LOCATION EVALUATION REPORT', 20, 70);
          
          // Rating display with teal theme color coding
          doc.setFontSize(16);
          doc.setFont('times', 'bold');
          if (recommendation.rating >= 4) {
            doc.setTextColor(16, 185, 129); // Emerald for excellent
          } else if (recommendation.rating >= 3) {
            doc.setTextColor(6, 182, 212); // Cyan for good  
          } else {
            doc.setTextColor(239, 68, 68); // Red for conditional
          }
          
          doc.text(`${recommendation.rating}/5 STARS`, 20, 82);
          
          // Executive Summary with teal header
          doc.setFillColor(240, 253, 250); // Very light teal background
          doc.rect(18, 88, 174, 3, 'F');
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('EXECUTIVE SUMMARY', 20, 95);
          
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 0, 0);
          const ratingText = recommendation.rating >= 4 ? 'EXCELLENT' : recommendation.rating >= 3 ? 'GOOD' : 'CONDITIONAL';
          const summaryText = `Location (${recommendation.coordinates.lat.toFixed(4)}, ${recommendation.coordinates.lng.toFixed(4)}) rated ${recommendation.rating}/5 - ${ratingText}. 
          
User Requirement: ${userDescription.substring(0, 120)}${userDescription.length > 120 ? '...' : ''}
          
AI Analysis: Comprehensive evaluation based on urban intelligence metrics including crime rates, air quality, and urban heat vulnerability indices.`;
          
          const summaryLines = doc.splitTextToSize(summaryText, 170);
          let yPos = 99;
          summaryLines.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 4;
          });
          
          // Metrics section with teal styling
          yPos += 6;
          doc.setFillColor(240, 253, 250); // Light teal background
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('KEY METRICS', 20, yPos + 2);
          
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          
          Object.entries(recommendation.indexScores).forEach(([index, score]) => {
            // Teal theme color coding for metrics
            if (score > 70) {
              doc.setTextColor(16, 185, 129); // Emerald
            } else if (score > 50) {
              doc.setTextColor(6, 182, 212); // Cyan
            } else {
              doc.setTextColor(239, 68, 68); // Red
            }
            const performance = score > 70 ? 'EXCELLENT' : score > 50 ? 'GOOD' : 'ATTENTION NEEDED';
            doc.text(`• ${index}: ${score.toFixed(0)}/100 - ${performance}`, 22, yPos);
            yPos += 4;
          });
          
          // Findings section with teal theme
          yPos += 4;
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('ANALYSIS FINDINGS', 20, yPos + 2);
          
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 0, 0);
          
          const findings = [];
          Object.entries(recommendation.indexScores).forEach(([index, score]) => {
            if (score > 70) {
              findings.push(`${index}: Excellent conditions - Optimal for use`);
            } else if (score > 50) {
              findings.push(`${index}: Acceptable - Standard protocols recommended`);
            } else {
              findings.push(`${index}: Below optimal - Mitigation strategies required`);
            }
          });
          
          findings.forEach((finding) => {
            const findingLines = doc.splitTextToSize(`• ${finding}`, 170);
            findingLines.forEach(line => {
              doc.text(line, 22, yPos);
              yPos += 4;
            });
          });
          
          // Recommendations section with teal theme
          yPos += 4;
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('STRATEGIC RECOMMENDATIONS', 20, yPos + 2);
          
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 0, 0);
          
          const strategicRecs = [];
          if (recommendation.rating >= 4) {
            strategicRecs.push('1. Proceed with confidence - Excellent suitability');
            strategicRecs.push('2. Leverage superior metrics for optimal outcomes');
            strategicRecs.push('3. Priority location for implementation');
          } else if (recommendation.rating >= 3) {
            strategicRecs.push('1. Recommended with standard monitoring');
            strategicRecs.push('2. Address moderate performance areas');
            strategicRecs.push('3. Implement regular assessment protocols');
          } else {
            strategicRecs.push('1. Conditional approval - Risk mitigation essential');
            strategicRecs.push('2. Priority focus on improving low-scoring metrics');
            strategicRecs.push('3. Consider alternative locations if feasible');
          }
          
          strategicRecs.forEach((rec) => {
            const recLines = doc.splitTextToSize(rec, 170);
            recLines.forEach(line => {
              doc.text(line, 22, yPos);
              yPos += 4;
            });
          });
          
          // Conclusion section with teal theme
          yPos += 4;
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('FINAL ASSESSMENT', 20, yPos + 2);
          
          yPos += 6;
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 0, 0);
          const conclusionText = recommendation.rating >= 4 
            ? `Rating ${recommendation.rating}/5 - EXCEPTIONAL suitability. Location exceeds requirements and is highly recommended for immediate implementation.`
            : recommendation.rating >= 3 
            ? `Rating ${recommendation.rating}/5 - STRONG potential. Location meets core requirements with standard protocols recommended.`
            : `Rating ${recommendation.rating}/5 - Requires careful consideration. Conditional approval with mandatory mitigation measures.`;
          
          const conclusionLines = doc.splitTextToSize(conclusionText, 170);
          conclusionLines.forEach(line => {
            doc.text(line, 22, yPos);
            yPos += 4;
          });
          
          // Professional certification with teal theme
          yPos += 8;
          doc.setFillColor(20, 184, 166);
          doc.rect(18, yPos - 2, 174, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('times', 'bold');
          doc.text('CERTIFIED ANALYSIS', 20, yPos + 4);
          
          doc.setFontSize(7);
          doc.setFont('times', 'normal');
          doc.text('LUPUS CORTEX AI Analytics Division', 20, yPos + 8);
          doc.text(`${currentDate} | Analysis ID: LC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 20, yPos + 12);
          
          // Footer text centered inside border at bottom
          yPos += 20;
          doc.setFontSize(8);
          doc.setFont('times', 'normal');
          doc.setTextColor(20, 184, 166); // Primary teal color
          const footerText = '© 2024 LUPUS CORTEX - Urban Intelligence Solutions | www.lupus-cortex.com';
          const footerText2 = 'Proprietary analysis - authorized use only.';
          
          // Calculate center position for footer text
          const footerWidth = doc.getTextWidth(footerText);
          const footerX = (pageWidth - footerWidth) / 2;
          const footerWidth2 = doc.getTextWidth(footerText2);
          const footerX2 = (pageWidth - footerWidth2) / 2;
          
          // Add light background for footer
          doc.setFillColor(247, 254, 231); // Very light background
          doc.rect(18, yPos - 2, 174, 10, 'F');
          
          doc.text(footerText, footerX, yPos + 2);
          doc.text(footerText2, footerX2, yPos + 6);
          
          // Save PDF
          const cleanArea = recommendation.area.replace(/[^a-zA-Z0-9]/g, '-');
          doc.save(`LUPUS-CORTEX-Evaluation-${cleanArea}-${currentDate}.pdf`);

          toast({
            title: "Evaluation Report Generated",
            description: "Your enhanced professional evaluation report has been successfully generated",
          });
        };
        
        // If image fails to load, continue without watermark
        img.onerror = () => {
          generatePDFContent();
        };
      };

      // Trigger image loading
      img.src = lupusLogoPdf;
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [userDescription, toast]);

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

      {/* Evaluation Request */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Comprehensive Location Evaluation</CardTitle>
          <CardDescription>
            Describe your requirements and get AI-powered recommendations based on all urban intelligence indices
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Exact Location (Latitude, Longitude)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="23.8103, 90.4125"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide precise coordinates for accurate analysis
              </p>
            </div>
            <div>
              <Label htmlFor="locationName">Location Name/Address (Optional)</Label>
              <Input
                id="locationName"
                placeholder="e.g., Dhaka University Area, Gulshan-2, etc."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Helps provide context for the analysis
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Scenario Description</Label>
            <textarea
              id="description"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder="Provide a detailed description of your scenario and requirements. Include:
              
• Purpose: What will this location be used for?
• Specific needs: Safety, air quality, climate considerations?
• Target users: Families, elderly, students, business clients?
• Duration: Temporary visit, permanent residence, business operations?
• Special considerations: Health conditions, accessibility needs, etc.

Example scenarios:
- 'I'm planning to open a daycare center for children ages 2-6. Need excellent air quality and very low crime rates. The facility will operate 12 hours daily with outdoor play areas.'
- 'Looking for a retirement home location for my 75-year-old father with respiratory issues. He needs clean air, mild climate, and safe walking areas for daily exercise.'
- 'Evaluating sites for an outdoor event venue. Need assessment for 500+ attendee capacity, considering air quality for outdoor activities and safety for evening events.'"
              className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
            <p className="text-xs text-muted-foreground">
              More detailed descriptions lead to more accurate recommendations and "not applicable" assessments
            </p>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={generateRecommendations} 
              disabled={loading || !userDescription.trim()}
              className="min-w-[200px]"
              size="lg"
            >
              {loading ? 'Analyzing All Indices...' : 'Generate Comprehensive Report'}
            </Button>
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