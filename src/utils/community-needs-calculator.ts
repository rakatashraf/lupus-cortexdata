import { CityHealthData, UrbanIndex } from '@/types/urban-indices';

export interface CommunityNeed {
  id: string;
  name: string;
  icon: string;
  description: string;
  score: number;
  level: 'critical' | 'high' | 'moderate' | 'low';
  color: string;
  position?: { lat: number; lng: number };
}

export interface NeedsAnalysis {
  flags: CommunityNeed[];
  priorityCount: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  totalScore: number;
}

// Map community needs to existing urban indices
export class CommunityNeedsCalculator {
  static calculateCommunityNeeds(
    data: CityHealthData,
    lat: number,
    lng: number
  ): NeedsAnalysis {
    const flags: CommunityNeed[] = [];

    // 1. Food Access - Based on EJT Resource Access + TAS Service Access
    const foodAccess = this.calculateFoodAccess(data.indices.ejt, data.indices.tas);
    flags.push({
      id: 'food',
      name: 'Food Access',
      icon: '🍎',
      description: 'Community access to healthy, affordable food options',
      score: foodAccess.score,
      level: foodAccess.level,
      color: foodAccess.color,
      position: { lat, lng }
    });

    // 2. Housing - Based on SCM Community Trust + urban development indicators
    const housing = this.calculateHousing(data.indices.scm, data.overall_score);
    flags.push({
      id: 'housing',
      name: 'Housing',
      icon: '🏠',
      description: 'Availability and affordability of adequate housing',
      score: housing.score,
      level: housing.level,
      color: housing.color,
      position: { lat: lat + 0.001, lng: lng + 0.001 }
    });

    // 3. Transportation - Based on TAS
    const transportation = this.calculateTransportation(data.indices.tas);
    flags.push({
      id: 'transportation',
      name: 'Transportation',
      icon: '🚌',
      description: 'Public transit access and mobility options',
      score: transportation.score,
      level: transportation.level,
      color: transportation.color,
      position: { lat: lat - 0.001, lng: lng + 0.001 }
    });

    // 4. Pollution - Based on AQHI + WSI
    const pollution = this.calculatePollution(data.indices.aqhi, data.indices.wsi);
    flags.push({
      id: 'pollution',
      name: 'Air/Water Quality',
      icon: '🏭',
      description: 'Environmental pollution levels affecting health',
      score: pollution.score,
      level: pollution.level,
      color: pollution.color,
      position: { lat: lat + 0.002, lng: lng - 0.001 }
    });

    // 5. Healthcare - Based on TAS Service Access
    const healthcare = this.calculateHealthcare(data.indices.tas, data.indices.ejt);
    flags.push({
      id: 'healthcare',
      name: 'Healthcare Access',
      icon: '🏥',
      description: 'Access to medical facilities and services',
      score: healthcare.score,
      level: healthcare.level,
      color: healthcare.color,
      position: { lat: lat - 0.002, lng: lng - 0.001 }
    });

    // 6. Parks & Recreation - Based on GEA
    const parks = this.calculateParksAccess(data.indices.gea);
    flags.push({
      id: 'parks',
      name: 'Parks & Recreation',
      icon: '🌳',
      description: 'Access to green spaces and recreational facilities',
      score: parks.score,
      level: parks.level,
      color: parks.color,
      position: { lat: lat + 0.001, lng: lng - 0.002 }
    });

    // 7. Growth & Development - Based on multiple indicators
    const growth = this.calculateGrowthNeeds(data.indices.dpi, data.indices.scm);
    flags.push({
      id: 'growth',
      name: 'Growth & Development',
      icon: '🏗️',
      description: 'Urban development and infrastructure needs',
      score: growth.score,
      level: growth.level,
      color: growth.color,
      position: { lat: lat - 0.001, lng: lng + 0.002 }
    });

    // 8. Energy Access - Based on DPI Infrastructure + CRI
    const energy = this.calculateEnergyAccess(data.indices.dpi, data.indices.cri);
    flags.push({
      id: 'energy',
      name: 'Energy Access',
      icon: '⚡',
      description: 'Reliable access to electricity and energy services',
      score: energy.score,
      level: energy.level,
      color: energy.color,
      position: { lat: lat + 0.002, lng: lng + 0.002 }
    });

    // Calculate priority distribution
    const priorityCount = {
      critical: flags.filter(f => f.level === 'critical').length,
      high: flags.filter(f => f.level === 'high').length,
      moderate: flags.filter(f => f.level === 'moderate').length,
      low: flags.filter(f => f.level === 'low').length
    };

    const totalScore = Math.round(flags.reduce((sum, flag) => sum + flag.score, 0) / flags.length);

    return { flags, priorityCount, totalScore };
  }

  private static calculateFoodAccess(ejt: UrbanIndex, tas: UrbanIndex) {
    const resourceAccess = ejt.components?.['Resource Access Equity'] || 0;
    const serviceAccess = tas.components?.['Service Access Score'] || 0;
    const score = Math.round((resourceAccess + serviceAccess) / 2);
    
    return {
      score,
      level: this.getLevel(score, true), // inverse for food access (lower is worse)
      color: this.getColor(score, true)
    };
  }

  private static calculateHousing(scm: UrbanIndex, overallScore: number) {
    const communityTrust = scm.components?.['Community Trust Level'] || 0;
    const score = Math.round((communityTrust + overallScore) / 2);
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static calculateTransportation(tas: UrbanIndex) {
    const score = tas.total_score;
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static calculatePollution(aqhi: UrbanIndex, wsi: UrbanIndex) {
    const airScore = 100 - aqhi.total_score; // inverse for pollution
    const waterScore = wsi.total_score;
    const score = Math.round((airScore + waterScore) / 2);
    
    return {
      score,
      level: this.getLevel(score, false), // higher pollution score = worse
      color: this.getColor(score, false)
    };
  }

  private static calculateHealthcare(tas: UrbanIndex, ejt: UrbanIndex) {
    const serviceAccess = tas.components?.['Service Access Score'] || 0;
    const healthEquity = ejt.components?.['Environmental Health Disparities'] || 0;
    const score = Math.round((serviceAccess + (100 - healthEquity)) / 2);
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static calculateParksAccess(gea: UrbanIndex) {
    const score = gea.total_score;
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static calculateGrowthNeeds(dpi: UrbanIndex, scm: UrbanIndex) {
    const infrastructure = dpi.components?.['Infrastructure Resilience'] || 0;
    const communityReadiness = scm.total_score;
    const score = Math.round((infrastructure + communityReadiness) / 2);
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static calculateEnergyAccess(dpi: UrbanIndex, cri: UrbanIndex) {
    const infraResilience = dpi.components?.['Infrastructure Resilience'] || 0;
    const climateResilience = cri.total_score;
    const score = Math.round((infraResilience + climateResilience) / 2);
    
    return {
      score,
      level: this.getLevel(score, true),
      color: this.getColor(score, true)
    };
  }

  private static getLevel(score: number, inverse: boolean = true): 'critical' | 'high' | 'moderate' | 'low' {
    if (inverse) {
      if (score >= 80) return 'low';
      if (score >= 60) return 'moderate';
      if (score >= 40) return 'high';
      return 'critical';
    } else {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'moderate';
      return 'low';
    }
  }

  private static getColor(score: number, inverse: boolean = true): string {
    if (inverse) {
      if (score >= 80) return 'hsl(var(--success))';
      if (score >= 60) return 'hsl(var(--info))';
      if (score >= 40) return 'hsl(var(--warning))';
      return 'hsl(var(--danger))';
    } else {
      if (score >= 80) return 'hsl(var(--danger))';
      if (score >= 60) return 'hsl(var(--warning))';
      if (score >= 40) return 'hsl(var(--info))';
      return 'hsl(var(--success))';
    }
  }
}