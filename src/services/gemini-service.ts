import { API_CONFIG, API_ENDPOINTS } from '@/config/api';
import axios from 'axios';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiService {
  private n8nEndpoint = API_CONFIG.n8n.endpoint;

  async generateText(prompt: string, context?: string, retries: number = 2): Promise<string> {
    if (!API_CONFIG.n8n.enabled || !this.n8nEndpoint) {
      throw new Error('Lupus Cortex AI webhook is not configured');
    }

    const fullPrompt = context ? `${context}\n\nUser question: ${prompt}` : prompt;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`AI Request attempt ${attempt + 1}:`, {
          endpoint: this.n8nEndpoint,
          promptLength: fullPrompt.length
        });

        const response = await axios.post(
          this.n8nEndpoint,
          {
            prompt: fullPrompt,
            type: 'gemini-request',
            timestamp: new Date().toISOString(),
            source: 'urban-intelligence-dashboard'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Urban-Intelligence-Dashboard/1.0'
            },
            timeout: 45000
          }
        );

        console.log('AI Response received:', {
          status: response.status,
          dataType: typeof response.data,
          hasData: !!response.data
        });

        // Enhanced response parsing for different webhook response formats
        if (response.data) {
          // Handle direct string response
          if (typeof response.data === 'string' && response.data.trim()) {
            return response.data.trim();
          }
          
          // Handle structured responses with various possible keys
          const possibleKeys = ['response', 'text', 'content', 'result', 'answer', 'output'];
          for (const key of possibleKeys) {
            if (response.data[key] && typeof response.data[key] === 'string') {
              return response.data[key].trim();
            }
          }

          // Handle nested response structures
          if (response.data.data && typeof response.data.data === 'string') {
            return response.data.data.trim();
          }

          // Handle Gemini-style response structure
          if (response.data.candidates && response.data.candidates[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text.trim();
          }
        }
        
        throw new Error('Invalid response format from AI webhook');

      } catch (error: any) {
        console.error(`AI Request attempt ${attempt + 1} failed:`, {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        if (attempt === retries) {
          if (error.code === 'ECONNABORTED') {
            throw new Error('AI request timeout - please try again');
          }
          if (error.response?.status === 404) {
            throw new Error('AI webhook endpoint not found - please check configuration');
          }
          if (error.response?.status >= 500) {
            throw new Error('AI service temporarily unavailable - please try again');
          }
          throw new Error(`AI service error: ${error.message}`);
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    throw new Error('AI request failed after all retries');
  }

  async analyzeUrbanData(data: any, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are Lupus Cortex AI, an expert urban planning assistant powered by Gemini 1.5 Flash, specializing in policy-making for urban planners and residents. 
    
    Location: ${location.latitude}°N, ${location.longitude}°E
    
    ANALYSIS FRAMEWORK:
    1. **Policy Recommendations**: Specific, actionable policy measures for urban governance
    2. **Community Engagement**: Strategies for meaningful resident participation
    3. **Implementation Roadmap**: Step-by-step approach for policy execution  
    4. **Risk Assessment**: Identify potential challenges and mitigation strategies
    5. **Sustainability Metrics**: Environmental and social impact indicators
    6. **Best Practices**: Reference successful urban planning case studies
    7. **Stakeholder Integration**: Coordinate between planners, officials, and residents
    
    IMPORTANT: Analysis based on demonstration data. Provide professional, evidence-based recommendations.`;

    const prompt = `URBAN HEALTH DATA ANALYSIS REQUEST

Location: ${location.latitude}, ${location.longitude}
Data: ${JSON.stringify(data, null, 2)}

Provide a comprehensive policy analysis with:
- Executive summary of key findings
- Priority recommendations with implementation timelines
- Community engagement strategies
- Success metrics and monitoring approach
- Resource requirements and funding considerations

Format your response in clear sections with actionable insights.`;

    return this.generateText(prompt, context);
  }

  async generateUrbanInsights(query: string, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are Lupus Cortex AI, an expert urban intelligence assistant powered by Gemini 1.5 Flash, specializing in evidence-based policy development for urban planners and residents.
    
    Current Context:
    - Location: ${location.latitude}°N, ${location.longitude}°E
    - Focus: Urban health, sustainability, and smart city governance
    - Audience: Urban planners, city officials, and engaged residents
    
    EXPERTISE AREAS:
    ✓ Urban Planning & Policy Development
    ✓ Environmental Health & Sustainability Policies  
    ✓ Smart City Technologies & Digital Governance
    ✓ Community Engagement & Participatory Planning
    ✓ Data-Driven Decision Making for Cities
    ✓ Climate Resilience & Adaptation Strategies
    ✓ Social Equity & Inclusive Urban Development
    
    RESPONSE GUIDELINES:
    - Provide specific, actionable recommendations
    - Reference relevant case studies and best practices
    - Include implementation considerations and timelines
    - Address potential challenges and solutions
    - Focus on collaborative approaches between stakeholders
    
    NOTE: Insights based on demonstration data for showcasing capabilities.`;

    return this.generateText(query, context);
  }

  // Add webhook health check method
  async checkWebhookHealth(): Promise<{ status: 'online' | 'offline' | 'unknown'; message: string }> {
    try {
      const response = await axios.post(
        this.n8nEndpoint,
        {
          type: 'health-check',
          timestamp: new Date().toISOString()
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      return {
        status: 'online',
        message: 'Lupus Cortex AI is ready'
      };
    } catch (error: any) {
      console.error('Webhook health check failed:', error);
      return {
        status: 'offline',
        message: error.response?.status === 404 
          ? 'AI endpoint not found' 
          : 'AI service temporarily unavailable'
      };
    }
  }
}

export const geminiService = new GeminiService();