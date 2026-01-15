import axios from 'axios';
import { API_CONFIG } from '@/config/api';
import { CityHealthData } from '@/types/urban-indices';

interface N8NWebhookParams {
  action: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  start?: string;
  end?: string;
  startDate?: string;
  endDate?: string;
  layers?: string[];
  message?: string;
  bounds?: { north: number; south: number; east: number; west: number };
  [key: string]: any;
}

export class N8NService {
  private readonly baseUrl = API_CONFIG.n8n.endpoint;
  private readonly timeout = 30000;

  /**
   * Trigger n8n webhook for dashboard data
   * Fetches data from: https://1658-892.n8nbysnbd.top/webhook/api/worldview/stats
   */
  async getDashboardData(
    latitude: number,
    longitude: number,
    startDate?: string,
    endDate?: string
  ): Promise<CityHealthData> {
    try {
      console.log('🔄 Calling n8n webhook for dashboard data:', {
        url: this.baseUrl,
        latitude,
        longitude
      });

      const response = await axios.get(this.baseUrl, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Webhook response received:', response.data);

      if (response.data) {
        return this.processHealthData(response.data, latitude, longitude);
      } else {
        throw new Error('No valid data received from webhook');
      }
    } catch (error) {
      console.error('❌ Dashboard data webhook error:', error);
      throw error; // Throw error to ensure real data is fetched
    }
  }

  /**
   * Trigger n8n webhook for chart data
   */
  async getChartData(
    latitude: number,
    longitude: number,
    layers: string[],
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const params: N8NWebhookParams = {
        action: 'chartdata',
        latitude,
        longitude,
        layers,
        startDate,
        endDate
      };

      console.log('📊 Calling n8n webhook for chart data:', params);

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      console.error('❌ Chart data webhook error:', error);
      return this.getFallbackChartData();
    }
  }

  /**
   * Trigger n8n webhook for area-based chart data
   */
  async getAreaChartData(
    bounds: { north: number; south: number; east: number; west: number },
    layers: string[],
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const params: N8NWebhookParams = {
        action: 'areachartdata',
        bounds,
        layers,
        startDate,
        endDate
      };

      console.log('📊 Calling n8n webhook for area chart data:', params);

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: this.timeout
      });

      return response.data;
    } catch (error) {
      console.error('❌ Area chart data webhook error:', error);
      return this.getFallbackChartData();
    }
  }

  /**
   * Trigger n8n webhook for chatbot
   */
  async getChatbotResponse(
    message: string,
    latitude?: number,
    longitude?: number
  ): Promise<any> {
    try {
      const params: N8NWebhookParams = {
        action: 'chatbot',
        message,
        latitude: latitude || 23.8103,
        longitude: longitude || 90.4125
      };

      console.log('🤖 Calling n8n webhook for chatbot:', params);

      const response = await axios.post(this.baseUrl, params, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Chatbot webhook error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      };
    }
  }

  /**
   * Process health data from n8n response
   */
  private processHealthData(data: any, latitude: number, longitude: number): CityHealthData {
    console.log('🔍 Processing webhook data:', data);
    
    // If data already has the correct structure
    if (data.indices && data.overall_score) {
      return {
        ...data,
        location: { latitude, longitude },
        timestamp: data.timestamp || new Date().toISOString(),
        last_updated: data.last_updated || new Date().toISOString()
      };
    }
    
    // Transform raw webhook data to CityHealthData format
    return this.transformToHealthData(data, latitude, longitude);
  }

  /**
   * Transform raw API data to CityHealthData format
   */
  private transformToHealthData(data: any, latitude: number, longitude: number): CityHealthData {
    console.log('🔄 Transforming webhook data to CityHealthData format');
    
    // Extract indices from webhook data
    const indices = data.indices || {};
    
    // Calculate overall score from indices
    const calculateOverallScore = () => {
      if (data.overall_score) return data.overall_score;
      
      const scores = Object.values(indices).map((idx: any) => idx.total_score || 0);
      return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 65;
    };
    
    // Determine health status based on overall score
    const getHealthStatus = (score: number) => {
      if (data.city_health_status) return data.city_health_status;
      if (score >= 80) return "Highly Healthy City";
      if (score >= 65) return "Moderately Healthy City";
      if (score >= 50) return "Needs Improvement";
      return "Critical Attention Required";
    };
    
    const overallScore = calculateOverallScore();
    
    return {
      timestamp: data.timestamp || new Date().toISOString(),
      location: { latitude, longitude },
      overall_score: overallScore,
      city_health_status: getHealthStatus(overallScore),
      indices: {
        cri: indices.cri || this.generateDefaultIndices().cri,
        uhvi: indices.uhvi || this.generateDefaultIndices().uhvi,
        aqhi: indices.aqhi || this.generateDefaultIndices().aqhi,
        wsi: indices.wsi || this.generateDefaultIndices().wsi,
        gea: indices.gea || this.generateDefaultIndices().gea,
        scm: indices.scm || this.generateDefaultIndices().scm,
        ejt: indices.ejt || this.generateDefaultIndices().ejt,
        tas: indices.tas || this.generateDefaultIndices().tas,
        dpi: indices.dpi || this.generateDefaultIndices().dpi,
        hwi: indices.hwi || this.generateDefaultIndices().hwi
      },
      data_quality: data.data_quality || "Good",
      last_updated: data.last_updated || new Date().toISOString()
    };
  }

  /**
   * Generate default indices when real data is unavailable
   */
  private generateDefaultIndices() {
    return {
      cri: {
        index_name: "Climate Resilience Index (CRI)",
        category: "Physical Health & Environmental Quality Indices",
        components: {
          temperatureAdaptationCapacity: 18,
          heatWavePreparedness: 15,
          floodRiskManagement: 12,
          airQualityResilience: 16,
          greenInfrastructureCoverage: 11
        },
        total_score: 72,
        target: 75,
        status: "Moderately Resilient"
      },
      uhvi: {
        index_name: "Urban Heat Vulnerability Index (UHVI)",
        category: "Physical Health & Environmental Quality Indices",
        components: {
          landSurfaceTemperature: 15,
          airTemperature: 8,
          heatIslandIntensity: 12,
          coolingInfrastructure: 8,
          populationVulnerability: 5
        },
        total_score: 48,
        target: 30,
        status: "High Heat Risk"
      },
      aqhi: {
        index_name: "Air Quality Health Impact (AQHI)",
        category: "Physical Health & Environmental Quality Indices",
        components: {
          no2Concentration: 2,
          pm25Concentration: 3,
          pm10Concentration: 2,
          o3Concentration: 1,
          so2Concentration: 0
        },
        total_score: 8,
        target: 4,
        status: "High Health Risk"
      },
      wsi: {
        index_name: "Water Security Indicator (WSI)",
        category: "Physical Health & Environmental Quality Indices",
        components: {
          surfaceWaterAvailability: 18,
          groundwaterSustainability: 15,
          waterQualityIndex: 20,
          accessEquityScore: 12,
          climateResilience: 8
        },
        total_score: 73,
        target: 70,
        status: "Water Secure"
      },
      gea: {
        index_name: "Green Equity Assessment (GEA)",
        category: "Mental Health & Social Well-being Indices",
        components: {
          greenSpaceDistribution: 20,
          parkAccessibility: 18,
          qualityOfGreenInfrastructure: 15,
          communityUsagePatterns: 10,
          maintenanceAndSafety: 7
        },
        total_score: 70,
        target: 75,
        status: "Moderate Green Equity"
      },
      scm: {
        index_name: "Social Cohesion Metrics (SCM)",
        category: "Mental Health & Social Well-being Indices",
        components: {
          communityFacilityAccess: 18,
          publicSpaceConnectivity: 15,
          economicIntegration: 14,
          culturalDiversitySupport: 16,
          safetyAndSecurity: 12
        },
        total_score: 75,
        target: 70,
        status: "Strong Community Cohesion"
      },
      ejt: {
        index_name: "Environmental Justice Tracker (EJT)",
        category: "Environmental Justice & Equity Indices",
        components: {
          pollutionBurdenEquity: 18,
          greenInfrastructureAccess: 16,
          climateRiskDistribution: 15,
          healthOutcomeEquity: 17,
          communityVoiceAndParticipation: 12
        },
        total_score: 78,
        target: 80,
        status: "Good Environmental Justice"
      },
      tas: {
        index_name: "Transportation Accessibility Score (TAS)",
        category: "Transportation & Mobility Indices",
        components: {
          publicTransitCoverage: 20,
          activeTransportationInfrastructure: 18,
          multiModalConnectivity: 16,
          affordabilityAndEquity: 12,
          environmentalPerformance: 8
        },
        total_score: 74,
        target: 75,
        status: "Good Transportation Access"
      },
      dpi: {
        index_name: "Disaster Preparedness Index (DPI)",
        category: "Disaster Preparedness & Safety Indices",
        components: {
          naturalHazardExposure: 15,
          infrastructureResilience: 18,
          emergencyResponseCapacity: 16,
          communityPreparedness: 14,
          recoveryResources: 7
        },
        total_score: 70,
        target: 70,
        status: "Well-Prepared for Disasters"
      },
      hwi: {
        index_name: "Human Well-being Index (HWI)",
        category: "Comprehensive Well-being Indices",
        components: {
          urbanHeatVulnerability: 48,
          airQualityHealth: 8,
          waterSecurity: 73,
          socialCohesion: 75,
          transportAccessibility: 74,
          disasterPreparedness: 70
        },
        total_score: 58,
        target: 80,
        status: "Moderate Human Well-being"
      }
    };
  }

  /**
   * Fallback chart data
   */
  private getFallbackChartData() {
    return {
      success: true,
      data: {
        labels: this.getLast30Days(),
        datasets: [
          {
            label: "CRI Score",
            data: this.generateRandomData(30, 60, 80),
            borderColor: "hsl(var(--chart-cri))",
            backgroundColor: "hsl(var(--chart-cri) / 0.1)"
          },
          {
            label: "Air Quality",
            data: this.generateRandomData(30, 40, 70),
            borderColor: "hsl(var(--chart-aqhi))",
            backgroundColor: "hsl(var(--chart-aqhi) / 0.1)"
          }
        ]
      }
    };
  }

  /**
   * Get array of last N days for chart labels
   */
  private getLast30Days(): string[] {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }

  /**
   * Generate random data for fallback charts
   */
  private generateRandomData(count: number, min: number, max: number): number[] {
    return Array.from({ length: count }, () => 
      Math.floor(Math.random() * (max - min + 1)) + min
    );
  }
}

export const n8nService = new N8NService();
