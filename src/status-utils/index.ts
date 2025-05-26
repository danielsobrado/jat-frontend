// src/status-utils/index.ts
/**
 * Status Types & Utilities
 * 
 * This module exports all status-related components and utility functions
 * for both the Categorization and ServiceNow (SNOW) systems.
 */

// Re-export types
export type { ClassificationStatus, ClassificationSourceType, BatchStatus, BatchJobStatusFilterType } from '../api/types';
export type { SnowValidationStatus } from '../snow/types/snow.types';

// Re-export utility functions
export {
  isInformationalError,
  getClassificationStatusColor,
  getSnowValidationStatusColor,
  getClassificationStatusDescription,
  getSnowValidationStatusDescription,
  INFORMATIONAL_ERROR_MESSAGES
} from '../utils/statusUtils';

// Re-export components
export { default as StatusTypeGuide } from '../components/StatusTypeGuide';
export { default as StatusTypeTooltip } from '../components/StatusTypeTooltip';
export { default as StatusTypesDemo } from '../components/StatusTypesDemo';
