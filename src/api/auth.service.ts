import { formatEndpoint } from '../config/api';
import { ApiClientCore, AUTH_TOKEN_KEY, USER_INFO_KEY } from './core-client';
import { LoginResponse, User } from './types';

export class AuthService {
  constructor(private core: ApiClientCore) {}

  isLoggedIn(): boolean {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return !!token;
  }

  isAuthEnabled(): boolean | null {
    return this.core.authEnabled;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] Logging in user: ${username}`);
    try {
      const response = await this.core.fetchWithTimeout(formatEndpoint('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText || 'Login failed' }));
        throw new Error(error.error || 'Authentication failed');
      }
      const result = await response.json();
      if (result.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        if (result.user) {
          localStorage.setItem(USER_INFO_KEY, JSON.stringify(result.user));
        }
      } else {
        throw new Error('Authentication response missing token');
      }
      return result;
    } catch (error) {
      console.error(`[${requestId}] Login error:`, error);
      throw error;
    }
  }

  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    console.log('User logged out, token and user info cleared');
  }

  async getCurrentUser(): Promise<User> {
    const cachedUser = this.core.getCurrentUserInfo();
    if (cachedUser && cachedUser.permissions) {
      return cachedUser;
    }
    const url = formatEndpoint('/auth/me');
    try {
      const response = await this.core.fetchWithTimeout(url);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || "Failed to get current user information");
      }
      const user = await response.json();
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw error;
    }
  }
}