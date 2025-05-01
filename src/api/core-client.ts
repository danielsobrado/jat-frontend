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
    }
  }

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

      // Use fetch directly here as fetchWithTimeout might not be fully initialized
      // or to avoid circular dependencies if auth state affects fetchWithTimeout.
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