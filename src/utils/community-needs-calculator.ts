import { CityHealthData, UrbanIndex } from '@/types/urban-indices';
import { LatLng } from 'leaflet';

export interface CommunityNeed {
  id: string;
  type: CommunityNeedType;
  position: LatLng;
  severity: 'critical' | 'moderate' | 'good';
  score: number;
  title: string;
  description: string;
  details: string;
  icon: string;
  color: string;
}

export type CommunityNeedType = 
  | 'food-access' 
  | 'housing' 
  | 'transportation' 
  | 'pollution' 
  | 'healthcare' 
  | 'parks' 
  | 'growth' 
  | 'energy';

export class CommunityNeedsCalculator {
  static analyzeLocation(
    lat: number, 
    lng: number, 
    healthData: CityHealthData
  ): CommunityNeed[] {
    const needs: CommunityNeed[] = [];
    const position = new LatLng(lat, lng);

    // Analyze each need type based on health data
    const foodAccess = this.analyzeFoodAccess(healthData);
    if (foodAccess.score < 70) {
      needs.push({
        ...foodAccess,
        position,
        id: `food-${lat}-${lng}`
      });
    }

    const housing = this.analyzeHousing(healthData);
    if (housing.score < 70) {
      needs.push({
        ...housing,
        position,
        id: `housing-${lat}-${lng}`
      });
    }

    const transportation = this.analyzeTransportation(healthData);
    if (transportation.score < 70) {
      needs.push({
        ...transportation,
        position,
        id: `transport-${lat}-${lng}`
      });
    }

    const pollution = this.analyzePollution(healthData);
    if (pollution.score < 70) {
      needs.push({
        ...pollution,
        position,
        id: `pollution-${lat}-${lng}`
      });
    }

    const healthcare = this.analyzeHealthcare(healthData);
    if (healthcare.score < 70) {
      needs.push({
        ...healthcare,
        position,
        id: `healthcare-${lat}-${lng}`
      });
    }

    const parks = this.analyzeParks(healthData);
    if (parks.score < 70) {
      needs.push({
        ...parks,
        position,
        id: `parks-${lat}-${lng}`
      });
    }

    const growth = this.analyzeGrowth(healthData);
    if (growth.score < 70) {
      needs.push({
        ...growth,
        position,
        id: `growth-${lat}-${lng}`
      });
    }

    const energy = this.analyzeEnergy(healthData);
    if (energy.score < 70) {
      needs.push({
        ...energy,
        position,
        id: `energy-${lat}-${lng}`
      });
    }

    return needs.sort((a, b) => a.score - b.score).slice(0, 5); // Top 5 critical needs
  }

  private static analyzeFoodAccess(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const tasScore = healthData.indices.tas?.total_score || 50;
    const ejtScore = healthData.indices.ejt?.total_score || 50;
    
    const score = Math.min(tasScore, ejtScore);

    return {
      type: 'food-access',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Food Access',
      description: 'Community needs better access to fresh, affordable food',
      details: `Based on service accessibility (${tasScore}) and resource equity (${ejtScore}), this area shows limited access to food resources.`,
      icon: '🍎',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeHousing(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const score = healthData.indices.scm?.total_score || 50;

    return {
      type: 'housing',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Housing Development',
      description: 'Area needs affordable housing and urban development',
      details: `Community trust and housing stability indicators show potential housing shortages. Current score: ${score}`,
      icon: '🏠',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeTransportation(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const score = healthData.indices.tas?.total_score || 50;

    return {
      type: 'transportation',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Transportation Access',
      description: 'Community needs better public transit and mobility options',
      details: `Transportation accessibility score indicates limited public transit coverage and job accessibility. Current score: ${score}`,
      icon: '🚌',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzePollution(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const aqhiScore = healthData.indices.aqhi?.total_score || 50;
    const wsiScore = healthData.indices.wsi?.total_score || 50;
    
    const score = Math.min(aqhiScore, wsiScore);

    return {
      type: 'pollution',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Pollution Control',
      description: 'Area dealing with air or water pollution issues',
      details: `Air quality (${aqhiScore}) and water quality (${wsiScore}) indicators show environmental concerns.`,
      icon: '🏭',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeHealthcare(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const tasScore = healthData.indices.tas?.total_score || 50;
    const ejtScore = healthData.indices.ejt?.total_score || 50;
    
    const score = Math.min(tasScore, ejtScore * 0.8); // Weight health disparities

    return {
      type: 'healthcare',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Healthcare Access',
      description: 'Community needs better healthcare facilities and services',
      details: `Healthcare accessibility and environmental health disparities indicate need for improved medical infrastructure. Current score: ${score.toFixed(1)}`,
      icon: '🏥',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeParks(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const score = healthData.indices.gea?.total_score || 50;

    return {
      type: 'parks',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Parks & Recreation',
      description: 'Community needs better access to parks and green spaces',
      details: `Green space accessibility and park distribution show limited recreational opportunities. Current score: ${score}`,
      icon: '🌳',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeGrowth(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const scmScore = healthData.indices.scm?.total_score || 50;
    const dpiScore = healthData.indices.dpi?.total_score || 50;
    
    const score = Math.min(scmScore, dpiScore);

    return {
      type: 'growth',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Urban Growth',
      description: 'Area experiencing growth requiring new housing development',
      details: `Community stability and infrastructure preparedness indicate areas of rapid growth needing planned development. Current score: ${score.toFixed(1)}`,
      icon: '🏗️',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }

  private static analyzeEnergy(healthData: CityHealthData): Omit<CommunityNeed, 'position' | 'id'> {
    const score = healthData.indices.dpi?.total_score || 50;

    return {
      type: 'energy',
      severity: score < 40 ? 'critical' : score < 70 ? 'moderate' : 'good',
      score,
      title: 'Energy Access',
      description: 'Community needs better access to reliable electricity and energy',
      details: `Disaster preparedness and infrastructure resilience indicators show potential energy access issues. Current score: ${score}`,
      icon: '⚡',
      color: score < 40 ? 'hsl(var(--danger))' : score < 70 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
    };
  }
}