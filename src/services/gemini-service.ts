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

  async generateText(prompt: string, context?: string): Promise<string> {
    if (!API_CONFIG.n8n.enabled || !this.n8nEndpoint) {
      throw new Error('n8n webhook is not configured');
    }

    try {
      const fullPrompt = context ? `${context}\n\nUser question: ${prompt}` : prompt;
      
      const response = await axios.post(
        this.n8nEndpoint,
        {
          prompt: fullPrompt,
          type: 'gemini-request',
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Handle n8n response - assuming n8n returns the response in a standard format
      if (response.data && typeof response.data === 'string') {
        return response.data;
      }
      
      if (response.data && response.data.response) {
        return response.data.response;
      }

      if (response.data && response.data.text) {
        return response.data.text;
      }
      
      throw new Error('No response from n8n webhook');
    } catch (error) {
      console.error('n8n webhook error:', error);
      throw error;
    }
  }

  async analyzeUrbanData(data: any, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are an expert AI urban planning assistant powered by Gemini 1.5 Flash via n8n, specializing in policy-making for urban planners and residents. 
    Analyze the following urban health data for location ${location.latitude}, ${location.longitude} and provide insights, recommendations, and actionable policy advice for urban planners, city officials, and residents working together.
    
    IMPORTANT: All analysis is based on mock data for demonstration purposes.
    
    Focus on:
    1. Policy recommendations for urban planners and city governance
    2. Community engagement strategies for residents
    3. Collaborative policy-making approaches between planners and residents
    4. Specific actionable recommendations for implementation
    5. Potential risks and opportunities in policy development
    6. Best practices for urban sustainability and resident-centered planning
    7. Comparisons with healthy city standards and policy frameworks`;

    const prompt = `Urban Health Data Analysis:
    ${JSON.stringify(data, null, 2)}
    
    Please provide a comprehensive analysis with specific recommendations for improving city health and sustainability.`;

    return this.generateText(prompt, context);
  }

  async generateUrbanInsights(query: string, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are an expert AI urban intelligence assistant powered by Gemini 1.5 Flash via n8n, specialized in policy-making for urban planners and residents. Help users understand urban health, sustainability, smart city concepts, and collaborative policy development. 
    Current location: ${location.latitude}, ${location.longitude}
    
    IMPORTANT: All insights are based on mock data for demonstration purposes.
    
    Provide practical, actionable advice about:
    - Urban planning and policy development
    - Community engagement and resident participation
    - Collaborative policy-making between planners and residents
    - Environmental health and sustainability policies
    - Smart city technologies and governance
    - Resident-centered urban development strategies`;

    return this.generateText(query, context);
  }
}

export const geminiService = new GeminiService();