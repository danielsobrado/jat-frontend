import {
  ApiClient,
  ClassificationResult,
  LlmConfig,
  UpdateConfigRequest, 
  ClassificationSystem,
  ClassificationLevel,
  Category,
  SystemCategoriesRequest,
  ClassificationHistoryRequest,
  ClassificationHistoryPage,
  BatchClassificationRequest,
  BatchClassificationResult,
  ManualClassificationRequest,
  BatchJobsPage,
  BatchJobParams,
  RagInfoItem,
  RagInfoPage,
  RagInfoRequestParams,
  CreateRagInfoRequest,
  UpdateRagInfoRequest,
  LoginResponse,
  User,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  RoleListResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  Role,
  PermissionListResponse,
} from './types';

import { ApiClientCore } from './core-client';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';
import { ClassificationService } from './classification.service';
import { BatchClassificationService } from './batch-classification.service';
import { SystemService } from './system.service';
import { ConfigService } from './config.service';
import { RagService } from './rag.service';

export class WebApiClient implements ApiClient {
  private core: ApiClientCore;
  private authService: AuthService;
  private userService: UserService;
  private roleService: RoleService;
  private permissionService: PermissionService;
  private classificationService: ClassificationService;
  private batchClassificationService: BatchClassificationService;
  private systemService: SystemService;
  private configService: ConfigService;
  private ragService: RagService;

  constructor() {
    this.core = new ApiClientCore();
    this.authService = new AuthService(this.core);
    this.userService = new UserService(this.core);
    this.roleService = new RoleService(this.core);
    this.permissionService = new PermissionService(this.core);
    this.classificationService = new ClassificationService(this.core);
    this.batchClassificationService = new BatchClassificationService(this.core);
    this.systemService = new SystemService(this.core);
    this.configService = new ConfigService(this.core);
    this.ragService = new RagService(this.core);
  }

  // Initialize method now fetches auth config
  async initialize(): Promise<void> {
    await this.core.fetchAuthConfig();
  }

  // --- Delegate methods to services ---

  // Auth
  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  isAuthEnabled(): boolean | null { return this.authService.isAuthEnabled(); }
  async login(username: string, password: string): Promise<LoginResponse> { return this.authService.login(username, password); }
  clearToken(): void { this.authService.clearToken(); }
  async getCurrentUser(): Promise<User> { return this.authService.getCurrentUser(); }

  // User Management
  async getUsers(params?: { limit?: number; offset?: number; search?: string }): Promise<UserListResponse> { return this.userService.getUsers(params); }
  async createUser(data: CreateUserRequest): Promise<User> { return this.userService.createUser(data); }
  async updateUser(id: number, data: UpdateUserRequest): Promise<User> { return this.userService.updateUser(id, data); }
  async deleteUser(id: number): Promise<void> { return this.userService.deleteUser(id); }
  async assignRolesToUser(userId: number, roleNames: string[]): Promise<void> { return this.userService.assignRolesToUser(userId, roleNames); }

  // Role Management
  async getRoles(params?: { limit?: number; offset?: number }): Promise<RoleListResponse> { return this.roleService.getRoles(params); }
  async createRole(data: CreateRoleRequest): Promise<Role> { return this.roleService.createRole(data); }
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> { return this.roleService.updateRole(id, data); }
  async deleteRole(id: number): Promise<void> { return this.roleService.deleteRole(id); }

  // Permission Management
  async getPermissions(): Promise<PermissionListResponse> { return this.permissionService.getPermissions(); }

  // Classification
  async classify(description: string, systemCode?: string, additionalContext?: string, modelOverride?: string): Promise<ClassificationResult> { return this.classificationService.classify(description, systemCode, additionalContext, modelOverride); }
  async classifyManually(request: ManualClassificationRequest): Promise<ClassificationResult> { return this.classificationService.classifyManually(request); }
  async rerunClassification(id: string): Promise<ClassificationResult> { return this.classificationService.rerunClassification(id); }
  async deleteClassification(id: string): Promise<void> { return this.classificationService.deleteClassification(id); }
  async getClassificationHistory(req: ClassificationHistoryRequest): Promise<ClassificationHistoryPage> { return this.classificationService.getClassificationHistory(req); }
  async deleteClassificationHistory(id: string): Promise<void> { return this.classificationService.deleteClassificationHistory(id); }

  // Batch Classification
  async classifyBatch(request: BatchClassificationRequest): Promise<BatchClassificationResult> { return this.batchClassificationService.classifyBatch(request); }
  async getBatchStatus(batchId: string): Promise<BatchClassificationResult> { return this.batchClassificationService.getBatchStatus(batchId); }
  async getBatchJobs(params: BatchJobParams): Promise<BatchJobsPage> { return this.batchClassificationService.getBatchJobs(params); }

  // System
  async getClassificationSystems(): Promise<ClassificationSystem[]> { return this.systemService.getClassificationSystems(); }
  async getClassificationSystem(code: string): Promise<{ system: ClassificationSystem; levels: ClassificationLevel[] }> { return this.systemService.getClassificationSystem(code); }
  async getSystemCategories(req: SystemCategoriesRequest): Promise<Category[]> { return this.systemService.getSystemCategories(req); }

  // Config
  async getConfig(): Promise<LlmConfig & { ragEnabled?: boolean }> { return this.configService.getConfig(); }
  async updateConfig(configUpdate: UpdateConfigRequest): Promise<void> { 
    return this.configService.updateConfig(configUpdate); 
  }

  // RAG
  async getRagInfoList(params: RagInfoRequestParams): Promise<RagInfoPage> { return this.ragService.getRagInfoList(params); }
  async createRagInfo(data: CreateRagInfoRequest): Promise<RagInfoItem> { return this.ragService.createRagInfo(data); }
  async getRagInfoItem(id: string): Promise<RagInfoItem> { return this.ragService.getRagInfoItem(id); }
  async updateRagInfo(id: string, data: UpdateRagInfoRequest): Promise<RagInfoItem> { return this.ragService.updateRagInfo(id, data); }
  async deleteRagInfo(id: string): Promise<void> { return this.ragService.deleteRagInfo(id); }
  async getRagInfo(id: string): Promise<RagInfoItem> { return this.ragService.getRagInfo(id); } // Keep for compatibility
  async queryRag(question: string): Promise<any> { return this.ragService.queryRag(question); }

  // For backward compatibility - fetch auth config (will eventually be removed)
  async fetchAuthConfig(): Promise<void> {
    return this.core.fetchAuthConfig();
  }
}
