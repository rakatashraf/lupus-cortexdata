export type StatusVariant = "excellent" | "good" | "moderate" | "critical";

interface IndexDefinition {
  index_name: string;
  measurement_range: string;
  healthy_city_target: string;
  category: string;
}

// Embedded index definitions from healthy_city_wellbeing_indices.jsonl
const INDEX_DEFINITIONS: Record<string, IndexDefinition> = {
  'cri': {
    index_name: 'Climate Resilience Index (CRI)',
    measurement_range: '0-100 (0=Highly Vulnerable, 100=Highly Resilient)',
    healthy_city_target: '≥75 points (Highly Resilient)',
    category: 'Physical Health & Environmental Quality Indices'
  },
  'uhvi': {
    index_name: 'Urban Heat Vulnerability Index (UHVI)',
    measurement_range: '0-100 (0=No Heat Risk, 100=Extreme Heat Risk)',
    healthy_city_target: '≤30 points (Low to Moderate Heat Risk)',
    category: 'Physical Health & Environmental Quality Indices'
  },
  'aqhi': {
    index_name: 'Air Quality Health Impact (AQHI)',
    measurement_range: '1-10+ (1=Low Health Risk, 10+=Very High Health Risk)',
    healthy_city_target: '≤4 points (Low to Moderate Health Risk)',
    category: 'Physical Health & Environmental Quality Indices'
  },
  'wsi': {
    index_name: 'Water Security Indicator (WSI)',
    measurement_range: '0-100 (0=Critical Water Stress, 100=Water Secure)',
    healthy_city_target: '≥70 points (Water Secure)',
    category: 'Physical Health & Environmental Quality Indices'
  },
  'gea': {
    index_name: 'Green Equity Assessment (GEA)',
    measurement_range: '0-100 (0=Highly Inequitable, 100=Perfectly Equitable)',
    healthy_city_target: '≥75 points (High Equity in Green Access)',
    category: 'Mental Health & Social Wellbeing Indices'
  },
  'scm': {
    index_name: 'Social Cohesion Metrics (SCM)',
    measurement_range: '0-100 (0=Highly Fragmented, 100=Highly Cohesive)',
    healthy_city_target: '≥70 points (Strong Community Cohesion)',
    category: 'Mental Health & Social Wellbeing Indices'
  },
  'ejt': {
    index_name: 'Environmental Justice Tracker (EJT)',
    measurement_range: '0-100 (0=Extreme Environmental Injustice, 100=Perfect Environmental Justice)',
    healthy_city_target: '≥80 points (High Environmental Justice)',
    category: 'Environmental Justice & Equity Indices'
  },
  'tas': {
    index_name: 'Transportation Accessibility Score (TAS)',
    measurement_range: '0-100 (0=Very Poor Access, 100=Excellent Access)',
    healthy_city_target: '≥75 points (Excellent Transportation Access)',
    category: 'Transportation & Mobility Indices'
  },
  'dpi': {
    index_name: 'Disaster Preparedness Index (DPI)',
    measurement_range: '0-100 (0=Highly Vulnerable, 100=Highly Prepared)',
    healthy_city_target: '≥70 points (Well-Prepared for Disasters)',
    category: 'Disaster Preparedness & Safety Indices'
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
      if (score <= 15) return 'excellent';     // Green: No to very low heat risk
      if (score <= 25) return 'good';          // Blue: Low heat risk  
      if (score <= 35) return 'moderate';      // Yellow: Moderate heat risk
      return 'critical';                       // Red: High to extreme heat risk
      
    case 'aqhi': // Air Quality Health Impact - Lower is better (≤4)
      if (score <= 2) return 'excellent';      // Green: Low health risk
      if (score <= 3) return 'good';           // Blue: Low-moderate health risk
      if (score <= 6) return 'moderate';       // Yellow: Moderate health risk
      return 'critical';                       // Red: High to very high health risk
      
    // All other indices are "higher is better" with specific targets
    case 'cri': // Climate Resilience Index - Target ≥75
      if (score >= 90) return 'excellent';     // Green: Highly resilient
      if (score >= 75) return 'good';          // Blue: Resilient
      if (score >= 50) return 'moderate';      // Yellow: Moderately vulnerable
      return 'critical';                       // Red: Highly vulnerable
      
    case 'wsi': // Water Security Indicator - Target ≥70
      if (score >= 85) return 'excellent';     // Green: Highly water secure
      if (score >= 70) return 'good';          // Blue: Water secure
      if (score >= 40) return 'moderate';      // Yellow: Water stressed
      return 'critical';                       // Red: Critical water stress
      
    case 'gea': // Green Equity Assessment - Target ≥75
      if (score >= 90) return 'excellent';     // Green: Highly equitable
      if (score >= 75) return 'good';          // Blue: High equity
      if (score >= 50) return 'moderate';      // Yellow: Moderate equity
      return 'critical';                       // Red: Highly inequitable
      
    case 'scm': // Social Cohesion Metrics - Target ≥70
      if (score >= 85) return 'excellent';     // Green: Highly cohesive
      if (score >= 70) return 'good';          // Blue: Strong cohesion
      if (score >= 40) return 'moderate';      // Yellow: Moderate cohesion
      return 'critical';                       // Red: Highly fragmented
      
    case 'ejt': // Environmental Justice Tracker - Target ≥80
      if (score >= 90) return 'excellent';     // Green: Perfect environmental justice
      if (score >= 80) return 'good';          // Blue: High environmental justice
      if (score >= 50) return 'moderate';      // Yellow: Moderate environmental justice
      return 'critical';                       // Red: Extreme environmental injustice
      
    case 'tas': // Transportation Accessibility Score - Target ≥75
      if (score >= 90) return 'excellent';     // Green: Excellent access
      if (score >= 75) return 'good';          // Blue: Good access
      if (score >= 50) return 'moderate';      // Yellow: Moderate access
      return 'critical';                       // Red: Very poor access
      
    case 'dpi': // Disaster Preparedness Index - Target ≥70
      if (score >= 85) return 'excellent';     // Green: Highly prepared
      if (score >= 70) return 'good';          // Blue: Well-prepared
      if (score >= 40) return 'moderate';      // Yellow: Moderately prepared
      return 'critical';                       // Red: Highly vulnerable
      
    // Fallback for any unknown indices - use percentage-based calculation
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
    case 'uhvi': // Urban Heat Vulnerability Index - Lower is better (≤30)
      // Progress toward ideal (0), capped at 30 as target
      return Math.max(0, Math.min(100, ((30 - score) / 30) * 100));
      
    case 'aqhi': // Air Quality Health Impact - Lower is better (≤4)  
      // Progress toward ideal (1), target is ≤4
      return Math.max(0, Math.min(100, ((4 - score) / 3) * 100));
      
    case 'cri': // Climate Resilience Index - Target ≥75
      return Math.min(100, (score / 75) * 100);
      
    case 'wsi': // Water Security Indicator - Target ≥70
      return Math.min(100, (score / 70) * 100);
      
    case 'gea': // Green Equity Assessment - Target ≥75
      return Math.min(100, (score / 75) * 100);
      
    case 'scm': // Social Cohesion Metrics - Target ≥70
      return Math.min(100, (score / 70) * 100);
      
    case 'ejt': // Environmental Justice Tracker - Target ≥80
      return Math.min(100, (score / 80) * 100);
      
    case 'tas': // Transportation Accessibility Score - Target ≥75
      return Math.min(100, (score / 75) * 100);
      
    case 'dpi': // Disaster Preparedness Index - Target ≥70
      return Math.min(100, (score / 70) * 100);
      
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