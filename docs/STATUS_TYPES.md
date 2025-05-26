# JAT Frontend Status Types

This is a reference guide for the different status types used in the JAT (Job Analysis Tool) frontend application.

## Status Types Overview

The application uses different status types for different modules. To ensure consistency and help developers work with these status types, we've created the following utilities:

1. **Utility Functions**: See `src/utils/statusUtils.ts` for helper functions
2. **Helper Components**: 
   - `StatusTypeTooltip`: A tooltip to explain status types in UI
   - `StatusTypeGuide`: A comprehensive guide component
   - `StatusTypesDemo`: A demo showing usage patterns

All of these components and utilities are also available through the barrel export in `src/status-utils/index.ts`.

## Status Types Reference

### Categorization System Status Types

In the `jat-categorizations` system, product and service classifications use the following status types:

```typescript
export type ClassificationStatus = 'all' | 'success' | 'partial' | 'failed';
```

- **success**: Classification was fully completed with all required levels
- **partial**: Classification is partially complete; some levels may be missing or invalid
- **failed**: Classification failed to determine required levels
- **all**: UI filter option that shows all statuses

### ServiceNow Analysis Status Type

In the `jat-snow` system, ticket analysis results use a different validation status:

```typescript
export type SnowValidationStatus = 'pass' | 'fail';
```

- **pass**: Ticket meets all validation criteria and quality standards
- **fail**: Ticket fails to meet quality standards and requires improvement

These are completely separate status types used in different parts of the application.

## Usage in Code

### Importing Types

```typescript
// For categorization status
import { ClassificationStatus } from '../api/types';

// For ServiceNow status
import { SnowValidationStatus } from '../snow/types/snow.types';

// Or import from the barrel file
import { ClassificationStatus, SnowValidationStatus } from '../status-utils';
```

### Importing Utility Functions

```typescript
// Import directly from the utility file
import { 
  getClassificationStatusColor,
  getSnowValidationStatusColor
} from '../utils/statusUtils';

// Or import from the barrel file
import { 
  getClassificationStatusColor,
  getSnowValidationStatusColor
} from '../status-utils';
```

### Using Helper Components

```tsx
import { StatusTypeTooltip } from '../status-utils';

// In your component:
<div>
  Status: {status} <StatusTypeTooltip type="classification" />
</div>
```

## Demo

Check out the `StatusTypesDemo` component for complete usage examples.
