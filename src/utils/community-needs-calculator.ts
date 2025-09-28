import { CityHealthData, UrbanIndex } from '../types/urban-indices';

export interface CommunityNeed {
  id: string;
  name: string;
  icon: string;
  description: string;
  score: number;
  level: 'critical' | 'high' | 'moderate' | 'low';
  color: string;
  position: { lat: number; lng: number };
  clusterSize?: number;
}

export interface NeedsAnalysis {
  flags: CommunityNeed[];
  needsCounts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  totalScore: number;
}

// Map community needs to existing urban indices
export class CommunityNeedsCalculator {
  // Enhanced method for area analysis
  static calculateAreaCommunityNeeds(
    data: CityHealthData,
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }
  ): NeedsAnalysis & { areaStats: any } {
    const samplingPoints = this.generateSamplingPoints(bounds, 6); // Generate 6 sampling points
    const allFlags: CommunityNeed[] = [];
    
    // Analyze each sampling point
    samplingPoints.forEach((point, index) => {
      const pointAnalysis = this.calculateCommunityNeeds(data, point.lat, point.lng);
      allFlags.push(...pointAnalysis.flags);
    });

    // Cluster similar flags and get area-wide statistics  
    const clusteredFlags = this.clusterFlags(allFlags);
    const areaStats = this.calculateAreaStats(allFlags, bounds);
    
    const needsCounts = clusteredFlags.reduce(
      (acc, flag) => {
        acc[flag.level]++;
        return acc;
      },
      { critical: 0, high: 0, moderate: 0, low: 0 }
    );

    const totalScore = clusteredFlags.reduce((sum, flag) => sum + flag.score, 0) / clusteredFlags.length;

    return {
      flags: clusteredFlags,
      needsCounts,
      totalScore,
      areaStats
    };
  }

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
      description: 'Access to reliable and affordable transportation',
      score: transportation.score,
      level: transportation.level,
      color: transportation.color,
      position: { lat: lat - 0.001, lng: lng + 0.001 }
    });

    // 4. Pollution - Based on AQHI + water quality indicators
    const pollution = this.calculatePollution(data.indices.aqhi, data.indices.wsi);
    flags.push({
      id: 'pollution',
      name: 'Environmental Quality',
      icon: '🏭',
      description: 'Air and water quality issues affecting community health',
      score: pollution.score,
      level: pollution.level,
      color: pollution.color,
      position: { lat: lat + 0.001, lng: lng - 0.001 }
    });

    // 5. Healthcare - Based on proximity to health services + health outcomes
    const healthcare = this.calculateHealthcare(data.indices.ejt, data.overall_score);
    flags.push({
      id: 'healthcare',
      name: 'Healthcare Access',
      icon: '🏥',
      description: 'Access to healthcare facilities and services',
      score: healthcare.score,
      level: healthcare.level,
      color: healthcare.color,
      position: { lat: lat - 0.001, lng: lng - 0.001 }
    });

    // 6. Parks - Based on GEA Environmental Access
    const parks = this.calculateParks(data.indices.gea);
    flags.push({
      id: 'parks',
      name: 'Green Spaces',
      icon: '🌳',
      description: 'Access to parks and recreational green spaces',
      score: parks.score,
      level: parks.level,
      color: parks.color,
      position: { lat: lat + 0.0015, lng: lng }
    });

    // 7. Growth - Based on development pressure indicators
    const growth = this.calculateGrowth(data.indices.dpi, data.overall_score);
    flags.push({
      id: 'growth',
      name: 'Development Pressure',
      icon: '🏗️',
      description: 'Areas experiencing rapid growth needing infrastructure',
      score: growth.score,
      level: growth.level,
      color: growth.color,
      position: { lat: lat - 0.0015, lng: lng }
    });

    // 8. Energy - Based on infrastructure access + sustainability
    const energy = this.calculateEnergy(data.indices.tas, data.indices.gea);
    flags.push({
      id: 'energy',
      name: 'Energy Access',
      icon: '⚡',
      description: 'Access to reliable and sustainable energy sources',
      score: energy.score,
      level: energy.level,
      color: energy.color,
      position: { lat, lng: lng + 0.0015 }
    });

    // Calculate summary statistics
    const needsCounts = flags.reduce(
      (acc, flag) => {
        acc[flag.level]++;
        return acc;
      },
      { critical: 0, high: 0, moderate: 0, low: 0 }
    );

    const totalScore = flags.reduce((sum, flag) => sum + flag.score, 0) / flags.length;

    return {
      flags,
      needsCounts,
      totalScore
    };
  }

  // Private calculation methods for each community need
  private static calculateFoodAccess(ejt: UrbanIndex, tas: UrbanIndex) {
    const resourceScore = ejt?.components && typeof ejt.components === 'object' ? 
      Object.values(ejt.components).find(() => true) || 50 : 50;
    const serviceScore = tas?.components && typeof tas.components === 'object' ? 
      Object.values(tas.components).find(() => true) || 50 : 50;
    const score = 100 - ((resourceScore + serviceScore) / 2); // Inverse scoring
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateHousing(scm: UrbanIndex, overallScore: number) {
    const communityScore = scm?.components && typeof scm.components === 'object' ? 
      Object.values(scm.components)[0] || 50 : 50;
    const developmentPressure = 100 - overallScore; // Higher overall score = less housing pressure
    const score = (developmentPressure + (100 - communityScore)) / 2;
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateTransportation(tas: UrbanIndex) {
    const accessScore = tas?.components && typeof tas.components === 'object' ? 
      Object.values(tas.components)[0] || 50 : 50;
    const score = 100 - accessScore; // Inverse scoring
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculatePollution(aqhi: UrbanIndex, wsi: UrbanIndex) {
    const airScore = 100 - (aqhi?.total_score || 50); // Lower AQHI = more pollution
    const waterScore = 100 - (wsi?.total_score || 50); // Lower WSI = more pollution
    const score = (airScore + waterScore) / 2;
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateHealthcare(ejt: UrbanIndex, overallScore: number) {
    const healthAccess = ejt?.components && typeof ejt.components === 'object' ? 
      Object.values(ejt.components)[0] || 50 : 50;
    const communityHealth = overallScore; // Higher overall score = better health outcomes
    const score = 100 - ((healthAccess + communityHealth) / 2);
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateParks(gea: UrbanIndex) {
    const greenAccess = gea?.components && typeof gea.components === 'object' ? 
      Object.values(gea.components)[0] || 50 : 50;
    const score = 100 - greenAccess; // Inverse scoring
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateGrowth(dpi: UrbanIndex, overallScore: number) {
    const developmentPressure = dpi?.total_score || 50;
    const infrastructureStrain = 100 - overallScore;
    const score = (developmentPressure + infrastructureStrain) / 2;
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static calculateEnergy(tas: UrbanIndex, gea: UrbanIndex) {
    const infrastructureAccess = tas?.components && typeof tas.components === 'object' ? 
      Object.values(tas.components)[0] || 50 : 50;
    const sustainabilityScore = gea?.components && typeof gea.components === 'object' ? 
      Object.values(gea.components)[0] || 50 : 50;
    const score = 100 - ((infrastructureAccess + sustainabilityScore) / 2);
    
    return {
      score,
      level: this.getLevel(score),
      color: this.getColor(score)
    };
  }

  private static getLevel(score: number, inverse: boolean = true): 'critical' | 'high' | 'moderate' | 'low' {
    if (inverse) {
      if (score >= 80) return 'critical';
      if (score >= 60) return 'high';
      if (score >= 40) return 'moderate';
      return 'low';
    } else {
      if (score >= 80) return 'low';
      if (score >= 60) return 'moderate';
      if (score >= 40) return 'high';
      return 'critical';
    }
  }

  private static getColor(score: number, inverse: boolean = true): string {
    if (inverse) {
      if (score >= 80) return '#ef4444'; // red-500
      if (score >= 60) return '#f97316'; // orange-500  
      if (score >= 40) return '#eab308'; // yellow-500
      return '#22c55e'; // green-500
    } else {
      if (score >= 80) return '#22c55e'; // green-500
      if (score >= 60) return '#eab308'; // yellow-500
      if (score >= 40) return '#f97316'; // orange-500
      return '#ef4444'; // red-500
    }
  }

  // Helper methods for area analysis
  private static generateSamplingPoints(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    count: number
  ): { lat: number; lng: number }[] {
    const points: { lat: number; lng: number }[] = [];
    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;
    
    // Generate evenly distributed points within the bounds
    const gridSize = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize && points.length < count; j++) {
        const lat = bounds.south + (latRange * (i + 0.5)) / gridSize;
        const lng = bounds.west + (lngRange * (j + 0.5)) / gridSize;
        points.push({ lat, lng });
      }
    }
    
    return points;
  }

  private static clusterFlags(flags: CommunityNeed[]): CommunityNeed[] {
    const flagGroups: { [key: string]: CommunityNeed[] } = {};
    
    // Group flags by type
    flags.forEach(flag => {
      if (!flagGroups[flag.id]) {
        flagGroups[flag.id] = [];
      }
      flagGroups[flag.id].push(flag);
    });

    // Create representative flags for each group
    const clusteredFlags: CommunityNeed[] = [];
    
    Object.entries(flagGroups).forEach(([id, groupFlags]) => {
      if (groupFlags.length === 0) return;
      
      // Calculate average position and score
      const avgLat = groupFlags.reduce((sum, f) => sum + f.position.lat, 0) / groupFlags.length;
      const avgLng = groupFlags.reduce((sum, f) => sum + f.position.lng, 0) / groupFlags.length;
      const avgScore = groupFlags.reduce((sum, f) => sum + f.score, 0) / groupFlags.length;
      
      // Get the most severe level
      const levelPriority = { critical: 4, high: 3, moderate: 2, low: 1 };
      const mostSevereLevel = groupFlags.reduce((prev, curr) => 
        levelPriority[curr.level] > levelPriority[prev.level] ? curr : prev
      ).level;
      
      clusteredFlags.push({
        ...groupFlags[0],
        position: { lat: avgLat, lng: avgLng },
        score: avgScore,
        level: mostSevereLevel,
        color: this.getColor(avgScore, true),
        clusterSize: groupFlags.length
      });
    });
    
    return clusteredFlags;
  }

  private static calculateAreaStats(
    flags: CommunityNeed[],
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    }
  ) {
    const flagsByType = flags.reduce((acc, flag) => {
      if (!acc[flag.id]) {
        acc[flag.id] = [];
      }
      acc[flag.id].push(flag);
      return acc;
    }, {} as { [key: string]: CommunityNeed[] });

    const areaKm2 = this.calculateAreaSize(bounds);
    
    return {
      totalArea: areaKm2,
      flagDensity: flags.length / areaKm2,
      priorityDistribution: Object.entries(flagsByType).map(([type, typeFlags]) => ({
        type,
        count: typeFlags.length,
        avgScore: typeFlags.reduce((sum, f) => sum + f.score, 0) / typeFlags.length,
        severity: typeFlags.filter(f => f.level === 'critical' || f.level === 'high').length
      }))
    };
  }

  private static calculateAreaSize(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): number {
    // Approximate area calculation in km²
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    return Math.abs(latDiff * lngDiff * 111 * 111 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180));
  }
}