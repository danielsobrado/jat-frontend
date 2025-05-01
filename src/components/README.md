# System Configuration Components

This directory contains components for displaying system configuration in a user-friendly way.

## Components

### ConfigValue

A reusable component for rendering different types of configuration values. Features:
- Masks sensitive data (password, apiKey, etc.)
- Formats boolean values with color-coded styling
- Handles complex objects and arrays with summary views
- Supports custom styling via className prop

```tsx
<ConfigValue configKey="apiKey" value="secret" />        // Renders: ********
<ConfigValue configKey="enabled" value={true} />         // Renders: True (with green styling)
<ConfigValue configKey="items" value={[1, 2, 3]} />     // Renders: Array[3]
```

### Settings

Main configuration display component that shows system settings in an organized, collapsible format:
- Groups RAG-related settings separately
- Supports nested configuration objects
- Provides expandable/collapsible sections
- Uses ConfigValue for consistent value rendering

## Testing

Tests are written using React Testing Library and cover:
- Value rendering for different data types
- Sensitive data masking
- Boolean value styling
- Complex object handling
- Custom styling support

## Development

To modify these components:

1. Ensure all tests pass:
```bash
npm test
```

2. Use ConfigValue for any new configuration value rendering
3. Update tests when adding new functionality
4. Document any new features or changes

## Dependencies

- React Testing Library
- Jest DOM utilities
- TypeScript type definitions