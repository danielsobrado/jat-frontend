import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { 
  BatchClassificationRequest, 
  BatchClassificationResult, 
  BatchJobsPage,
  BatchJobParams
} from './types';

export class BatchClassificationService {
    constructor(private core: ApiClientCore) {}

    async classifyBatch(request: BatchClassificationRequest): Promise<BatchClassificationResult> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const requestBody: any = {
                items: request.items.map(item => ({
                    description: item.description,
                    additional_context: item.additionalContext,
                    key: item.key
                })),
                system_code: request.systemCode,
            };
            if (Array.isArray(request.key_column_names) && request.key_column_names.length > 0) {
                requestBody.key_column_names = request.key_column_names;
            }

            const response = await this.core.fetchWithTimeout(formatEndpoint('/classify/batch'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Batch classification failed');
            }
            const result = await response.json();
            return {
                ...result,
                timestamp: this.core.formatDate(result.timestamp),
                systemCode: request.systemCode
            };
        } catch (error) {
            console.error(`[${requestId}] Batch classification error:`, error);
            throw error;
        }
    }

    async getBatchStatus(batchId: string): Promise<BatchClassificationResult> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const response = await this.core.fetchWithTimeout(formatEndpoint(`/batch/${batchId}/status`));
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get batch status');
            }
            const result = await response.json();
            const systemCode = result.system_code || result.results?.[0]?.result?.system_code;
            return {
                ...result,
                timestamp: this.core.formatDate(result.timestamp),
                systemCode
            };
        } catch (error) {
            console.error(`[${requestId}] Get batch status error:`, error);
            throw error;
        }
    }

    async getBatchJobs(params: BatchJobParams): Promise<BatchJobsPage> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const searchParams = new URLSearchParams();
            if (params.limit) searchParams.append('limit', params.limit.toString());
            if (params.cursor) searchParams.append('cursor', params.cursor);
            if (params.status) searchParams.append('status', params.status);
            if (params.startDate) searchParams.append('start_date', params.startDate);
            if (params.endDate) searchParams.append('end_date', params.endDate);

            const url = `${formatEndpoint('/batch/jobs')}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
            const response = await this.core.fetchWithTimeout(url, { method: 'GET' });

            if (!response.ok) {
                throw new Error(`Failed to fetch batch jobs: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[${requestId}] Error fetching batch jobs:`, error);
            throw error;
        }
    }
}