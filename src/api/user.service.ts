import { formatEndpoint } from '../config/api';
import { ApiClientCore, USER_INFO_KEY } from './core-client';
import { User, UserListResponse, CreateUserRequest, UpdateUserRequest } from './types';

export class UserService {
    constructor(private core: ApiClientCore) {}

    async getUsers(params?: { limit?: number; offset?: number; search?: string }): Promise<UserListResponse> {
        const urlParams = new URLSearchParams();
        if (params?.limit) urlParams.append('limit', params.limit.toString());
        if (params?.offset) urlParams.append('offset', params.offset.toString());
        if (params?.search) urlParams.append('search', params.search);
        const url = `${formatEndpoint('/users')}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to get users");
            }
            return await response.json();
        } catch (error) {
            console.error(`Get users error:`, error);
            throw error;
        }
    }

    async createUser(data: CreateUserRequest): Promise<User> {
        const url = formatEndpoint('/users');
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to create user");
            }
            return await response.json();
        } catch (error) {
            console.error(`Create user error:`, error);
            throw error;
        }
    }

    async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
        const url = formatEndpoint(`/users/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to update user");
            }
            const result = await response.json();
            const currentUser = this.core.getCurrentUserInfo();
            if (currentUser && currentUser.id === id) {
                localStorage.setItem(USER_INFO_KEY, JSON.stringify(result));
            }
            return result;
        } catch (error) {
            console.error(`Update user error:`, error);
            throw error;
        }
    }

    async deleteUser(id: number): Promise<void> {
        const url = formatEndpoint(`/users/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to delete user");
            }
        } catch (error) {
            console.error(`Delete user error:`, error);
            throw error;
        }
    }

    async assignRolesToUser(userId: number, roleNames: string[]): Promise<void> {
        const url = formatEndpoint(`/users/${userId}/roles`);
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roles: roleNames }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to assign roles to user");
            }
        } catch (error) {
            console.error(`Assign roles error:`, error);
            throw error;
        }
    }
}