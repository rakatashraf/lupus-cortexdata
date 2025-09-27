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
        // Add black logo at top left (scaled appropriately)
        doc.addImage(logoDataUrl, 'PNG', 20, 18, 40, 20);
        
        // Header - Company Details (positioned after logo)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 139, 34);
        doc.text('LUPUS CORTEX', 70, 25);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Urban Intelligence & Analytics Solutions', 70, 32);
        doc.text('AI-Powered Location Intelligence Platform', 70, 38);
        doc.text('Contact: info@lupus-cortex.com | www.lupus-cortex.com', 70, 44);
        
        // Date in top right
        const currentDate = new Date().toISOString().split('T')[0];
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(currentDate, pageWidth - 40, 25);
        
        // Main Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('INDEPENDENT EVALUATION REPORT', 20, 60);
        
        // Subtitle with more appeal
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(34, 139, 34);
        const subtitle = `Premium Location Intelligence Assessment`;
        doc.text(subtitle, 20, 70);
        
        // Executive Summary
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('EXECUTIVE SUMMARY', 20, 90);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const overallScore = Object.values(recommendation.indexScores).reduce((a, b) => a + b, 0) / Object.keys(recommendation.indexScores).length;
        const ratingText = recommendation.rating >= 4 ? 'PREMIUM EXCELLENCE' : recommendation.rating >= 3 ? 'SUPERIOR QUALITY' : 'STRATEGIC CONSIDERATION';
        const summaryText = `This comprehensive location intelligence assessment leveraged advanced AI algorithms and multi-dimensional urban analytics to evaluate coordinates ${recommendation.coordinates.lat}, ${recommendation.coordinates.lng}. Our proprietary evaluation framework yielded an overall rating of ${recommendation.rating}/5 stars, achieving ${ratingText} classification. Based on our rigorous analysis, we provide strategic insights and actionable recommendations for optimal location utilization.`;
        
        const summaryLines = doc.splitTextToSize(summaryText, 170);
        let yPos = 100;
        summaryLines.forEach(line => {
          doc.text(line, 20, yPos);
          yPos += 12;
        });
        
        // Key Findings with more appealing language
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('KEY PERFORMANCE INDICATORS', 20, yPos);
        
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Enhanced findings with better language
        const findings = [];
        Object.entries(recommendation.indexScores).forEach(([index, score]) => {
          if (score > 70) {
            findings.push(`★ EXCEPTIONAL ${index.toUpperCase()} PERFORMANCE: Location demonstrates outstanding excellence with premium score of ${score.toFixed(1)}/100, positioning it in the top tier for ${index} metrics.`);
          } else if (score > 50) {
            findings.push(`★ SOLID ${index.toUpperCase()} FOUNDATION: Robust performance in ${index} category with competitive score of ${score.toFixed(1)}/100, offering reliable conditions for strategic implementation.`);
          } else {
            findings.push(`★ ${index.toUpperCase()} OPTIMIZATION OPPORTUNITY: Current score of ${score.toFixed(1)}/100 presents strategic improvement potential through targeted enhancement initiatives.`);
          }
        });
        
        findings.slice(0, 3).forEach((finding) => {
          const findingLines = doc.splitTextToSize(finding, 170);
          findingLines.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 10;
          });
          yPos += 5;
        });
        
        // AI Analysis Section
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ADVANCED AI INTELLIGENCE METRICS', 20, yPos);
        
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Our cutting-edge AI system analyzed comprehensive urban intelligence indices:', 20, yPos);
        yPos += 12;
        
        Object.entries(recommendation.indexScores).forEach(([index, score]) => {
          const performance = score > 70 ? 'PREMIUM' : score > 50 ? 'COMPETITIVE' : 'DEVELOPMENT';
          doc.text(`• ${index}: ${score.toFixed(1)}/100 - ${performance} Classification`, 25, yPos);
          yPos += 10;
        });
        
        // Strategic Recommendations
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('STRATEGIC RECOMMENDATIONS', 20, yPos);
        
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const recommendations = recommendation.reasons.slice(0, 4);
        recommendations.forEach((rec, index) => {
          const cleanRec = rec.replace(/[✅❌⚠️🔍]/g, '').trim();
          const enhancedRec = cleanRec.charAt(0).toUpperCase() + cleanRec.slice(1);
          doc.text(`${index + 1}. ${enhancedRec}`, 20, yPos);
          yPos += 12;
        });
        
        // Professional Conclusion
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFESSIONAL CONCLUSION', 20, yPos);
        
        yPos += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const conclusionText = recommendation.rating >= 4 
          ? `Our comprehensive analysis reveals this location as an EXCEPTIONAL OPPORTUNITY with outstanding potential for successful implementation. The superior performance across key metrics positions this as a PREMIUM CHOICE for strategic development.`
          : recommendation.rating >= 3 
          ? `Based on rigorous evaluation, this location presents STRONG STRATEGIC VALUE with solid fundamentals and competitive advantages. We confidently endorse this location for successful project implementation.`
          : `Our detailed assessment indicates this location offers STRATEGIC POTENTIAL with identified enhancement opportunities. Recommended implementation with targeted optimization strategies for maximum success.`;
        
        const conclusionLines = doc.splitTextToSize(conclusionText, 170);
        conclusionLines.forEach(line => {
          doc.text(line, 20, yPos);
          yPos += 12;
        });
        
        // Professional Sign-off
        yPos += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFESSIONAL CERTIFICATION', 20, yPos);
        
        yPos += 12;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Prepared by: LUPUS CORTEX AI Analytics Division', 20, yPos);
        doc.text('Lead Urban Intelligence Specialist', 20, yPos + 8);
        doc.text(`Certification Date: ${currentDate}`, 20, yPos + 16);
        doc.text('Report ID: LC-' + Math.random().toString(36).substr(2, 9).toUpperCase(), 20, yPos + 24);
        
        // Create Professional Rubber Stamp Style Seal (positioned to not block text)
        if (recommendation.rating >= 3) {
          const stampX = pageWidth - 55;
          const stampY = 80; // Positioned in top right, away from text
          
          // Outer distressed circle
          doc.setDrawColor(220, 53, 69); // Bootstrap danger red
          doc.setFillColor(220, 53, 69);
          doc.setLineWidth(2);
          
          // Create jagged/distressed edge effect
          const angles = [];
          for (let i = 0; i < 360; i += 15) {
            const radius = 25 + (Math.sin(i * 4 * Math.PI / 180) * 3);
            angles.push({
              x: stampX + Math.cos(i * Math.PI / 180) * radius,
              y: stampY + Math.sin(i * Math.PI / 180) * radius
            });
          }
          
          // Draw jagged circle
          doc.setFillColor(255, 255, 255);
          doc.circle(stampX, stampY, 24);
          doc.setDrawColor(220, 53, 69);
          doc.setLineWidth(3);
          doc.circle(stampX, stampY, 24);
          doc.circle(stampX, stampY, 20);
          
          // Add stars around the seal
          doc.setFontSize(8);
          doc.setTextColor(220, 53, 69);
          doc.text('★', stampX - 15, stampY - 15);
          doc.text('★', stampX + 12, stampY - 15);
          doc.text('★', stampX - 15, stampY + 20);
          doc.text('★', stampX + 12, stampY + 20);
          doc.text('★', stampX - 3, stampY - 20);
          
          // Main RECOMMENDED text with distressed effect
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 53, 69);
          
          // Create tilted text effect for "RECOMMENDED"
          doc.text('RECOMMENDED', stampX - 18, stampY - 2, { angle: -15 });
          
          // Add "LUPUS CORTEX" in smaller text
          doc.setFontSize(5);
          doc.text('LUPUS CORTEX', stampX - 12, stampY + 8);
          doc.text('CERTIFIED', stampX - 8, stampY + 12);
        }
        
        // Footer with enhanced branding
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text('© 2024 LUPUS CORTEX - Premium Urban Intelligence Solutions', 20, pageHeight - 30);
        doc.text('Powered by Advanced AI Analytics | www.lupus-cortex.com', 20, pageHeight - 22);
        doc.text('This report contains proprietary analysis and is intended for authorized use only.', 20, pageHeight - 14);
        
        // Save PDF with enhanced filename
        const cleanArea = recommendation.area.replace(/[^a-zA-Z0-9]/g, '-');
        doc.save(`LUPUS-CORTEX-Premium-Evaluation-${cleanArea}-${currentDate}.pdf`);

        toast({
          title: "Premium Report Generated",
          description: "Your professional evaluation report has been successfully generated and downloaded",
        });
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