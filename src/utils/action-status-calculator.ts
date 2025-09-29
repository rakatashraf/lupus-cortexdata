// Action Status Calculator for Urban Planners
// Converts progress percentages to implementation readiness labels

export type ActionStatus = "Implementation Ready" | "Policy Development Needed" | "Immediate Planning Required" | "Critical Action Zone";

export interface ActionStatusResult {
  status: ActionStatus;
  percentage: number;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

/**
 * Convert progress percentage to implementation readiness status
 * @param percentage - Progress percentage (0-100)
 * @returns Action status information
 */
export const getImplementationStatus = (percentage: number): ActionStatusResult => {
  if (percentage >= 80) {
    return {
      status: "Implementation Ready",
      percentage,
      color: 'green'
    };
  } else if (percentage >= 60) {
    return {
      status: "Policy Development Needed", 
      percentage,
      color: 'blue'
    };
  } else if (percentage >= 40) {
    return {
      status: "Immediate Planning Required",
      percentage,
      color: 'yellow'
    };
  } else {
    return {
      status: "Critical Action Zone",
      percentage,
      color: 'red'
    };
  }
};

/**
 * Get implementation status badge variant for UI components
 * @param percentage - Progress percentage (0-100)
 * @returns Badge variant string
 */
export const getImplementationStatusVariant = (percentage: number): "excellent" | "good" | "moderate" | "critical" => {
  const result = getImplementationStatus(percentage);
  
  switch (result.color) {
    case 'green': return 'excellent';
    case 'blue': return 'good';
    case 'yellow': return 'moderate';
    case 'red': return 'critical';
  }
};

/**
 * Get short status label for compact display
 * @param percentage - Progress percentage (0-100)
 * @returns Short status label
 */
export const getShortStatusLabel = (percentage: number): string => {
  const result = getImplementationStatus(percentage);
  
  switch (result.status) {
    case "Implementation Ready": return "Ready";
    case "Policy Development Needed": return "Policy Needed";
    case "Immediate Planning Required": return "Planning Needed";
    case "Critical Action Zone": return "Critical";
  }
};