import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { 
  ClassificationSystem, 
  ClassificationLevel,
  Category,
  SystemCategoriesRequest
} from './types';

export class SystemService {
    constructor(private core: ApiClientCore) {}

    async getClassificationSystems(): Promise<ClassificationSystem[]> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const response = await this.core.fetchWithTimeout(formatEndpoint('/systems'));
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get classification systems');
            }
            const data = await response.json();
            const systems = Array.isArray(data.systems) ? data.systems : [];
            return systems.map((system: any) => ({
                id: system.id,
                code: system.code,
                name: system.name,
                description: system.description,
                enabled: system.enabled,
                createdAt: this.core.formatDate(system.created_at)
            }));
        } catch (error) {
            console.error(`[${requestId}] Get classification systems error:`, error);
            throw error;
        }
    }

    async getClassificationSystem(code: string): Promise<{ system: ClassificationSystem; levels: ClassificationLevel[] }> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const response = await this.core.fetchWithTimeout(formatEndpoint(`/systems/${code}`));
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get classification system');
            }
            const data = await response.json();
            const system: ClassificationSystem = {
                id: data.system.id,
                code: data.system.code,
                name: data.system.name,
                description: data.system.description,
                enabled: data.system.enabled,
                createdAt: this.core.formatDate(data.system.created_at)
            };
            const levels = (data.levels || []).map((level: any) => ({
                id: level.id,
                systemId: level.system_id,
                levelNumber: level.level_number,
                code: level.code,
                name: level.name,
                description: level.description,
                validationRegex: level.validation_regex
            }));
            return { system, levels };
        } catch (error) {
            console.error(`[${requestId}] Get classification system error:`, error);
            throw error;
        }
    }

    async getSystemCategories(req: SystemCategoriesRequest): Promise<Category[]> {
        const requestId = Math.random().toString(36).substring(7);
        const params = new URLSearchParams();
        if (req.level) params.append('level', req.level);
        if (req.parentCode) params.append('parent_code', req.parentCode);
        const url = `${formatEndpoint(`/systems/${req.systemCode}/categories`)}${params.toString() ? '?' + params.toString() : ''}`;
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get system categories');
            }
            const data = await response.json();
            const categories = Array.isArray(data.categories) ? data.categories : [];
            return categories.map((cat: any) => ({
                id: cat.id,
                systemId: cat.system_id,
                code: cat.code,
                name: cat.name,
                description: cat.description,
                levelCode: cat.level_code,
                parentCode: cat.parent_code,
                createdAt: this.core.formatDate(cat.created_at)
            }));
        } catch (error) {
            console.error(`[${requestId}] Get system categories error:`, error);
            throw error;
        }
    }
}