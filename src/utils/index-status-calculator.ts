import { readFileSync } from 'fs';

export type StatusVariant = "excellent" | "good" | "moderate" | "critical";

interface IndexDefinition {
  index_name: string;
  measurement_range: string;
  healthy_city_target: string;
  category: string;
}

// Parse the index definitions from the JSONL file
const getIndexDefinitions = (): Record<string, IndexDefinition> => {
  try {
    const data = readFileSync('/src/data/healthy_city_indices.jsonl', 'utf-8');
    const definitions: Record<string, IndexDefinition> = {};
    
    data.split('\n').forEach(line => {
      if (line.trim()) {
        const index = JSON.parse(line);
        const key = getIndexKey(index.index_name);
        definitions[key] = index;
      }
    });
    
    return definitions;
  } catch (error) {
    console.warn('Could not load index definitions, using fallback logic');
    return {};
  }
};

// Convert full index names to short keys
const getIndexKey = (indexName: string): string => {
  const keyMap: Record<string, string> = {
    'Climate Resilience Index (CRI)': 'cri',
    'Urban Heat Vulnerability Index (UHVI)': 'uhvi',
    'Air Quality Health Impact (AQHI)': 'aqhi',
    'Water Security Indicator (WSI)': 'wsi',
    'Green Equity Assessment (GEA)': 'gea',
    'Social Cohesion Metrics (SCM)': 'scm',
    'Environmental Justice Tracker (EJT)': 'ejt',
    'Transportation Accessibility Score (TAS)': 'tas',
    'Disaster Preparedness Index (DPI)': 'dpi',
    'Human Well-being Index (HWI)': 'hwi'
  };
  return keyMap[indexName] || indexName.toLowerCase();
};

// Determine if an index is "lower is better" based on its target
const isLowerIsBetter = (target: string, range: string): boolean => {
  // Check for ≤ symbol in target (indicates lower is better)
  return target.includes('≤') || target.includes('<=');
};

// Calculate status variant for a specific index
export const calculateIndexStatus = (
  indexName: string, 
  score: number, 
  target: number,
  indexKey?: string
): StatusVariant => {
  
  // Handle specific known indices with their correct logic
  const key = indexKey || getIndexKey(indexName);
  
  switch (key) {
    case 'uhvi': // Urban Heat Vulnerability Index - Lower is better (≤30)
      if (score <= 15) return 'excellent';     // Green: Very low heat risk
      if (score <= 25) return 'good';          // Blue: Low heat risk  
      if (score <= 35) return 'moderate';      // Yellow: Moderate heat risk
      return 'critical';                       // Red: High heat risk
      
    case 'aqhi': // Air Quality Health Impact - Lower is better (≤4)
      if (score <= 2) return 'excellent';      // Green: Low health risk
      if (score <= 3) return 'good';           // Blue: Low-moderate health risk
      if (score <= 6) return 'moderate';       // Yellow: Moderate health risk
      return 'critical';                       // Red: High health risk
      
    // All other indices are "higher is better"
    default:
      const percentage = (score / target) * 100;
      if (percentage >= 95) return 'excellent';  // Green: Highly good/Lowest risk
      if (percentage >= 70) return 'good';       // Blue: Moderate good/Low risk  
      if (percentage >= 50) return 'moderate';   // Yellow: Needs attention/Emerging risks
      return 'critical';                         // Red: Critical/High risk
  }
};

// Calculate progress percentage for display
export const calculateProgressPercentage = (
  indexName: string,
  score: number,
  target: number,
  indexKey?: string
): number => {
  const key = indexKey || getIndexKey(indexName);
  
  switch (key) {
    case 'uhvi': // Urban Heat Vulnerability Index - Lower is better
      // For UHVI, show progress as "how close are we to the good range"
      // Target is ≤30, so we want to show progress toward 0
      return Math.max(0, Math.min(100, ((30 - score) / 30) * 100));
      
    case 'aqhi': // Air Quality Health Impact - Lower is better  
      // For AQHI, target is ≤4, so progress toward 1 (best possible)
      return Math.max(0, Math.min(100, ((4 - score) / 3) * 100));
      
    default:
      // Higher is better - standard calculation
      return Math.min(100, (score / target) * 100);
  }
};

// Get progress bar color class
export const getProgressClass = (
  indexName: string,
  score: number, 
  target: number,
  indexKey?: string
): string => {
  const status = calculateIndexStatus(indexName, score, target, indexKey);
  
  switch (status) {
    case 'excellent': return "bg-green-600";   
    case 'good': return "bg-blue-600";    
    case 'moderate': return "bg-yellow-500";  
    default: return "bg-red-600";                           
  }
};