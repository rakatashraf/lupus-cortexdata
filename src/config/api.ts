import { APIConfig } from '@/types/urban-indices';

// API Configuration
export const API_CONFIG: APIConfig = {
  gemini: {
    apiKey: 'AIzaSyBN5E9O0YGh8sqWps0HDFQD45GhJHCzUh8',
    enabled: true
  },
  nasa: {
    apiKey: 'GeSwTbVGBQWEsQ3TXk0ihGvtgDJtEaHfiTqKuejO'
  },
  n8n: {
    endpoint: "https://n8n-production-5597.up.railway.app/webhook/urban-health-api",
    enabled: true
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  gemini: {
    text: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    vision: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  },
  nasa: {
    power: 'https://power.larc.nasa.gov/api/temporal/daily/point',
    earth: 'https://api.nasa.gov/planetary/earth'
  },
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality'
};

// Utility function to check service status
export function checkServiceStatus() {
  return {
    gemini: API_CONFIG.gemini.enabled && API_CONFIG.gemini.apiKey !== 'YOUR_GEMINI_API_KEY_HERE',
    nasa: !!API_CONFIG.nasa.apiKey,
    n8n: API_CONFIG.n8n.enabled
  };
}

// Default fallback messages
export const FALLBACK_MESSAGES = {
  greeting: "👋 Hello! I'm your AI assistant for urban intelligence and data analysis!",
  help: "🤖 I can help with urban data analysis, generate charts, create visualizations, and answer questions about sustainability and city planning.",
  imageGeneration: "🖼️ Image generation requires an API key. Please configure your AI service credentials.",
  dataAnalysis: "📊 I can analyze urban data and provide insights about city indices and environmental metrics.",
  error: "I'm having some technical difficulties. Please try again in a moment!"
};