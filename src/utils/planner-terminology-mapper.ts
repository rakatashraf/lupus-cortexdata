// Urban Planner Terminology Mapper
// Converts technical index names to planner-friendly language

export interface PlannerIndex {
  plannerName: string;
  originalName: string;
  key: string;
}

// Mapping of technical indices to planner-friendly terminology
const PLANNER_TERMINOLOGY_MAP: Record<string, string> = {
  'cri': 'Climate Adaptation Readiness',
  'uhvi': 'Heat Risk Assessment for Development',
  'aqhi': 'Air Quality Planning Priority',
  'wsi': 'Water Infrastructure Capacity',
  'gea': 'Green Space Equity Index',
  'scm': 'Community Connectivity Assessment',
  'ejt': 'Equity Impact Assessment',
  'tas': 'Transit Development Priority',
  'dpi': 'Emergency Preparedness Assessment',
  // HWI is intentionally excluded - keep as "Human Well-being Index"
};

// Planning priority order (most critical planning areas first)
export const PLANNING_PRIORITY_ORDER = [
  'aqhi', // Air Quality Planning Priority
  'ejt',  // Equity Impact Assessment  
  'tas',  // Transit Development Priority
  'gea',  // Green Space Equity Index
  'scm',  // Community Connectivity Assessment
  'wsi',  // Water Infrastructure Capacity
  'dpi',  // Emergency Preparedness Assessment
  'cri',  // Climate Adaptation Readiness
  'uhvi'  // Heat Risk Assessment for Development
];

/**
 * Convert technical index name to planner-friendly name
 * @param indexKey - The short key for the index (e.g., 'cri', 'uhvi')
 * @param originalName - The original technical name (fallback)
 * @returns Planner-friendly name or original if not mapped
 */
export const getPlannerFriendlyName = (indexKey: string, originalName: string): string => {
  // Never change HWI - keep as is
  if (indexKey === 'hwi') {
    return originalName;
  }
  
  return PLANNER_TERMINOLOGY_MAP[indexKey] || originalName;
};

/**
 * Reorder indices array by planning priority
 * @param indices - Array of [key, index] pairs
 * @returns Reordered array with planning priority
 */
export const reorderByPlanningPriority = <T>(indices: [string, T][]): [string, T][] => {
  return indices.sort(([keyA], [keyB]) => {
    const priorityA = PLANNING_PRIORITY_ORDER.indexOf(keyA);
    const priorityB = PLANNING_PRIORITY_ORDER.indexOf(keyB);
    
    // If key not found in priority order, put it at the end
    const indexA = priorityA === -1 ? PLANNING_PRIORITY_ORDER.length : priorityA;
    const indexB = priorityB === -1 ? PLANNING_PRIORITY_ORDER.length : priorityB;
    
    return indexA - indexB;
  });
};

/**
 * Check if an index should use planner terminology
 * @param indexKey - The short key for the index
 * @returns True if should be transformed, false otherwise
 */
export const shouldUsePlannerTerminology = (indexKey: string): boolean => {
  return indexKey !== 'hwi' && indexKey in PLANNER_TERMINOLOGY_MAP;
};
