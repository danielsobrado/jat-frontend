import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { 
    RagInfoItem, 
    RagInfoPage, 
    RagInfoRequestParams, 
    CreateRagInfoRequest, 
    UpdateRagInfoRequest 
} from './types';

export class RagService {
    constructor(private core: ApiClientCore) {}

    async getRagInfoList(params: RagInfoRequestParams): Promise<RagInfoPage> {
        const requestId = Math.random().toString(36).substring(7);
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.search) searchParams.append('search', params.search);
        const url = `${formatEndpoint('/rag-info')}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get RAG info list');
            }
            const result = await response.json();
            return {
                items: (result.items || []).map((item: any) => ({
                    ...item,
                    createdAt: this.core.formatDate(item.createdAt),
                    updatedAt: this.core.formatDate(item.updatedAt)
                })),
                totalCount: result.totalCount || 0,
                totalPages: result.totalPages || 1,
                currentPage: result.currentPage || 1,
            };
        } catch (error) {
            console.error(`[${requestId}] Get RAG info list error:`, error);
            throw error;
        }
    }

    async createRagInfo(data: CreateRagInfoRequest): Promise<RagInfoItem> {
        const requestId = Math.random().toString(36).substring(7);
        const url = formatEndpoint('/rag-info');
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to create RAG info');
            }
            const result = await response.json();
            return {
                ...result,
                createdAt: this.core.formatDate(result.createdAt),
                updatedAt: this.core.formatDate(result.updatedAt)
            };
        } catch (error) {
            console.error(`[${requestId}] Create RAG info error:`, error);
            throw error;
        }
    }

    async getRagInfoItem(id: string): Promise<RagInfoItem> {
        const requestId = Math.random().toString(36).substring(7);
        const url = formatEndpoint(`/rag-info/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `Failed to get RAG info item ${id}`);
            }
            const result = await response.json();
            return {
                ...result,
                createdAt: this.core.formatDate(result.createdAt),
                updatedAt: this.core.formatDate(result.updatedAt)
            };
        } catch (error) {
            console.error(`[${requestId}] Get RAG info item error:`, error);
            throw error;
        }
    }

    async updateRagInfo(id: string, data: UpdateRagInfoRequest): Promise<RagInfoItem> {
        const requestId = Math.random().toString(36).substring(7);
        const url = formatEndpoint(`/rag-info/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `Failed to update RAG info ${id}`);
            }
            const result = await response.json();
            return {
                ...result,
                createdAt: this.core.formatDate(result.createdAt),
                updatedAt: this.core.formatDate(result.updatedAt)
            };
        } catch (error) {
            console.error(`[${requestId}] Update RAG info error:`, error);
            throw error;
        }
    }

    async deleteRagInfo(id: string): Promise<void> {
        const requestId = Math.random().toString(36).substring(7);
        const url = formatEndpoint(`/rag-info/${id}`);
        try {
            const response = await this.core.fetchWithTimeout(url, { method: 'DELETE' });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `Failed to delete RAG info ${id}`);
            }
        } catch (error) {
            console.error(`[${requestId}] Delete RAG info error:`, error);
            throw error;
        }
    }

    // Keep the duplicate getRagInfo for compatibility if needed
    async getRagInfo(id: string): Promise<RagInfoItem> {
        return this.getRagInfoItem(id);
    }

    async queryRag(question: string): Promise<any> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const url = formatEndpoint('/rag/query');
            const response = await this.core.fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'RAG query failed');
            }
            return await response.json();
        } catch (error) {
            console.error(`[${requestId}] RAG query error:`, error);
            throw error;
        }
    }
}