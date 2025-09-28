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
  private requestQueue: Promise<any>[] = [];

  private detectErrorType(error: any): 'cors' | 'network' | 'timeout' | 'server' | 'unknown' {
    if (error.code === 'ERR_NETWORK') return 'cors';
    if (error.code === 'ECONNABORTED') return 'timeout';
    if (error.response?.status >= 500) return 'server';
    if (error.message?.includes('CORS')) return 'cors';
    if (error.message?.includes('Network Error')) return 'network';
    return 'unknown';
  }

  private getErrorMessage(errorType: string, attempt: number, maxRetries: number): string {
    const messages = {
      cors: `Network connectivity issue (CORS). This often resolves automatically. Attempt ${attempt}/${maxRetries}`,
      network: `Connection failed. Checking network connectivity. Attempt ${attempt}/${maxRetries}`,
      timeout: `Request timeout. AI processing may be slow. Attempt ${attempt}/${maxRetries}`,
      server: `AI service temporarily unavailable. Retrying... Attempt ${attempt}/${maxRetries}`,
      unknown: `Unexpected error occurred. Retrying... Attempt ${attempt}/${maxRetries}`
    };
    return messages[errorType] || messages.unknown;
  }

  async generateText(prompt: string, context?: string, retries: number = 3): Promise<string> {
    if (!API_CONFIG.n8n.enabled || !this.n8nEndpoint) {
      throw new Error('Lupus Cortex AI webhook is not configured. Please check your connection settings.');
    }

    // Validate webhook URL
    try {
      new URL(this.n8nEndpoint);
    } catch {
      throw new Error('Invalid webhook URL configuration');
    }

    const fullPrompt = context ? `${context}\n\nUser question: ${prompt}` : prompt;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 AI Request attempt ${attempt + 1}/${retries + 1}:`, {
          endpoint: this.n8nEndpoint,
          promptLength: fullPrompt.length,
          timestamp: new Date().toISOString()
        });

        const requestPayload = {
          prompt: fullPrompt,
          type: 'gemini-request',
          timestamp: new Date().toISOString(),
          source: 'urban-intelligence-dashboard',
          version: '1.0',
          retry_attempt: attempt
        };

        const response = await axios.post(
          this.n8nEndpoint,
          requestPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Urban-Intelligence-Dashboard/1.0',
              'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: attempt === 0 ? 30000 : 45000, // Shorter timeout on first attempt
            withCredentials: false // Explicitly handle CORS
          }
        );

        console.log('✅ AI Response received:', {
          status: response.status,
          statusText: response.statusText,
          dataType: typeof response.data,
          hasData: !!response.data,
          headers: response.headers
        });

        // Enhanced response parsing with better error handling
        const responseText = this.parseWebhookResponse(response.data);
        if (responseText && responseText.length > 0) {
          return responseText;
        }
        
        throw new Error('Empty response from AI webhook');

      } catch (error: any) {
        const errorType = this.detectErrorType(error);
        const errorMessage = this.getErrorMessage(errorType, attempt + 1, retries + 1);
        
        console.error(`❌ AI Request attempt ${attempt + 1} failed:`, {
          errorType,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: this.n8nEndpoint
        });

        // For the last attempt, throw a user-friendly error
        if (attempt === retries) {
          const finalErrors = {
            cors: 'Connection blocked by browser security. The AI service may need CORS configuration.',
            network: 'Cannot reach AI service. Please check your internet connection.',
            timeout: 'AI service is taking too long to respond. Please try again.',
            server: 'AI service is temporarily unavailable. Please try again in a moment.',
            unknown: 'AI service encountered an error. Please try again.'
          };
          throw new Error(finalErrors[errorType] || finalErrors.unknown);
        }

        // Progressive retry delays: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('AI request failed after all retry attempts');
  }

  private parseWebhookResponse(data: any): string {
    if (!data) throw new Error('No data received from webhook');

    // Handle direct string response
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }
    
    // Handle structured responses with various possible keys
    const possibleKeys = ['response', 'text', 'content', 'result', 'answer', 'output', 'message'];
    for (const key of possibleKeys) {
      if (data[key] && typeof data[key] === 'string' && data[key].trim()) {
        return data[key].trim();
      }
    }

    // Handle nested response structures
    if (data.data && typeof data.data === 'string' && data.data.trim()) {
      return data.data.trim();
    }

    // Handle Gemini-style response structure
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    }

    // Handle n8n-style wrapped responses
    if (data.body && typeof data.body === 'string') {
      return data.body.trim();
    }

    throw new Error('Unrecognized response format from webhook');
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

  // Enhanced webhook health check with multiple methods
  async checkWebhookHealth(): Promise<{ status: 'online' | 'offline' | 'unknown'; message: string; details?: any }> {
    if (!this.n8nEndpoint) {
      return {
        status: 'offline',
        message: 'Webhook URL not configured'
      };
    }

    try {
      // Try a simple health check first
      console.log('🔍 Checking webhook health...', this.n8nEndpoint);
      
      const response = await axios.post(
        this.n8nEndpoint,
        {
          type: 'health-check',
          timestamp: new Date().toISOString(),
          source: 'health-check'
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 8000,
          withCredentials: false
        }
      );

      console.log('✅ Health check successful:', response.status);
      return {
        status: 'online',
        message: 'Lupus Cortex AI is ready',
        details: {
          status: response.status,
          responseTime: Date.now()
        }
      };

    } catch (error: any) {
      console.error('❌ Webhook health check failed:', {
        message: error.message,
        status: error.response?.status,
        code: error.code
      });

      const errorType = this.detectErrorType(error);
      const messages = {
        cors: 'Connection blocked - CORS issue detected',
        network: 'Network connectivity problem',
        timeout: 'Health check timeout',
        server: 'AI service unavailable (server error)',
        unknown: 'Health check failed'
      };

      return {
        status: 'offline',
        message: messages[errorType] || 'AI service temporarily unavailable',
        details: {
          errorType,
          status: error.response?.status,
          code: error.code
        }
      };
    }
  }

  // Quick connectivity test without payload
  async quickConnectivityTest(): Promise<boolean> {
    try {
      const response = await axios.get(this.n8nEndpoint.replace('/webhook-test/', '/health/'), {
        timeout: 3000,
        withCredentials: false
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const geminiService = new GeminiService();