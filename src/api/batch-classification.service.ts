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
                // Ensure systemCode is correctly propagated or derived
                systemCode: result.system_code || request.systemCode || result.results?.[0]?.result?.system_code
            };
        } catch (error) {
            console.error(`[${requestId}] Batch classification error:`, error);
            throw error;
        }
    }

    async getBatchStatus(batchId: string): Promise<BatchClassificationResult> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            // Corrected endpoint:
            const response = await this.core.fetchWithTimeout(formatEndpoint(`/batch/jobs/${batchId}`));
            if (!response.ok) {
                // Try to parse error from backend, otherwise use statusText
                let errorPayload;
                try {
                    errorPayload = await response.json();
                } catch (e) {
                    // Ignore parsing error if body is not JSON or empty
                }
                const errorMessage = errorPayload?.error || response.statusText || `Failed to get batch status (${response.status})`;
                console.error(`[${requestId}] Get batch status error (${response.status}):`, errorMessage, errorPayload);
                throw new Error(errorMessage);
            }
            const result = await response.json();
            // Ensure systemCode is correctly propagated or derived for consistency
            const systemCode = result.system_code || result.results?.[0]?.result?.system_code;
            return {
                ...result,
                timestamp: this.core.formatDate(result.timestamp),
                updated_at: result.updated_at ? this.core.formatDate(result.updated_at) : undefined,
                systemCode // Keep consistent casing
            };
        } catch (error) {
            // Log already happened or will be handled by the caller
            // console.error(`[${requestId}] Get batch status error (outer):`, error);
            throw error;
        }
    }

    async getBatchJobs(params: BatchJobParams): Promise<BatchJobsPage> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const searchParams = new URLSearchParams();
            if (params.limit) searchParams.append('limit', params.limit.toString());
            if (params.cursor) searchParams.append('cursor', params.cursor);
            if (params.status && params.status !== 'all') searchParams.append('status', params.status); // Only add if not 'all'
            if (params.startDate) searchParams.append('start_date', params.startDate);
            if (params.endDate) searchParams.append('end_date', params.endDate);

            const url = `${formatEndpoint('/batch/jobs')}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
            const response = await this.core.fetchWithTimeout(url, { method: 'GET' });

            if (!response.ok) {
                const errorText = await response.text(); // Get raw text for debugging
                console.error(`[${requestId}] Failed to fetch batch jobs (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch batch jobs: ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            // Ensure consistent casing and data transformation
            const items = (data.items || []).map((job: any) => ({
                ...job,
                id: job.id,
                status: job.status,
                system_code: job.system_code, // Keep snake_case from backend if that's what it sends
                systemCode: job.system_code,  // Add camelCase for frontend consistency
                timestamp: this.core.formatDate(job.timestamp),
                updated_at: job.updated_at ? this.core.formatDate(job.updated_at) : undefined,
                totalItems: job.total_items,
                processedItems: job.processed_items,
                keyColumnNames: job.key_column_names,
                results: job.results || [], // Ensure results is always an array
            }));
            return {
                items,
                totalCount: data.total_count,
                nextCursor: data.next_cursor,
            };
        } catch (error) {
            console.error(`[${requestId}] Error fetching batch jobs:`, error);
            throw error;
        }
    }
}