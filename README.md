# Frontend Components (`src/components`)

This directory contains the reusable React components that make up the user interface of the GovFlow Classifier application. Components are organized by feature area where applicable.

## Core Layout & Navigation

*   **`Layout/PageLayout.tsx`**: The main application shell. It renders the fixed header, the collapsible `LeftSidebar`, and the main content area (`<Outlet />`). It manages the sidebar's collapsed/expanded state.
*   **`Layout/Breadcrumb.tsx`**: (Currently seems unused by `PageLayout`) An Ant Design Breadcrumb component intended to show the user's current location within the app based on the route path.
*   **`Sidebar/LeftSidebar.component.tsx`**: The main navigation sidebar. It dynamically renders menu items based on application configuration (e.g., RAG enabled) and user permissions. Handles collapsing/expanding on hover and logout confirmation.
*   **`Sidebar/LeftSidebarItem.component.tsx`**: Renders a single item within the `LeftSidebar`, handling navigation links or actions like logout.

## Authentication

*   **`LoginForm.tsx`**: A form component for users to enter their username and password. It interacts with the `AuthService` via the `apiClient` prop to perform login and handles success/error states.

## Classification (Single Item)

*   **`ClassificationForm.tsx`**: Provides the primary interface for classifying a single item. Includes fields for description, context, system selection, handles API calls for classification, displays results, and allows triggering manual classification edits.
*   **`ManualClassificationModal.tsx`**: A modal component used for manually setting or overriding classification codes for different levels of a selected system. It features searchable dropdowns for selecting categories.
*   **`ClassificationDetailsModal.tsx`**: A modal component used within the `HistoryTab` to display the full details of a past classification, including levels, RAG context (if used), and LLM reasoning (if available), organized into tabs.
*   **`RerunStatusModal.tsx`**: A simple modal indicating that a classification rerun is in progress.

## Batch Classification (`BatchTab`)

*   **`BatchTab/BatchTab.tsx`**: The main component orchestrating the batch classification process. It integrates file upload, column selection, preview, progress display, and result summary.
*   **`BatchTab/FileUpload.tsx`**: Handles drag-and-drop or browse file uploads (CSV/Excel). Includes logic to detect multiple Excel sheets and prompt the user for selection.
*   **`BatchTab/ColumnSelector.tsx`**: Allows users to map columns from their uploaded file to specific roles (Source Description, Context, Key Columns) and select the classification system.
*   **`BatchTab/PreviewTable.tsx`**: Displays a preview of the uploaded data, highlighting the selected columns and showing processing status/results for previewed rows.
*   **`BatchTab/BatchProgress.tsx`**: Shows the progress of an ongoing batch classification job (items processed / total).
*   **`BatchTab/BatchSummary.tsx`**: Displays a summary of a completed batch job (success/partial/fail counts) and provides a button to download the results as a CSV.

## Batch Jobs (`BatchJobsTab`)

*   **`BatchJobsTab/BatchJobsTab.tsx`**: The main component for viewing and managing past and ongoing batch classification jobs. It uses hooks for data fetching, filtering, and polling.
*   **`BatchJobsTab/components/BatchJobsFilters.tsx`**: Provides UI elements (dropdowns, date pickers) for filtering the list of batch jobs.
*   **`BatchJobsTab/components/BatchJobsTable.tsx`**: Displays the list of batch jobs with details like status, progress, and actions (View, Download).
*   **`BatchJobsTab/components/BatchJobsPagination.tsx`**: Handles pagination for the batch jobs list (currently seems unused/replaced by Antd pagination in `BatchJobsTab`).
*   **`BatchJobsTab/components/JobStatusDisplay.tsx`**: A helper component rendering status badges, progress bars, and summary counts within the `BatchJobsTable`.
*   **`BatchJobsTab/components/BatchSummary.tsx`**: (Potentially duplicated/misplaced - similar functionality exists in `src/components/BatchTab`) Displays a summary of batch results, likely intended for within the details modal or job row.
*   **`BatchJobsTab/BatchJobDetailsModal.tsx`**: A modal showing detailed results for each item within a specific batch job.

## History (`HistoryTab`)

*   **`HistoryTab.tsx`**: Displays a paginated and filterable table of past classification records (both single and batch items). Allows viewing details, manual reclassification, rerunning, and deleting history entries based on user permissions.

## RAG Information Management (`RagInfoTab`)

*   **`RagInfoTab/RagInfoTab.tsx`**: The main component for managing custom information used for Retrieval-Augmented Generation (RAG). Orchestrates fetching, creating, updating, deleting, filtering, and pagination of RAG items. Includes CSV import/export functionality.
*   **`RagInfoTab/components/RagInfoFilters.tsx`**: Provides a search input for filtering RAG items.
*   **`RagInfoTab/components/RagInfoTable.tsx`**: Displays the list of RAG items with their keys, descriptions, and actions.
*   **`RagInfoTab/components/RagInfoPagination.tsx`**: Handles pagination for the RAG items list.
*   **`RagInfoTab/components/RagInfoFormModal.tsx`**: A modal form used for creating new RAG items or editing existing ones.

## Settings

*   **`Settings/SettingsTab.tsx`**: The main interactive component for the Settings page. It displays configuration values fetched from the API, organized into tabs. It allows users with appropriate permissions to edit configuration values using various input types (text, password, number, switch, select). Handles saving changes via the `apiClient`.
*   **`ConfigValue.tsx`**: A reusable component used by `SettingsTab` (and potentially `Settings.tsx`) to display individual configuration values. It handles different data types, masks sensitive values (like API keys, passwords), and provides specific styling for boolean values.
*   **`Settings.tsx`**: (Seems to be an older/view-only version) Displays system configuration in a read-only, collapsible format. Uses `ConfigValue` for rendering. *Note: `SettingsTab.tsx` appears to be the primary component used in `SettingsPage.tsx`.*

## User Management (`UserManagementTab`)

*   **`UserManagementTab/UserManagementTab.tsx`**: Orchestrates the User Management UI, using the `useUsers` hook for data and logic. Integrates the table and modal form.
*   **`UserManagementTab/components/UserTable.tsx`**: Displays the list of users with their roles and provides actions (Edit, Delete) based on permissions. Includes sorting and pagination.
*   **`UserManagementTab/components/UserFormModal.tsx`**: A modal form for creating new users or editing existing ones, including password handling and role assignment via a multi-select dropdown.
*   **`UserManagementComponent.tsx`**: (Seems superseded by `UserManagementTab`) Older component structure containing table and modal logic directly.

## Role Management (`RoleManagementTab`)

*   **`RoleManagementTab/RoleManagementTab.tsx`**: Orchestrates the Role Management UI, using the `useRoles` hook. Integrates the table and modal form.
*   **`RoleManagementTab/components/RoleTable.tsx`**: Displays the list of roles, their descriptions, assigned permissions, and actions (Edit, Delete - excluding core roles).
*   **`RoleManagementTab/components/RoleFormModal.tsx`**: A modal form for creating new roles or editing existing ones (name, description, permissions). Handles permission selection via checkboxes grouped by category. Restricts modification of core roles.
*   **`RoleManagementTab/components/PermissionAssignmentModal.tsx`**: (Seems unused/superseded by `RoleFormModal`) A modal specifically for assigning permissions to a role, likely replaced by the integrated permission selection in `RoleFormModal`.
*   **`RoleManagementComponent.tsx`**: (Seems superseded by `RoleManagementTab`) Older component structure containing table and modal logic directly.

## Associated Hooks

Helper hooks encapsulate data fetching, state management, and logic for specific features:

*   **`UserManagement/hooks/useUsers.ts`**: Manages fetching, creating, updating, deleting users, and fetching available roles.
*   **`RoleManagement/hooks/useRoles.ts`**: Manages fetching, creating, updating, deleting roles, and fetching available permissions.
*   **`RagInfoTab/hooks/useRagInfo.ts`**: Manages fetching, creating, updating, deleting, filtering, and paginating RAG info items. Includes logic for CSV export fetching.
*   **`BatchJobsTab/hooks/useBatchJobs.ts`**: Manages fetching, filtering, paginating, and polling batch job statuses.

## Testing

*   Tests are implemented using React Testing Library (`@testing-library/react`) and Jest.
*   Example: `__tests__/ConfigValue.test.tsx` covers various scenarios for the `ConfigValue` component, including different data types, masking, and styling.

## Development Notes

*   Components generally follow a pattern of having a main "Tab" or "Page" component that uses hooks for logic and integrates sub-components for display (Table, Filters, Modals).
*   Permissions (fetched via `useAuth`) are checked within components to enable/disable actions or show/hide UI elements.
*   Styling leverages Tailwind CSS utility classes (defined in `src/index.css`) and component-specific CSS files (e.g., `left-sidebar.css`). Ant Design (`antd`) components are used for tables, modals, forms, etc., providing a consistent look and feel.