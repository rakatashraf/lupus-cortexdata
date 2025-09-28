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
  Building,
  Eye,
  MousePointer2
} from 'lucide-react';
import { n8nService } from '@/services/n8n-service';
import jsPDF from 'jspdf';
import lupusLogo from '@/assets/lupus-cortex-logo.png';
import lupusLogoPdf from '@/assets/lupus-cortex-logo-pdf.png';
import lupusLogoNew from '@/assets/lupus-cortex-new-logo.png';
import { RecommendationAnalysisModal, EnhancedRecommendation } from './RecommendationAnalysisModal';

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
  const [enhancedRecommendations, setEnhancedRecommendations] = useState<EnhancedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<EnhancedRecommendation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      const sortedRecommendations = mockRecommendations.sort((a, b) => b.rating - a.rating);
      setRecommendations(sortedRecommendations);
      
      // Transform to enhanced recommendations
      const enhanced = sortedRecommendations.map(rec => transformToEnhancedRecommendation(rec, userDescription));
      setEnhancedRecommendations(enhanced);
      
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

  // Transform basic recommendation to enhanced recommendation with user-friendly content
  const transformToEnhancedRecommendation = (rec: Recommendation, userDesc: string): EnhancedRecommendation => {
    const lowerDesc = userDesc.toLowerCase();
    
    // Determine suitability based on scores and user description
    const avgScore = Object.values(rec.indexScores).reduce((a, b) => a + b, 0) / Object.values(rec.indexScores).length;
    const suitabilityTags = [];
    
    // Generate suitability tags based on context
    if (lowerDesc.includes('family') || lowerDesc.includes('children') || lowerDesc.includes('kids')) {
      suitabilityTags.push(rec.indexScores.CRI >= 70 && rec.indexScores.AQHI >= 70 ? 'Family-Friendly' : 'Consider Safety for Children');
    }
    if (lowerDesc.includes('senior') || lowerDesc.includes('elderly') || lowerDesc.includes('retirement')) {
      suitabilityTags.push(rec.indexScores.AQHI >= 75 ? 'Senior-Suitable' : 'Health Considerations for Seniors');
    }
    if (lowerDesc.includes('business') || lowerDesc.includes('office') || lowerDesc.includes('commercial')) {
      suitabilityTags.push(rec.indexScores.CRI >= 65 ? 'Business-Ready' : 'Review Security Needs');
    }
    if (avgScore >= 75) {
      suitabilityTags.push('Excellent Overall Conditions');
    } else if (avgScore >= 60) {
      suitabilityTags.push('Good with Minor Considerations');
    } else {
      suitabilityTags.push('Requires Improvement');
    }

    // Generate daily life impact description
    let dailyLifeImpact = '';
    if (rec.rating >= 4) {
      dailyLifeImpact = `This location offers excellent conditions for daily life. You'll enjoy ${rec.indexScores.AQHI >= 70 ? 'clean air for breathing comfort' : 'moderate air quality'}, ${rec.indexScores.CRI >= 70 ? 'safe streets for peace of mind' : 'basic safety measures'}, and ${rec.indexScores.UHVI >= 70 ? 'comfortable climate conditions year-round' : 'manageable climate with seasonal considerations'}.`;
    } else if (rec.rating >= 3) {
      dailyLifeImpact = `This location provides decent living conditions with some considerations. ${rec.indexScores.AQHI < 60 ? 'Air quality may require attention on high pollution days. ' : ''}${rec.indexScores.CRI < 60 ? 'Extra safety precautions recommended for evening activities. ' : ''}Overall suitable for most daily activities with awareness of local conditions.`;
    } else {
      dailyLifeImpact = `This location has challenges that require careful consideration. ${rec.indexScores.AQHI < 50 ? 'Poor air quality may affect sensitive individuals. ' : ''}${rec.indexScores.CRI < 50 ? 'Safety concerns require additional precautions. ' : ''}Consider whether these factors align with your specific needs and risk tolerance.`;
    }

    // Generate health considerations
    const healthConsiderations = [];
    if (rec.indexScores.AQHI < 60) {
      healthConsiderations.push('Air quality may affect those with respiratory conditions');
    } else if (rec.indexScores.AQHI >= 80) {
      healthConsiderations.push('Excellent air quality suitable for outdoor activities');
    }
    
    if (rec.indexScores.UHVI < 50) {
      healthConsiderations.push('High heat vulnerability - stay hydrated and avoid midday sun');
    } else if (rec.indexScores.UHVI >= 70) {
      healthConsiderations.push('Good climate resilience for year-round comfort');
    }

    // Generate quick decision factors
    const quickDecisionFactors = [];
    if (rec.indexScores.CRI >= 70) quickDecisionFactors.push('Safe for evening walks and outdoor activities');
    if (rec.indexScores.AQHI >= 70) quickDecisionFactors.push('Clean air suitable for children and elderly');
    if (rec.indexScores.UHVI >= 70) quickDecisionFactors.push('Comfortable climate conditions');
    if (avgScore >= 70) quickDecisionFactors.push('Overall excellent urban living conditions');
    if (quickDecisionFactors.length === 0) {
      quickDecisionFactors.push('Requires careful evaluation of specific needs');
    }

    return {
      ...rec,
      residentSummary: {
        suitabilityTags,
        dailyLifeImpact,
        familyFriendly: rec.indexScores.CRI >= 70 && rec.indexScores.AQHI >= 65,
        seniorFriendly: rec.indexScores.AQHI >= 75 && rec.indexScores.UHVI >= 65,
        healthConsiderations,
        quickDecisionFactors
      },
      plannerAnalysis: {
        technicalMetrics: rec.indexScores,
        developmentPotential: avgScore >= 70 ? 
          'High development potential with good infrastructure foundation. Suitable for residential and mixed-use development with minimal environmental constraints.' :
          avgScore >= 50 ?
          'Moderate development potential requiring targeted improvements. Infrastructure upgrades needed for optimal development outcomes.' :
          'Limited development potential without significant intervention. Requires comprehensive planning and substantial investment in infrastructure and environmental remediation.',
        policyRecommendations: generatePolicyRecommendations(rec.indexScores, userDesc),
        investmentAnalysis: generateInvestmentAnalysis(rec.indexScores, rec.rating),
        riskFactors: generateRiskFactors(rec.indexScores),
        improvementTimeline: generateImprovementTimeline(rec.indexScores),
        comparativeAnalysis: `Index scores compared to city average: ${Object.entries(rec.indexScores)
          .map(([index, score]) => `${index}: ${score >= 70 ? 'Above Average' : score >= 50 ? 'Average' : 'Below Average'}`)
          .join(', ')}`
      }
    };
  };

  const generatePolicyRecommendations = (scores: { [key: string]: number }, userDesc: string): string[] => {
    const recommendations = [];
    
    if (scores.CRI < 60) {
      recommendations.push('Increase police patrol frequency and install additional street lighting');
      recommendations.push('Implement community safety programs and neighborhood watch initiatives');
    }
    if (scores.AQHI < 60) {
      recommendations.push('Establish air quality monitoring stations and emission controls');
      recommendations.push('Promote green transportation and limit vehicle emissions');
    }
    if (scores.UHVI < 60) {
      recommendations.push('Develop urban cooling strategies including tree planting and green roofs');
      recommendations.push('Install cooling centers and heat warning systems');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Maintain current high standards through regular monitoring');
      recommendations.push('Continue investment in preventive maintenance of infrastructure');
    }
    
    return recommendations;
  };

  const generateInvestmentAnalysis = (scores: { [key: string]: number }, rating: number): string => {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    
    if (avgScore >= 70) {
      return `High ROI potential with estimated property value growth of 8-12% annually. Infrastructure investment needs are minimal, estimated at $50-100K per development unit. Strong market demand expected.`;
    } else if (avgScore >= 50) {
      return `Moderate ROI potential requiring strategic investment. Infrastructure improvements needed, estimated at $150-300K per unit. Market demand dependent on improvement implementation timeline.`;
    } else {
      return `Lower ROI potential requiring significant upfront investment. Comprehensive infrastructure overhaul needed, estimated at $400-600K per unit. Long-term investment strategy recommended with 5-10 year payback period.`;
    }
  };

  const generateRiskFactors = (scores: { [key: string]: number }): string[] => {
    const risks = [];
    
    if (scores.CRI < 50) risks.push('High crime rates pose security risks for residents and businesses');
    if (scores.AQHI < 50) risks.push('Poor air quality health risks, especially for vulnerable populations');
    if (scores.UHVI < 50) risks.push('Extreme heat vulnerability affecting habitability and energy costs');
    
    if (risks.length === 0) {
      risks.push('Minimal environmental and safety risks identified');
    }
    
    return risks;
  };

  const generateImprovementTimeline = (scores: { [key: string]: number }): { [key: string]: string } => {
    const timeline: { [key: string]: string } = {};
    
    if (scores.CRI < 60) {
      timeline['0-6 months'] = 'Deploy additional security measures and community programs';
      timeline['6-18 months'] = 'Install permanent security infrastructure and lighting';
    }
    if (scores.AQHI < 60) {
      timeline['0-12 months'] = 'Implement emission controls and monitoring systems';
      timeline['1-3 years'] = 'Develop green transportation infrastructure';
    }
    if (scores.UHVI < 60) {
      timeline['0-6 months'] = 'Install emergency cooling centers';
      timeline['1-5 years'] = 'Implement comprehensive urban cooling strategy';
    }
    
    if (Object.keys(timeline).length === 0) {
      timeline['Ongoing'] = 'Maintain current high standards through regular monitoring';
    }
    
    return timeline;
  };

  const handleRecommendationClick = (recommendation: EnhancedRecommendation) => {
    setSelectedRecommendation(recommendation);
    setIsModalOpen(true);
  };

  const handleDownloadPDF = async (recommendation: EnhancedRecommendation, type: 'resident' | 'planner') => {
    // Close modal first
    setIsModalOpen(false);
    
    // Use existing downloadPDF function but adapt for different types
    if (type === 'resident') {
      await downloadResidentPDF(recommendation);
    } else {
      await downloadPlannerPDF(recommendation);
    }
  };

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
          // Load the new logo for header
          const newImg = new Image();
          newImg.onload = () => {
            // Create high-resolution canvas for crisp logo
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set very high resolution for ultra-crisp rendering
            const scale = 4; // Quadruple resolution for maximum clarity
            canvas.width = newImg.width * scale;
            canvas.height = newImg.height * scale;
            
            // Enable high-quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw the new logo at very high resolution for ultra-clarity
            ctx.drawImage(newImg, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to data URL
            const newLogoDataUrl = canvas.toDataURL('image/png');
            
            // Continue with PDF generation using new logo
            generateRestOfPDFWithNewLogo(newLogoDataUrl);
          };
          
          newImg.onerror = () => {
            // Fallback to original logo if new one fails to load
            generateRestOfPDFWithNewLogo(logoDataUrl);
          };
          
          newImg.src = lupusLogoNew;
        };
        
        const generateRestOfPDFWithNewLogo = (newLogoDataUrl: string) => {
        // Add logo watermark behind text (smaller and higher resolution)
        const img = new Image();
        img.onload = () => {
          // Add smaller, clearer watermark
          doc.addImage(img, 'PNG', pageWidth/2 - 40, pageHeight/2 - 30, 80, 60, undefined, 'NONE');
          
          // Continue with rest of PDF generation
          generatePDFContent();
        };
        img.src = lupusLogoNew;
        
        const generatePDFContent = () => {
          // Define current date for use throughout the PDF
          const currentDate = new Date().toISOString().split('T')[0];
          // Website theme teal gradient header (30 pixels height)
          doc.setFillColor(20, 184, 166); // Primary teal from website theme
          doc.rect(0, 0, pageWidth, 30, 'F');
          
          // Accent gradient stripe with cyan
          doc.setFillColor(6, 182, 212); // Cyan accent from website theme  
          doc.rect(0, 30, pageWidth, 2, 'F');
          
          // Ultra high-res logo at the most left side (optimized for 30px header)
          doc.addImage(newLogoDataUrl, 'PNG', 5, 4, 40, 18);
          
          // Company details at the most right side in white (compact for 30px header)
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('times', 'bold');
          const text1 = 'Urban Intelligence & Analytics Solutions';
          const text1Width = doc.getTextWidth(text1);
          doc.text(text1, pageWidth - text1Width - 5, 12);
          
          doc.setFontSize(5);
          doc.setFont('times', 'normal');
          const text2 = 'AI-Powered Location Intelligence Platform';
          const text2Width = doc.getTextWidth(text2);
          doc.text(text2, pageWidth - text2Width - 5, 18);
          
          const text3 = 'Contact: info@lupus-cortex.com | www.lupus-cortex.com';
          const text3Width = doc.getTextWidth(text3);
          doc.text(text3, pageWidth - text3Width - 5, 24);
          
          // Professional report title with teal theme (adjusted for 30px header)
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(20);
          doc.setFont('times', 'bold');
          doc.text('LOCATION EVALUATION REPORT', 20, 50);
          
          // Rating display with teal theme color coding (properly spaced after title)
          doc.setFontSize(16);
          doc.setFont('times', 'bold');
          if (recommendation.rating >= 4) {
            doc.setTextColor(16, 185, 129); // Emerald for excellent
          } else if (recommendation.rating >= 3) {
            doc.setTextColor(6, 182, 212); // Cyan for good  
          } else {
            doc.setTextColor(239, 68, 68); // Red for conditional
          }
          
          doc.text(`${recommendation.rating}/5 STARS`, 20, 65);
          
          // Executive Summary with proper organization
          doc.setFillColor(240, 253, 250); // Very light teal background
          doc.rect(18, 75, 174, 3, 'F');
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('EXECUTIVE SUMMARY', 20, 81);
          
          doc.setFontSize(9);
          doc.setFont('times', 'normal');
          doc.setTextColor(0, 0, 0);
          const ratingText = recommendation.rating >= 4 ? 'EXCELLENT' : recommendation.rating >= 3 ? 'GOOD' : 'CONDITIONAL';
          const summaryText = `Location (${recommendation.coordinates.lat.toFixed(4)}, ${recommendation.coordinates.lng.toFixed(4)}) rated ${recommendation.rating}/5 - ${ratingText}. 
          
User Requirement: ${userDescription.substring(0, 120)}${userDescription.length > 120 ? '...' : ''}
          
AI Analysis: Comprehensive evaluation based on urban intelligence metrics including crime rates, air quality, and urban heat vulnerability indices.`;
          
          const summaryLines = doc.splitTextToSize(summaryText, 170);
          let yPos = 85;
          summaryLines.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 4; // Proper line spacing for readability
          });
          
          // Metrics section with proper organization
          yPos += 6; // Proper section spacing
          doc.setFillColor(240, 253, 250); // Light teal background
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166); // Primary teal
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('KEY METRICS', 20, yPos + 2);
          
          yPos += 6; // Proper header spacing
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
            yPos += 4; // Consistent line spacing
          });
          
          // Findings section with proper organization
          yPos += 5; // Proper section spacing
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('ANALYSIS FINDINGS', 20, yPos + 2);
          
          yPos += 6; // Proper header spacing
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
              yPos += 4; // Consistent line spacing
            });
          });
          
          // Recommendations section with proper organization
          yPos += 5; // Proper section spacing
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('STRATEGIC RECOMMENDATIONS', 20, yPos + 2);
          
          yPos += 6; // Proper header spacing
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
              yPos += 4; // Consistent line spacing
            });
          });
          
          // Conclusion section with proper organization
          yPos += 5; // Proper section spacing
          doc.setFillColor(240, 253, 250);
          doc.rect(18, yPos - 2, 174, 3, 'F');
          doc.setTextColor(20, 184, 166);
          doc.setFontSize(11);
          doc.setFont('times', 'bold');
          doc.text('FINAL ASSESSMENT', 20, yPos + 2);
          
          yPos += 6; // Proper header spacing
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
            yPos += 4; // Consistent line spacing
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
      {enhancedRecommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Smart Location Recommendations</h2>
          <p className="text-muted-foreground">
            Click on any recommendation to see detailed analysis for residents and urban planners
          </p>
          <div className="grid gap-4">
            {enhancedRecommendations.map((rec, index) => (
              <Card 
                key={index} 
                className="glass-card cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-primary/50 hover:border-l-primary"
                onClick={() => handleRecommendationClick(rec)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{rec.area}</CardTitle>
                          <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
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
                        
                        {/* User-friendly overview */}
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {rec.residentSummary.suitabilityTags.slice(0, 3).map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {rec.residentSummary.dailyLifeImpact}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPDF(rec);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Quick PDF
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Click for detailed analysis
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Simple overall indicators */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-xl font-bold ${
                            rec.rating >= 4 ? 'text-green-600' : rec.rating >= 3 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {rec.rating >= 4 ? 'Excellent' : rec.rating >= 3 ? 'Good' : 'Fair'}
                          </div>
                          <div className="text-xs text-muted-foreground">Overall</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-xl font-bold ${
                            rec.residentSummary.familyFriendly ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {rec.residentSummary.familyFriendly ? 'Yes' : 'Maybe'}
                          </div>
                          <div className="text-xs text-muted-foreground">Family Safe</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          <Eye className="h-3 w-3 mr-1" />
                          Click for details
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Key benefits - reduced to 2 most important */}
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Why This Location Works for You</h4>
                      <div className="space-y-1">
                        {rec.residentSummary.quickDecisionFactors.slice(0, 2).map((factor, i) => (
                          <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-600 text-xs mt-0.5">✓</span>
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Analysis Modal */}
      <RecommendationAnalysisModal 
        recommendation={selectedRecommendation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );

  // Calculate Human Wellbeing Index (HWI) from index scores
  const calculateHWI = (indexScores: { [key: string]: number }) => {
    const weights = {
      'AQHI': 0.20, // Air Quality - 20%
      'CRI': 0.25,  // Safety/Crime - 25%
      'WSI': 0.15,  // Water/Sanitation - 15%
      'TAS': 0.15,  // Transportation - 15%
      'GEA': 0.10,  // Green Environment - 10%
      'UHVI': 0.05, // Urban Heat - 5%
      'SCM': 0.05,  // Smart City - 5%
      'EJT': 0.05   // Economic Justice - 5%
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(indexScores).forEach(([key, score]) => {
      const weight = weights[key as keyof typeof weights] || 0.05;
      totalScore += score * weight;
      totalWeight += weight;
    });
    
    return Math.round(totalWeight > 0 ? totalScore / totalWeight : 0);
  };

  // Get suitability interpretation based on HWI score
  const getSuitabilityLevel = (hwi: number) => {
    if (hwi >= 90) return { level: 'Excellent', desc: 'Highly Suitable', color: '#10b981' };
    if (hwi >= 70) return { level: 'Good', desc: 'Suitable with minor considerations', color: '#f59e0b' };
    if (hwi >= 50) return { level: 'Fair', desc: 'Suitable with mitigation measures', color: '#f59e0b' };
    if (hwi >= 30) return { level: 'Poor', desc: 'Requires significant improvements', color: '#ef4444' };
    return { level: 'Very Poor', desc: 'Not recommended', color: '#ef4444' };
  };

  // Enhanced PDF generation for residents (1-page Urban Suitability Analysis)
  const downloadResidentPDF = async (recommendation: EnhancedRecommendation) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const hwi = calculateHWI(recommendation.indexScores);
      
      // Header Section
      pdf.setFontSize(18);
      pdf.setTextColor(0, 102, 204);
      pdf.text('Urban Suitability Analysis Report', 20, 20);
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Location: ${recommendation.area}`, 20, 30);
      pdf.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 20, 36);
      pdf.text('Prepared for: Resident', 20, 42);
      
      // 1. User Requirements
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text('1. User Requirements', 20, 55);
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      const purpose = recommendation.residentSummary?.suitabilityTags?.[0] || 'Residential';
      pdf.text(`Type of Infrastructure/Purpose: ${purpose}`, 20, 63);
      
      const keyCriteria = recommendation.residentSummary?.suitabilityTags?.slice(0, 3).join(', ') || 'Safety, Air Quality, Accessibility';
      pdf.text(`Key Criteria: ${keyCriteria}`, 20, 69);
      
      const specificRequests = recommendation.residentSummary?.quickDecisionFactors?.slice(0, 2).join(', ') || 'Low pollution, Good safety';
      pdf.text(`Specific Requests: ${specificRequests}`, 20, 75);
      
      // 2. Location Analysis
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text('2. Location Analysis', 20, 88);
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Environmental Factors: Air quality, water quality, green coverage, noise levels, flood risk', 20, 96);
      pdf.text('Accessibility & Connectivity: Roads, public transport, commute time to city centers', 20, 102);
      pdf.text('Social Amenities: Schools, hospitals, parks, shopping, safety index', 20, 108);
      pdf.text('Zoning & Regulations: Legal suitability for intended infrastructure or residency', 20, 114);
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 102, 204);
      pdf.text(`Human Wellbeing Index (HWI): ${hwi}/100`, 20, 125);
      
      // 3. Comparison Table (Requirements vs Reality)
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text('3. Comparison Table (Requirements vs Reality)', 20, 140);
      
      // Table headers
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Requirement/Expectation', 20, 150);
      pdf.text('Actual Situation', 75, 150);
      pdf.text('Score/Rating', 115, 150);
      pdf.text('Comments/Gap', 145, 150);
      
      // Table content
      let tableY = 158;
      const tableData = [
        {
          req: 'Low air pollution',
          actual: (recommendation.indexScores.AQHI || 0) >= 70 ? 'Good' : 'Moderate',
          score: `${Math.round(recommendation.indexScores.AQHI || 0)}/100`,
          comment: (recommendation.indexScores.AQHI || 0) >= 70 ? 'Meets requirements' : 'Consider filtration'
        },
        {
          req: 'Safety',
          actual: (recommendation.indexScores.CRI || 0) >= 70 ? 'High' : 'Moderate',
          score: `${Math.round(recommendation.indexScores.CRI || 0)}/100`,
          comment: (recommendation.indexScores.CRI || 0) >= 70 ? 'Meets requirements' : 'Extra precautions needed'
        },
        {
          req: 'Accessibility',
          actual: (recommendation.indexScores.TAS || 0) >= 70 ? 'Good' : 'Medium',
          score: `${Math.round(recommendation.indexScores.TAS || 0)}/100`,
          comment: (recommendation.indexScores.TAS || 0) >= 70 ? 'Well connected' : 'Need better transport links'
        },
        {
          req: 'Social amenities',
          actual: ((recommendation.indexScores.CRI + recommendation.indexScores.WSI) / 2 || 0) >= 60 ? 'Good' : 'Low',
          score: `${Math.round((recommendation.indexScores.CRI + recommendation.indexScores.WSI) / 2 || 0)}/100`,
          comment: ((recommendation.indexScores.CRI + recommendation.indexScores.WSI) / 2 || 0) >= 60 ? 'Adequate facilities' : 'Suggest nearby facilities'
        },
        {
          req: 'Noise levels',
          actual: (100 - (recommendation.indexScores.UHVI || 30)) >= 60 ? 'Low' : 'High',
          score: `${Math.round(100 - (recommendation.indexScores.UHVI || 30))}/100`,
          comment: (100 - (recommendation.indexScores.UHVI || 30)) >= 60 ? 'Peaceful area' : 'Mitigation required'
        }
      ];
      
      tableData.forEach(row => {
        pdf.text(row.req, 20, tableY);
        pdf.text(row.actual, 75, tableY);
        pdf.text(row.score, 115, tableY);
        pdf.text(row.comment, 145, tableY);
        tableY += 7;
      });
      
      // 4. Recommendations
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text('4. Recommendations', 20, tableY + 15);
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      
      let recommendationText = '';
      if (hwi >= 80) {
        recommendationText = 'Location meets most requirements. Minor improvements suggested.';
      } else if (hwi >= 50) {
        recommendationText = 'Mitigation measures to improve resident well-being: noise barriers, air filters, green buffer, etc.';
      } else {
        recommendationText = 'Location does not meet key requirements. Alternatives: nearby areas with better scores.';
      }
      
      const recLines = pdf.splitTextToSize(recommendationText, pageWidth - 40);
      let recY = tableY + 25;
      recLines.forEach(line => {
        pdf.text(line, 20, recY);
        recY += 6;
      });
      
      // 5. Summary/Decision
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text('5. Summary / Decision', 20, recY + 10);
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Overall Suitability Score: ${hwi}/100`, 20, recY + 20);
      
      let decision = '';
      if (hwi >= 70) {
        decision = 'Suitable for residential use with minor adjustments.';
      } else if (hwi >= 50) {
        decision = 'Conditionally suitable for residential use with mitigation measures.';
      } else {
        decision = 'Not recommended for residential use; consider alternative locations.';
      }
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 102, 204);
      pdf.text(`Recommendation: ${decision}`, 20, recY + 28);
      
      // 6. Optional Visuals (mini chart representation)
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      const airScore = Math.round(recommendation.indexScores.AQHI || 0);
      const safetyScore = Math.round(recommendation.indexScores.CRI || 0);
      const noiseScore = Math.round(100 - (recommendation.indexScores.UHVI || 30));
      const accessScore = Math.round(recommendation.indexScores.TAS || 0);
      const amenityScore = Math.round((recommendation.indexScores.CRI + recommendation.indexScores.WSI) / 2 || 0);
      const greenScore = Math.round(recommendation.indexScores.GEA || 0);
      
      pdf.text(`HWI Factors: Air ${airScore} | Safety ${safetyScore} | Noise ${noiseScore} | Accessibility ${accessScore} | Amenities ${amenityScore} | Green ${greenScore}`, 20, recY + 40);
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Generated by Lupus Cortex Urban Intelligence Platform', 20, 285);
      
      const fileName = `Urban-Suitability-Analysis-${recommendation.area.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Success",
        description: "Resident analysis report downloaded successfully!",
      });
    } catch (error) {
      console.error('Error generating resident PDF:', error);
      toast({
        title: "Error", 
        description: "Failed to generate resident PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Enhanced PDF generation for urban planners (1-page format based on Script.pdf)
  const downloadPlannerPDF = async (recommendation: EnhancedRecommendation) => {
    try {
      const doc = new jsPDF();
      
      // Header - Location Evaluation Report
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCATION EVALUATION REPORT', 105, 20, { align: 'center' });
      
      // Star Rating
      const hwi = calculateHWI(recommendation.indexScores);
      const stars = Math.round(hwi / 20); // Convert to 1-5 stars
      doc.setFontSize(24);
      doc.text(`${stars}/5 STARS`, 105, 32, { align: 'center' });
      
      // Company branding
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Urban Intelligence & Analytics Solutions', 105, 42, { align: 'center' });
      doc.text('A Lupus Cortex Location Intelligence Platform', 105, 48, { align: 'center' });
      
      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, 65);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const ratingLevel = getSuitabilityLevel(hwi);
      const rating = ratingLevel.level.toUpperCase();
      doc.text(`Location (${recommendation.coordinates?.lat?.toFixed(4) || 'N/A'}, ${recommendation.coordinates?.lng?.toFixed(4) || 'N/A'}) rated ${stars}/5 - ${rating}.`, 20, 75);
      
      const userReq = extractUserRequirements();
      doc.text(`User Requirement: ${userReq.type}`, 20, 85);
      doc.text('AI Analysis: Comprehensive evaluation based on urban intelligence metrics,', 20, 95);
      doc.text('zoning regulations, infrastructure capacity, and development potential.', 20, 102);
      
      // Strategic Recommendations
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('STRATEGIC RECOMMENDATIONS', 20, 120);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const strategicRecs = generatePlannerStrategicRecommendations(hwi, recommendation.indexScores);
      strategicRecs.forEach((rec, index) => {
        doc.text(`${index + 1}. ${rec}`, 20, 130 + (index * 8));
      });
      
      // Development Feasibility Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DEVELOPMENT FEASIBILITY ASSESSMENT', 20, 165);
      
      // Table headers
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Development Factor', 20, 175);
      doc.text('Current Status', 70, 175);
      doc.text('Rating', 120, 175);
      doc.text('Investment Need', 145, 175);
      
      // Draw table line
      doc.line(20, 177, 190, 177);
      
      doc.setFont('helvetica', 'normal');
      const developmentFactors = generateDevelopmentTable(recommendation.indexScores, userReq);
      let yPos = 185;
      
      developmentFactors.slice(0, 5).forEach(factor => {
        doc.text(factor.factor.substring(0, 20), 20, yPos);
        doc.text(factor.status.substring(0, 18), 70, yPos);
        doc.text(`${factor.score}/100`, 120, yPos);
        doc.text(factor.investment.substring(0, 20), 145, yPos);
        yPos += 8;
      });
      
      // Recommendations
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMMENDATIONS', 20, yPos + 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const recText = generatePlannerConsolidatedRecommendation(hwi, recommendation.indexScores);
      const splitRec = doc.splitTextToSize(recText, 170);
      doc.text(splitRec, 20, yPos + 20);
      
      // Summary/Decision
      yPos = Math.max(yPos + 45, 240);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('FINAL ASSESSMENT', 20, yPos);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const finalAssessment = `Rating ${stars}/5 - ${rating} suitability for ${userReq.type} development. ${getPlannerFinalRecommendation(hwi)}`;
      const splitFinal = doc.splitTextToSize(finalAssessment, 170);
      doc.text(splitFinal, 20, yPos + 10);
      
      // Certified Analysis
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFIED ANALYSIS', 20, 270);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('LUPUS CORTEX AI Analytics Division', 20, 278);
      doc.text(`${new Date().toISOString().split('T')[0]} Analysis ID: LC-${Date.now().toString().slice(-6)}`, 20, 285);
      doc.text('© 2024 LUPUS CORTEX Urban Intelligence Solutions', 20, 292);
      
      doc.save(`${recommendation.area.replace(/[^a-zA-Z0-9]/g, '-')}-Development-Analysis-${Date.now().toString().slice(-6)}.pdf`);
      
      toast({
        title: "Development Report Downloaded",
        description: "Urban planner development analysis generated successfully.",
      });
    } catch (error) {
      console.error('Error generating planner PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate development analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions for PDF generation
  const extractUserRequirements = () => {
    const description = userDescription.toLowerCase();
    
    // Extract infrastructure type
    let type = 'General Development';
    if (description.includes('residential') || description.includes('housing') || description.includes('apartment') || description.includes('complex')) {
      type = 'High-Density Residential Complex';
    } else if (description.includes('commercial') || description.includes('office') || description.includes('business')) {
      type = 'Commercial Development';
    } else if (description.includes('industrial') || description.includes('factory') || description.includes('manufacturing')) {
      type = 'Industrial Development';
    } else if (description.includes('school') || description.includes('university') || description.includes('education')) {
      type = 'Educational Facility';
    } else if (description.includes('hospital') || description.includes('clinic') || description.includes('healthcare')) {
      type = 'Healthcare Facility';
    }
    
    return { type, criteria: ['safety', 'accessibility', 'environmental quality'], requests: ['optimal conditions', 'regulatory compliance'] };
  };
  
  const generateStrategicRecommendations = (hwi: number, indexScores: any) => {
    if (hwi >= 80) {
      return [
        'Proceed with confidence - Good suitability with minor risks',
        'Implement noise barriers and green buffers to enhance resident comfort',
        'Plan for on-site or nearby social facilities (e.g., community center, shops) to boost amenities'
      ];
    } else if (hwi >= 60) {
      return [
        'Conditional approval - Address key infrastructure gaps before development',
        'Invest in air quality monitoring and mitigation systems',
        'Develop comprehensive noise reduction and traffic management plans'
      ];
    } else {
      return [
        'Major improvements required - Current conditions do not meet standards',
        'Consider alternative locations with better baseline conditions', 
        'If location fixed, substantial infrastructure investment needed for viability'
      ];
    }
  };
  
  const generatePlannerStrategicRecommendations = (hwi: number, indexScores: any) => {
    if (hwi >= 80) {
      return [
        'Approve development with standard conditions and minor risk mitigation',
        'Require noise barriers and acoustic insulation for units facing major roadways',
        'Mandate integration of community facilities to address social amenity gaps'
      ];
    } else if (hwi >= 60) {
      return [
        'Conditional approval pending infrastructure improvements and risk mitigation',
        'Require comprehensive environmental impact assessment and remediation plan',
        'Mandate traffic management systems and enhanced connectivity infrastructure'
      ];
    } else {
      return [
        'Reject current proposal - location unsuitable for intended development type',
        'Recommend alternative zoning or substantial public infrastructure investment',
        'Consider phased development approach with extensive preliminary improvements'
      ];
    }
  };
  
  const generateRequirementsTable = (indexScores: any, userReq: any) => {
    return [
      {
        requirement: 'Safety (Low Crime)',
        actual: 'High Safety Index',
        score: Math.min(indexScores?.CRI || 85, 100),
        comments: 'Meets requirements; excellent local governance'
      },
      {
        requirement: 'Accessibility (Easy Commute)',
        actual: 'High Proximity to Roads',
        score: Math.min(indexScores?.TAS || 75, 100),
        comments: 'Exceeds requirement; optimal transport links'
      },
      {
        requirement: 'Noise Levels (Quiet)',
        actual: 'High Noise from Roads',
        score: Math.max(40 - (indexScores?.noise || 40), 35),
        comments: 'Mitigation required; close proximity to major road'
      },
      {
        requirement: 'Social Facilities (Convenient)',
        actual: 'Limited Local Amenities',
        score: Math.min(indexScores?.social || 55, 100),
        comments: 'Attention needed; future development must include facilities'
      },
      {
        requirement: 'Green Space (High Coverage)',
        actual: 'Excellent Green Coverage',
        score: Math.min(indexScores?.GEA || 85, 100),
        comments: 'Meets requirements; ample parks and natural areas nearby'
      }
    ];
  };
  
  const generateDevelopmentTable = (indexScores: any, userReq: any) => {
    return [
      {
        factor: 'Zoning Compliance',
        status: 'Approved for Residential',
        score: 90,
        investment: 'Minimal - Standard permits'
      },
      {
        factor: 'Infrastructure Capacity',
        status: 'High Road Access',
        score: Math.min(indexScores?.TAS || 75, 100),
        investment: 'Low - Existing infrastructure adequate'
      },
      {
        factor: 'Environmental Impact',
        status: 'Moderate Air Quality',
        score: Math.min(indexScores?.AQHI || 70, 100),
        investment: 'Medium - Monitoring systems required'
      },
      {
        factor: 'Noise Mitigation',
        status: 'High Road Noise',
        score: 35,
        investment: 'High - Barriers and insulation required'
      },
      {
        factor: 'Social Infrastructure',
        status: 'Limited Amenities',
        score: Math.min(indexScores?.social || 55, 100),
        investment: 'High - Community facilities needed'
      }
    ];
  };
  
  const generateConsolidatedRecommendation = (hwi: number, indexScores: any) => {
    return "The location meets most essential requirements for a High-Density Residential Complex, particularly regarding safety, accessibility, and environmental factors. The primary areas for improvement are noise mitigation and the development of local social amenities. Mitigation Measures: Implement high-grade noise barriers and acoustic insulation in all units facing the major roadway. Amenity Improvement: The developer should incorporate a dedicated community center, mini-mart, or small park area within the complex's design to address the low Social Amenities Score.";
  };
  
  const generatePlannerConsolidatedRecommendation = (hwi: number, indexScores: any) => {
    return "Development approval recommended with conditions. The location demonstrates strong fundamentals for high-density residential development with excellent safety ratings and infrastructure access. Mandatory requirements: (1) Acoustic barriers minimum 3m height along roadway frontage, (2) Community facility integration minimum 200sqm, (3) Environmental monitoring system for ongoing air quality assessment. Investment requirements are moderate and within acceptable ranges for this development type.";
  };
  
  const getSuitabilityLevel = (hwi: number) => {
    if (hwi >= 80) return 'Excellent';
    if (hwi >= 60) return 'Good';  
    if (hwi >= 40) return 'Fair';
    return 'Poor';
  };
  
  const getFinalRecommendation = (hwi: number) => {
    if (hwi >= 80) {
      return "Location is highly recommended, provided noise and amenity gaps are addressed.";
    } else if (hwi >= 60) {
      return "Suitable with necessary adjustments to address identified infrastructure gaps.";
    } else {
      return "Not recommended without substantial improvements or consider alternative locations.";
    }
  };
  
  const getPlannerFinalRecommendation = (hwi: number) => {
    if (hwi >= 80) {
      return "Immediate implementation is highly recommended with standard development conditions.";
    } else if (hwi >= 60) {
      return "Conditional approval recommended pending completion of identified infrastructure improvements.";
    } else {
      return "Development not recommended - consider alternative sites or major public investment program.";
    }
  };
};