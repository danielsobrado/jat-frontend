import { formatEndpoint } from '../config/api';

// Constants for local storage keys
export const AUTH_TOKEN_KEY = 'authToken';
export const USER_INFO_KEY = 'userInfo';

export class ApiClientCore {
  readonly timeoutDuration: number = 6000000; // 600 second timeout
  authEnabled: boolean | null = null; // Track if auth is enabled

  formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) {
      return new Date().toISOString();
    }
    try {
      return new Date(dateStr).toISOString();
    } catch (e) {
      console.error('Error formatting date:', dateStr, e);
      return new Date().toISOString();
    }
  }

  getAuthHeader(): HeadersInit {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const id = Math.random().toString(36).substring(7);

    const timeout = setTimeout(() => {
      controller.abort();
      console.error(`Request ${id} timed out:`, url);
    }, this.timeoutDuration);

    const authHeaders = this.getAuthHeader();
    const headers = {
      ...options.headers,
      ...authHeaders
    };

    console.log(`[${id}] Starting request:`, url);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      console.log(`[${id}] Response received:`, {
        url,
        status: response.status,
        ok: response.ok
      });

      // Handle potential 401 Unauthorized specifically
      if (response.status === 401) {
          console.warn(`[${id}] Unauthorized request to ${url}. Clearing token.`);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          // Optionally redirect to login or notify the user
          // window.location.href = '/login'; // Example redirect
      }

      return response;
    } catch (error) {
      console.error(`[${id}] Request failed:`, {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }  }

  // --- Add generic HTTP methods ---
  async get<T = any>(path: string, params?: Record<string, any>, config?: RequestInit): Promise<T> {
    const endpoint = formatEndpoint(path);
    let urlString = endpoint;
    
    // Add query parameters to the URL
    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, String(params[key]));
        }
      });
      const queryString = queryParams.toString();
      urlString = queryString ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}` : endpoint;
    }
    
    const response = await this.fetchWithTimeout(urlString, { method: 'GET', ...config });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${path}, details: ${errorData}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T = any>(path: string, data?: any, config?: RequestInit): Promise<T> {
    const endpoint = formatEndpoint(path);
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...config?.headers },
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${path}, details: ${errorData}`);
    }
    // Handle cases where response might be empty (e.g., 204 No Content)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as Promise<T>; // Or handle as appropriate
  }

  async put<T = any>(path: string, data?: any, config?: RequestInit): Promise<T> {
    const endpoint = formatEndpoint(path);
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...config?.headers },
      body: data ? JSON.stringify(data) : null,
      ...config,
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${path}, details: ${errorData}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as Promise<T>;
  }

  async delete<T = any>(path: string, config?: RequestInit): Promise<T> {
    const endpoint = formatEndpoint(path);
    const response = await this.fetchWithTimeout(endpoint, {
      method: 'DELETE',
      ...config,
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, path: ${path}, details: ${errorData}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as Promise<T>;
  }
  // --- End of new methods ---

  getCurrentUserInfo(): any | null {
    const stored = localStorage.getItem(USER_INFO_KEY);
    try {
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Error parsing stored user info:", e);
      localStorage.removeItem(USER_INFO_KEY); // Clear invalid data
      return null;
    }
  }
  async fetchAuthConfig(): Promise<void> {
    try {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[${requestId}] Fetching auth configuration`);

      // Use auth config endpoint with v1 prefix
      const response = await fetch(formatEndpoint('/auth/config'));

      if (!response.ok) {
        console.warn(`[${requestId}] Failed to fetch auth config, assuming auth is disabled`);
        this.authEnabled = false;
        return;
      }

      const data = await response.json();
      this.authEnabled = data.enabled === true;
      console.log(`[${requestId}] Auth configuration fetched, auth is ${this.authEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error fetching auth config:', error);
      this.authEnabled = false; // Default to disabled on error
    }
  }
}