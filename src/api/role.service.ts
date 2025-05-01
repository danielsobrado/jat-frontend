import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { RoleListResponse, CreateRoleRequest, UpdateRoleRequest, Role } from './types';

export class RoleService {
    constructor(private core: ApiClientCore) {}

    async getRoles(params?: { limit?: number; offset?: number }): Promise<RoleListResponse> {
        const urlParams = new URLSearchParams();
        if (params?.limit) urlParams.append('limit', params.limit.toString());
        if (params?.offset) urlParams.append('offset', params.offset.toString());
        const url = `${formatEndpoint('/roles')}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to get roles");
            }
            return await response.json();
        } catch (error) {
            console.error(`Get roles error:`, error);
            throw error;
        }
    }

    async createRole(data: CreateRoleRequest): Promise<Role> {
        const url = formatEndpoint('/roles');
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to create role");
            }
            return await response.json();
        } catch (error) {
            console.error(`Create role error:`, error);
            throw error;
        }
    }

    async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
        const url = formatEndpoint(`/roles/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to update role");
            }
            return await response.json();
        } catch (error) {
            console.error(`Update role error:`, error);
            throw error;
        }
    }

    async deleteRole(id: number): Promise<void> {
        const url = formatEndpoint(`/roles/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to delete role");
            }
        } catch (error) {
            console.error(`Delete role error:`, error);
            throw error;
        }
    }
}