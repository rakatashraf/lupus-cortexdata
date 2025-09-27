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
  private apiKey = API_CONFIG.gemini.apiKey;
  private baseUrl = API_ENDPOINTS.gemini.text;

  async generateText(prompt: string, context?: string): Promise<string> {
    if (!API_CONFIG.gemini.enabled || !this.apiKey) {
      throw new Error('Gemini API is not configured');
    }

    try {
      const fullPrompt = context ? `${context}\n\nUser question: ${prompt}` : prompt;
      
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: fullPrompt
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const geminiResponse: GeminiResponse = response.data;
      
      if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
        return geminiResponse.candidates[0].content.parts[0].text;
      }
      
      throw new Error('No response from Gemini AI');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async analyzeUrbanData(data: any, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are an expert urban planning AI assistant specializing in city health and sustainability analysis. 
    Analyze the following urban health data for location ${location.latitude}, ${location.longitude} and provide insights, recommendations, and actionable advice for urban planners and city officials.
    
    Focus on:
    1. Key areas needing improvement
    2. Specific actionable recommendations
    3. Potential risks and opportunities
    4. Best practices for urban sustainability
    5. Comparisons with healthy city standards`;

    const prompt = `Urban Health Data Analysis:
    ${JSON.stringify(data, null, 2)}
    
    Please provide a comprehensive analysis with specific recommendations for improving city health and sustainability.`;

    return this.generateText(prompt, context);
  }

  async generateUrbanInsights(query: string, location: { latitude: number; longitude: number }): Promise<string> {
    const context = `You are an expert urban intelligence AI assistant. Help users understand urban health, sustainability, and smart city concepts. 
    Current location: ${location.latitude}, ${location.longitude}
    
    Provide practical, actionable advice about urban planning, environmental health, sustainability, and smart city technologies.`;

    return this.generateText(query, context);
  }
}

export const geminiService = new GeminiService();