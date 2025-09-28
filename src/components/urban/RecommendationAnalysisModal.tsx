import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin, 
  Star, 
  Download,
  Home,
  Building2,
  Users,
  Heart,
  Shield,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

export interface EnhancedRecommendation {
  area: string;
  rating: number;
  reasons: string[];
  coordinates: { lat: number; lng: number };
  indexScores: { [key: string]: number };
  residentSummary: {
    suitabilityTags: string[];
    dailyLifeImpact: string;
    familyFriendly: boolean;
    seniorFriendly: boolean;
    healthConsiderations: string[];
    quickDecisionFactors: string[];
  };
  plannerAnalysis: {
    technicalMetrics: { [key: string]: any };
    developmentPotential: string;
    policyRecommendations: string[];
    investmentAnalysis: string;
    riskFactors: string[];
    improvementTimeline: { [key: string]: string };
    comparativeAnalysis: string;
  };
}

interface RecommendationAnalysisModalProps {
  recommendation: EnhancedRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadPDF: (recommendation: EnhancedRecommendation, type: 'resident' | 'planner') => void;
}

export const RecommendationAnalysisModal: React.FC<RecommendationAnalysisModalProps> = ({
  recommendation,
  isOpen,
  onClose,
  onDownloadPDF
}) => {
  if (!recommendation) return null;

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-600";
    if (rating >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const formatScore = (score: number) => Math.round(score);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5" />
            {recommendation.area}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < recommendation.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className={`ml-1 font-medium ${getRatingColor(recommendation.rating)}`}>
                {recommendation.rating}/5
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {recommendation.coordinates.lat.toFixed(4)}, {recommendation.coordinates.lng.toFixed(4)}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resident" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resident" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Resident Overview
            </TabsTrigger>
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Urban Planner Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resident" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  What This Means for You
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {recommendation.residentSummary.dailyLifeImpact}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Suitability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {recommendation.residentSummary.suitabilityTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-600" />
                      Health & Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {recommendation.residentSummary.healthConsiderations.map((consideration, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                          {consideration}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Key Decision Factors
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendation.residentSummary.quickDecisionFactors.map((factor, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => onDownloadPDF(recommendation, 'resident')}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Resident Summary Report
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="planner" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Technical Analysis
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(recommendation.indexScores).map(([index, score]) => (
                    <div key={index} className="text-center p-3 rounded-lg border">
                      <div className="text-xs text-muted-foreground mb-1">{index}</div>
                      <div className={`text-lg font-bold px-2 py-1 rounded ${getScoreColor(score)}`}>
                        {formatScore(score)}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  {recommendation.plannerAnalysis.comparativeAnalysis}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Development Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{recommendation.plannerAnalysis.developmentPotential}</p>
                    <div className="text-sm">
                      <span className="font-medium">Investment Analysis:</span>
                      <p className="text-muted-foreground mt-1">
                        {recommendation.plannerAnalysis.investmentAnalysis}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recommendation.plannerAnalysis.riskFactors.map((risk, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-orange-600 mt-1 flex-shrink-0" />
                          {risk}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Policy Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recommendation.plannerAnalysis.policyRecommendations.map((policy, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                          {policy}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Implementation Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(recommendation.plannerAnalysis.improvementTimeline).map(([timeframe, action]) => (
                        <div key={timeframe} className="border-l-2 border-primary/20 pl-3">
                          <div className="text-sm font-medium">{timeframe}</div>
                          <div className="text-sm text-muted-foreground">{action}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => onDownloadPDF(recommendation, 'planner')}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Technical Analysis Report
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};