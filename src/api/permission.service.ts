import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { PermissionListResponse } from './types';

export class PermissionService {
    constructor(private core: ApiClientCore) {}

    async getPermissions(): Promise<PermissionListResponse> {
        const url = formatEndpoint('/permissions');
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || "Failed to get permissions");
            }
            return await response.json();
        } catch (error) {
            console.error(`Get permissions error:`, error);
            throw error;
        }
    }
}