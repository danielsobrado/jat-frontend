// Base configuration for API endpoints
export const API_CONFIG = {
  baseUrl: '/api', // Use relative URL in all environments to leverage Vite's proxy
  version: 'v1',
  getFullBaseUrl: () => {
    return `${API_CONFIG.baseUrl}/${API_CONFIG.version}`; // Corrected to include baseUrl and version
  }
};

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const API_ENDPOINTS = {
  systems: {
    list: '/systems',
    get: '/systems/{code}',
  },
  classify: {
    auto: '/classify',
    manual: '/classify/manual',
    batch: '/classify/batch'
  },
  history: '/history',
  batch: {
    create: '/classify/batch',
    jobs: '/batch/jobs',
    status: '/batch/jobs/{id}'
  },
  // --- User Management Endpoints ---
  users: {
    list: '/users',
    create: '/users',
    get: '/users/{id}',
    update: '/users/{id}',
    delete: '/users/{id}',
    roles: '/users/{id}/roles'
  },
  roles: {
    list: '/roles',
    create: '/roles',
    update: '/roles/{id}',
    delete: '/roles/{id}'
  },
  permissions: {
    list: '/permissions'
  },
  auth: {
    config: '/auth/config',
    login: '/auth/login',
    currentUser: '/auth/me'
  },
  // --- RAG Endpoints ---
  ragInfo: {
    list: '/rag-info',      // GET (with pagination/filter params)
    create: '/rag-info',    // POST
    get: '/rag-info/{id}', // GET
    update: '/rag-info/{id}', // PUT or PATCH
    delete: '/rag-info/{id}'  // DELETE
  },
  // Add endpoint for frontend config if needed
  frontendConfig: '/settings/config',
  chat: { 
    completions: '/chat/completions', 
  },
};

export const formatEndpoint = (endpoint: string, params?: Record<string, string>): string => {
  let formattedEndpoint = endpoint;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      formattedEndpoint = formattedEndpoint.replace(`{${key}}`, value);
    });
  }
  
  return `${API_CONFIG.getFullBaseUrl()}${formattedEndpoint}`;
};
