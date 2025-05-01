# Frontend Documentation

## Project Structure

The frontend is organized into three main packages:

```
packages/
├── shared-ui/         # Shared React components
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── api/        # API interfaces and types
│   │   └── types/      # TypeScript type definitions
├── web/              # Web application
└── desktop/          # Desktop frontend (in cmd/desktop/frontend)
```

## Package Architecture

### Shared Components (`packages/shared-ui/`)
- Contains common React components used by both web and desktop frontends
- Implements platform-agnostic UI components (forms, layouts, etc.)
- Defines API interface abstractions and shared TypeScript types
- Uses Tailwind CSS for consistent styling

### Web Frontend (`packages/web/`)
- Implements `WebApiClient` for HTTP communication with backend server
- Uses shared components from @unspsc/shared-ui
- Runs as a standalone application with separate backend server

### Desktop Frontend (`cmd/desktop/frontend/`)
- Implements `DesktopApiClient` using Wails bindings
- Uses shared components from @unspsc/shared-ui
- Integrated directly with Go backend in Wails application

## Key Components

### ClassificationForm
Primary interface for product classification with:
- Product description input with validation
- Classification system selection
- Real-time classification results display
- Classification levels support:
  - Automatic classification with AI
  - Manual classification with parent-based category selection
  - Reclassify button for switching between modes
- Hierarchical category selection:
  - Sequential loading based on parent selection
  - Validation of selected categories
  - Dynamic updating of available options
- Language features:
  - Automatic language detection
  - Translation for non-English input
- Confidence score display

### Settings
Configuration management interface:
- LLM API configuration:
  - API endpoint URL
  - API key management
- Real-time validation
- Persistent storage in config.yaml
- Secure handling of sensitive data

### MainTabs
Navigation component with three main sections:
- Testing: Product classification interface
- Settings: Application configuration
- History: Past classifications (coming soon)

## API Interfaces

```typescript
// Core API Client Interface
export interface ApiClient {
  // Core operations
  initialize(): Promise<void>;
  classify(description: string, systemCode?: string, additionalContext?: string): Promise<ClassificationResult>;
  
  // Manual classification
  classifyManually(request: ManualClassificationRequest): Promise<ClassificationResult>;
  
  // System operations
  getClassificationSystems(): Promise<ClassificationSystem[]>;
  getClassificationSystem(code: string): Promise<{ system: ClassificationSystem; levels: ClassificationLevel[] }>;
  getSystemCategories(req: SystemCategoriesRequest): Promise<Category[]>;
  
  // Configuration
  getConfig(): Promise<LlmConfig>;
  updateConfig(config: LlmConfig): Promise<void>;
}

// Manual Classification Types
export interface ManualClassificationRequest {
  description: string;
  systemCode: string;
  levels: { [levelCode: string]: string }; // levelCode -> category code mapping
}

export interface SystemCategoriesRequest {
  systemCode: string;
  level?: string;
  parentCode?: string; // For loading child categories
}

// Classification Result Type
export interface ClassificationResult {
  systemCode: string;
  levels: { [levelCode: string]: CategoryLevel };
  timestamp: string;
}

// Category Types
export interface Category {
  id: number;
  systemId: number;
  code: string;
  name: string;
  description?: string;
  levelCode: string;
  parentCode?: string;
  createdAt: string;
}

export interface CategoryLevel {
  code: string;
  name: string;
  description?: string;
}

// Configuration Types
export interface LlmConfig {
  llmEndpoint: string;
  llmApiKey: string;
}
```

## Styling Implementation

The application uses Tailwind CSS for styling with:
- Responsive design using Tailwind's grid and spacing utilities
- Consistent component styling through shared classes
- Dark mode support via Tailwind's dark mode classes
- Custom component styles defined in component files
- Mobile-first approach

## Development Workflow

1. Install Dependencies:
```bash
pnpm install
```

2. Build Shared Components:
```bash
pnpm run build --filter @unspsc/shared-ui
```

3. Run Development Servers:

For web:
```bash
pnpm run dev --filter @unspsc/web
```

For desktop:
```bash
pnpm run dev --filter @unspsc/desktop
```

4. Building for Production:
```bash
# Build all packages
pnpm run build

# Build specific package
pnpm run build --filter @unspsc/web
```

## Classification Process

### Automatic Classification
1. User enters product description
2. System uses LLM to classify the product
3. Results are displayed with category codes and names
4. User can view classification at each level

### Manual Classification
1. User enters product description
2. Initial classification is performed (optional)
3. User clicks "Reclassify Manually" button
4. Categories are loaded sequentially:
   - First level categories are loaded initially
   - Selecting a category loads child categories for next level
   - Process continues until all levels are selected
5. User submits manual classification
6. Results are saved and displayed
