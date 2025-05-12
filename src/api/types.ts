// src/api/types.ts
// API Client Interface
export interface ApiClient {
  // Authentication methods
  /**
   * Check if user is currently logged in
   * @returns boolean indicating login status
   */
  isLoggedIn(): boolean;

  /**
   * Check if authentication is enabled
   * @returns boolean indicating whether auth is enabled, or null if not determined yet
   */
  isAuthEnabled(): boolean | null;

  /**
   * Fetch authentication configuration from the server
   */
  fetchAuthConfig(): Promise<void>;

  /**
   * Log in a user
   * @param username - Username
   * @param password - Password
   */
  login(username: string, password: string): Promise<LoginResponse>;

  /**
   * Clear authentication token
   */
  clearToken(): void;

  /**
   * Get the current logged-in user's details
   */
  getCurrentUser(): Promise<User>;

  // --- User Management ---
  /**
   * Get a list of users
   * @param params - Optional parameters for pagination and searching
   */
  getUsers(params?: { limit?: number; offset?: number; search?: string }): Promise<UserListResponse>;
  
  /**
   * Create a new user
   * @param data - User creation data
   */
  createUser(data: CreateUserRequest): Promise<User>;
  
  /**
   * Update an existing user
   * @param id - User ID
   * @param data - User update data
   */
  updateUser(id: number, data: UpdateUserRequest): Promise<User>;
  
  /**
   * Delete a user
   * @param id - User ID
   */
  deleteUser(id: number): Promise<void>;
  
  /**
   * Assign roles to a user
   * @param userId - User ID
   * @param roleNames - Array of role names
   */
  assignRolesToUser(userId: number, roleNames: string[]): Promise<void>;

  // --- Role Management ---
  /**
   * Get a list of roles
   * @param params - Optional parameters for pagination
   */
  getRoles(params?: { limit?: number; offset?: number }): Promise<RoleListResponse>;
  
  /**
   * Create a new role
   * @param data - Role creation data
   */
  createRole(data: CreateRoleRequest): Promise<Role>;
  
  /**
   * Update an existing role
   * @param id - Role ID
   * @param data - Role update data
   */
  updateRole(id: number, data: UpdateRoleRequest): Promise<Role>;
  
  /**
   * Delete a role
   * @param id - Role ID
   */
  deleteRole(id: number): Promise<void>;

  // --- Permission Management ---
  /**
   * Get a list of all available permissions
   */
  getPermissions(): Promise<PermissionListResponse>;

  /** Initialize the API client */
  initialize(): Promise<void>;
  /**
   * Classify a description using AI
   * @param description - Text to classify
   * @param systemCode - Optional classification system code
   * @param additionalContext - Optional context for classification
   * @param modelOverride - Optional LLM model to use for this classification
   */
  classify(
    description: string,
    systemCode?: string,
    additionalContext?: string,
    modelOverride?: string
  ): Promise<ClassificationResult>;

  /**
   * Manually classify a description
   * @param request - Manual classification request
   */
  classifyManually(
    request: ManualClassificationRequest
  ): Promise<ClassificationResult>;

  /**
   * Classify multiple items in batch
   * @param request - Batch classification request
   */
  classifyBatch(
    request: BatchClassificationRequest
  ): Promise<BatchClassificationResult>;

  /**
   * Get status of a batch classification
   * @param batchId - ID of the batch
   */
  getBatchStatus(
    batchId: string
  ): Promise<BatchClassificationResult>;

  /** Get all classification systems */
  getClassificationSystems(): Promise<ClassificationSystem[]>;

  /**
   * Get a specific classification system with its levels
   * @param code - System code
   */
  getClassificationSystem(code: string): Promise<{
    system: ClassificationSystem;
    levels: ClassificationLevel[];
  }>;

  /**
   * Get categories for a system level
   * @param req - System categories request
   */
  getSystemCategories(
    req: SystemCategoriesRequest
  ): Promise<Category[]>;

  /**
   * Get classification history
   * @param req - History request parameters
   */
  getClassificationHistory(
    req: ClassificationHistoryRequest
  ): Promise<ClassificationHistoryPage>;

  /** Get current LLM configuration */
  getConfig(): Promise<LlmConfig>;

  /**
   * Update LLM configuration
   * @param config - New configuration
   */
  updateConfig(config: UpdateConfigRequest): Promise<void>;

  /** rerun classification for a specific history entry
   * @param id - ID of the classification history entry
  */
  rerunClassification(id: string): Promise<ClassificationResult>; // id should likely be string or number, consistent with HistoryTab

  /** delete a classification history entry
   * @param id - ID of the classification history entry
  */
  deleteClassification(id: string): Promise<void>; // id should likely be string or number

  getBatchJobs(params: BatchJobParams): Promise<BatchJobsPage>;
  /** Get a paginated list of RAG information entries */

  getRagInfoList(params: RagInfoRequestParams): Promise<RagInfoPage>;

  /** Create a new RAG information entry */
  createRagInfo(data: CreateRagInfoRequest): Promise<RagInfoItem>;

  /** Get a specific RAG information entry by ID */
  getRagInfoItem(id: string): Promise<RagInfoItem>; // Added for editing

  /** Update a RAG information entry by ID */
  updateRagInfo(id: string, data: UpdateRagInfoRequest): Promise<RagInfoItem>;

  /** Delete a RAG information entry by ID */
  deleteRagInfo(id: string): Promise<void>;

  /**
   * Delete a classification history entry
   * @param id - ID of the classification history entry
   */
  deleteClassificationHistory(id: string): Promise<void>;

  // --- RAG Information Management ---
  /**
   * Get a list of RAG information items
   * @param params - Optional parameters for pagination and searching
   */
  // getRagInfoList(params?: RagInfoRequestParams): Promise<RagInfoPage>; // Already declared above

  /**
   * Get a specific RAG information item
   * @param id - RAG information item ID
   */
  getRagInfo(id: string): Promise<RagInfoItem>;

  /**
   * Create a new RAG information item
   * @param data - RAG information creation data
   */
  // createRagInfo(data: CreateRagInfoRequest): Promise<RagInfoItem>; // Already declared above

  /**
   * Update an existing RAG information item
   * @param id - RAG information item ID
   * @param data - RAG information update data
   */
  // updateRagInfo(id: string, data: UpdateRagInfoRequest): Promise<RagInfoItem>; // Already declared above

  /**
   * Delete a RAG information item
   * @param id - RAG information item ID
   */
  // deleteRagInfo(id: string): Promise<void>; // Already declared above

  /** Get current configuration */
  // getConfig(): Promise<LlmConfig>; // Already declared above

  /** Update configuration */
  // updateConfig(configUpdate: UpdateConfigRequest): Promise<void>; // Already declared above

   /**
   * Query RAG for context (used by internal services, might not be exposed to UI directly)
   * @param question - The query string
   */
   queryRag(question: string): Promise<any>; // Define 'any' for now, can be more specific if response structure is known
}

// --- RAG Information Types ---

export interface RagInfoItem {
  id: string; // Or number, depending on backend
  key: string;
  description: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

export interface RagInfoPage {
  items: RagInfoItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface RagInfoRequestParams {
  page?: number;
  limit?: number;
  search?: string; // Filter by key or description
}

export interface CreateRagInfoRequest {
  key: string;
  description: string;
}

export interface UpdateRagInfoRequest {
  key?: string; // Optional: Allow updating key? Decide based on backend
  description?: string;
}

// Authentication Types
export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  roles: string[];      // Array of role names
  permissions?: string[]; // Array of permission codes (calculated on backend)
  createdAt?: string;
  updatedAt?: string;
}

// RBAC Types
export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: Permission[]; // Permissions associated with the role
}

export interface Permission {
  id: number;
  code: string;          // e.g., 'users:manage', 'classify:item'
  description?: string;
}

// Request/Response for User Management
export interface UserListResponse {
  items: User[];
  totalCount: number;
  // Add pagination if needed
}

export interface CreateUserRequest {
  username: string;
  password?: string; // Required on create
  roles: string[]; // Assign roles by name
}

export interface UpdateUserRequest {
  username?: string; // Optional update
  password?: string; // Optional: For password change
  roles?: string[];  // Optional: For updating roles
}

// Request/Response for Role Management
export interface RoleListResponse {
  items: Role[];
  totalCount: number;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[]; // Assign permissions by code
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// Request/Response for Permissions (likely just GET list)
export interface PermissionListResponse {
  items: Permission[];
  totalCount: number;
}

// Configuration Types
export interface LlmConfig {
  server?: {
    host: string;
    port: number;
    requestTimeout: string;
    logLevel: string;
  };  service?: {
    batchSize: number;
    dataPath: string;
    commonDataPath: string;
    excelPattern: string;
    llmEndpoint: string;
    llmApiKey: string;
    llmModel: string;
    llmRetryModels?: string[];
    llmMaxTokens: number;
    llmTemperature: number;
    useTypePrompt: boolean;
    maxSkipLogs: number;
    unspscExcelLoader: {
      filePath: string;
      sheetName: string;
      levelHeaders: Array<{
        dbLevelCode: string;
        codeHeader: string;
        titleHeader: string;
      }>;
    };
    commonExcelLoader: {
      filePath: string;
      sheetName: string;
      level1HeaderName: string;
    };
  };
  database?: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    dataPath: string;
    ragServiceUrl: string;
    ragEnabled: boolean;
    ragManualInfoCollection: string;
    ragUnspscCollection: string;
    ragCommonCollection: string;
  };
  validation?: {
    maxHistoryLimit: number;
    tokenLimit: number;
    defaultTimeout: string;
  };
  alert?: {
    emailSettings: {
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
      fromEmail: string;
    };
    webhookSettings: {
      url: string;
    };
  };
  
  auth?: {
    enabled: boolean;
    jwtSecret: string;
    jwtExpirationHours: number; 
    initialAdminUser: string;
    initialAdminPassword?: string;
  };
  
  // Keep these for backward compatibility
  llmEndpoint?: string;
  llmApiKey?: string;
  ragEnabled?: boolean;
}

// --- Helper types for config update API ---
// These types provide structure for the update API but don't replace the main LlmConfig interface

export interface UpdateServerConfig {
  logLevel?: string;
  requestTimeout?: string; // e.g., "60s"
}

export interface UpdateServiceConfig {
  llmEndpoint?: string;
  llmApiKey?: string; // Allow sending new key, BEWARE: sent in plain text
  llmModel?: string;
  llmRetryModels?: string[];
  llmMaxTokens?: number;
  llmTemperature?: number;
  useTypePrompt?: boolean;
  maxSkipLogs?: number;
}

export interface UpdateDatabaseConfig {
  ragEnabled?: boolean;
  ragServiceUrl?: string;
  ragManualInfoCollection?: string;
  ragUnspscCollection?: string;
  ragCommonCollection?: string;
}

export interface UpdateValidationConfig {
  maxHistoryLimit?: number;
  tokenLimit?: number;
  defaultTimeout?: string; // e.g., "15s"
}

export interface UpdateEmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string; // Allow sending new password, BEWARE: sent in plain text
  fromEmail?: string;
}

export interface UpdateWebhookSettings {
  url?: string;
}

export interface UpdateAlertConfig {
  emailSettings?: UpdateEmailSettings;
  webhookSettings?: UpdateWebhookSettings;
}

export interface UpdateAuthConfig {
  enabled?: boolean;
  jwtExpirationHours?: number;
}

// Main Update Request Payload structure
export interface UpdateConfigRequest {
  server?: UpdateServerConfig;
  service?: UpdateServiceConfig;
  database?: UpdateDatabaseConfig;
  validation?: UpdateValidationConfig;
  alert?: UpdateAlertConfig;
  auth?: UpdateAuthConfig;
}

// --- Ensure LlmConfig Interface is up-to-date ---
export interface ServerConfig {
  host?: string;
  port?: number;
  requestTimeout?: string;
  logLevel?: string;
}

export interface LevelHeaderPair {
  dbLevelCode?: string;
  codeHeader?: string;
  titleHeader?: string;
}

export interface UnspscExcelLoaderConfig {
  filePath?: string;
  sheetName?: string;
  levelHeaders?: LevelHeaderPair[];
}

export interface CommonExcelLoaderConfig {
  filePath?: string;
  sheetName?: string;
  level1HeaderName?: string;
}

export interface ServiceConfig {
  batchSize?: number;
  dataPath?: string;
  commonDataPath?: string;
  excelPattern?: string;
  llmEndpoint?: string;
  llmApiKey?: string; // Expect "[REDACTED]" or similar mask from GET
  llmModel?: string;
  llmRetryModels?: string[];
  llmMaxTokens?: number;
  llmTemperature?: number;
  useTypePrompt?: boolean;
  maxSkipLogs?: number;
  batchRetryLimit?: number;
  unspscExcelLoader?: UnspscExcelLoaderConfig;
  commonExcelLoader?: CommonExcelLoaderConfig;
}

export interface DatabaseConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string; // Expect "[REDACTED]"
  name?: string;
  dataPath?: string;
  ragServiceUrl?: string;
  ragEnabled?: boolean;
  ragManualInfoCollection?: string;
  ragUnspscCollection?: string;
  ragCommonCollection?: string;
}

export interface ValidationConfig {
  maxHistoryLimit?: number;
  tokenLimit?: number;
  defaultTimeout?: string;
}

export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string; // Expect "[REDACTED]"
  fromEmail?: string;
}

export interface WebhookSettings {
  url?: string;
}

export interface AlertConfig {
  emailSettings?: EmailSettings;
  webhookSettings?: WebhookSettings;
}

export interface AuthConfig {
  enabled?: boolean;
  jwtSecret?: string; // Expect "[REDACTED]"
  jwtExpirationHours?: number;
  initialAdminUser?: string;
  initialAdminPassword?: string; // Expect "[REDACTED]"
}

// Core Domain Types
export interface ClassificationSystem {
  id: number;
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
}

export interface ClassificationLevel {
  id: number;
  systemId: number; 
  levelNumber: number; 
  code: string;
  name: string;
  description?: string;
  validationRegex?: string; 
}

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
  error?: string;
}

// Classification Types
export interface ClassificationResult {
  system_code: string;
  description: string;
  levels: { [key: string]: CategoryLevel }; // key is level_code
  status: 'success' | 'failed' | 'partial';
  error?: string;
  timestamp: string; // ISO Date string
  ragContextUsed: boolean;
  ragContext?: string;
  levelResponses?: { [key: string]: string }; // Level-specific LLM responses
  firstLevelPrompt?: string; // Renamed from prompt to match backend changes
  allPromptsDetail?: string; // JSON string of all prompts
  modelUsed?: string;
}

export interface ClassificationError {
  message: string;
  code?: string;
  level?: string;
}

// Request Types
export interface ClassificationRequest {
  ItemID?: string; // Changed from item_id to ItemID
  Name?: string;   // Changed from name to Name
  description: string;
  systemCode?: string; // Changed from system_code to systemCode
  additionalContext?: string; // Changed from additional_context to additionalContext
  levels?: { [key: string]: string }; // For manual classification
  IsManual?: boolean; // Changed from is_manual to IsManual
  key?: string; // Unique key identifier for the item
}

export interface ManualClassificationRequest {
  description: string;
  systemCode: string;
  selectedSystem?: string; // Optional based on your backend expectation, usually same as systemCode
  additionalContext?: string;
  modelOverride?: string; // Optional LLM model override for classification
  levels: { [levelCode: string]: string };
}

export interface SystemCategoriesRequest {
  systemCode: string;
  level: string;
  parentCode?: string;
  search?: string;
}

export interface BatchClassificationRequest {
  items: Array<{
    description: string;
    additionalContext?: string;
    key?: string; // Include key field to identify batch items
  }>;
  systemCode?: string; // Changed from system_code to systemCode
  key_column_names?: string[]; 
}

// Response Types
export interface BatchClassificationResult {
  results?: BatchItemResult[]; 
  id: string;
  status: string;
  timestamp: string;
  Results?: BatchItemResult[]; // Kept for backward compatibility if backend sends this casing
  error?: string;
  system_code?: string;  
  updated_at?: string;
  totalItems?: number; 
  processedItems?: number; 
  keyColumnNames?: string[]; 
  systemCode?: string; 
}

export interface BatchItemResult {
  description: string;
  additional_context?: string;
  result?: ClassificationResult;
  error?: string | ClassificationError; 
  key?: string; 
  prompt?: string; // This is likely the first-level prompt used for this item
  allPromptsDetail?: string; // This is the JSON string of all prompts for this item
}

export interface BatchJobParams {
  cursor?: string;
  limit?: number;
  status?: string;
  startDate?: string; 
  endDate?: string;   
}

export interface BatchJobsPage {
  items: BatchClassificationResult[];
  totalCount: number;
  nextCursor?: string;
}

// History Types
export interface ClassificationHistory {
  id: number; 
  description: string;
  systemCode: string;
  additionalContext?: string;
  levels: { [key: string]: CategoryLevel };
  createdAt: string; 
  status: 'success' | 'failed' | 'partial';
  createdBy: string;
  sourceType: 'user' | 'batch' | 'manual' | 'api';
  ragContextUsed: boolean;
  ragContext?: string;
  error?: string;
  levelResponses?: { [key: string]: string }; 
  firstLevelPrompt?: string; // Renamed from prompt
  key?: string; 
  allPromptsDetail?: string; // JSON string of all prompts
  modelUsed?: string; 
}

export interface ClassificationHistoryPage {
  items: ClassificationHistory[];
  totalCount: number;
  nextCursor?: string;
}

// Request parameters for fetching classification history
export interface ClassificationHistoryRequest {
  systemCode?: string;
  limit?: number;
  cursor?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string; 
  sourceType?: string;
  createdBy?: string;
}

// Status Types

export type ClassificationStatus = 'all' | 'success' | 'partial' | 'failed';
export type BatchStatus = 'pending' | 'processing' | 'completed' | 'error';

export type ClassificationSourceType  = 'user' | 'batch' | 'api' | 'manual' | ''; // Allow empty for 'all'

export type BatchJobStatusFilterType = BatchStatus | 'all';