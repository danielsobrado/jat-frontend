// src/utils/statusUtils.ts
import { ClassificationStatus } from '../api/types';
import { SnowValidationStatus } from '../snow/types/snow.types';

/**
 * Contains common informational messages that are displayed when classification
 * has specific non-critical errors, partial results, or has failed.
 * These messages are considered "informational" because they provide context
 * about why a classification might be partial or failed, rather than
 * being actual application errors.
 */
export const INFORMATIONAL_ERROR_MESSAGES = [
  "Classification failed to determine required levels",
  "Classification failed to determine required levels.",
  "No matching category found at this level",
  "Failed to classify at this level",
  "Classification is partial; some levels may be missing or invalid.",
  "Classification is partial.", // Matches backend's informational message for partial
  "Classification failed.",   // Matches backend's informational message for failed
];

/**
 * Determines if an error message is considered "informational" rather than a critical error.
 * @param errorMessage The error message to check
 * @returns Boolean indicating if the message is informational
 */
export const isInformationalError = (errorMessage?: string): boolean => {
  if (!errorMessage) return false;
  const lowerMessage = errorMessage.toLowerCase();
  return INFORMATIONAL_ERROR_MESSAGES.some(msg => lowerMessage.includes(msg.toLowerCase()));
};

/**
 * Get a color for the Categorization classification status
 * @param status The classification status
 * @returns A color string (success, warning, error)
 */
export const getClassificationStatusColor = (status: ClassificationStatus): string => {
  switch(status) {
    case 'success': return 'success';
    case 'partial': return 'warning';
    case 'failed': return 'error';
    case 'all': return 'default';
    default: return 'default';
  }
};

/**
 * Get a color for the ServiceNow validation status
 * @param status The SNOW validation status
 * @returns A color string (success, error)
 */
export const getSnowValidationStatusColor = (status: SnowValidationStatus): string => {
  return status === 'pass' ? 'success' : 'error';
};

/**
 * Returns a human-readable description of a Categorization classification status
 * @param status The classification status
 * @returns Human-readable description
 */
export const getClassificationStatusDescription = (status: ClassificationStatus): string => {
  switch(status) {
    case 'success': return 'Classification was successful with all required levels';
    case 'partial': return 'Classification is partial; some levels may be missing or invalid';
    case 'failed': return 'Classification failed to determine required levels';
    case 'all': return 'All statuses';
    default: return status;
  }
};

/**
 * Returns a human-readable description of a ServiceNow validation status
 * @param status The SNOW validation status
 * @returns Human-readable description
 */
export const getSnowValidationStatusDescription = (status: SnowValidationStatus): string => {
  switch(status) {
    case 'pass': return 'Ticket meets all validation criteria and quality standards';
    case 'fail': return 'Ticket fails to meet quality standards and requires improvement';
    default: return status;
  }
};
