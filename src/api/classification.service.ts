import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { 
  ClassificationResult, 
  ManualClassificationRequest, 
  ClassificationHistoryRequest,
  ClassificationHistoryPage,
  ClassificationHistory
} from './types';

export class ClassificationService {
  constructor(private core: ApiClientCore) {}

  async classify(description: string, systemCode: string = 'UNSPSC', additionalContext?: string): Promise<ClassificationResult> {
    const requestId = Math.random().toString(36).substring(7);
    try {
      const response = await this.core.fetchWithTimeout(formatEndpoint('/classify/auto'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          system_code: systemCode,
          additional_context: additionalContext,
          save_failed: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.error || response.statusText || 'Classification failed';
        const fullError = result.details ? `${errorMessage}: ${result.details}` : errorMessage;
        throw new Error(fullError);
      }
      let status: 'success' | 'partial' | 'failed' = 'success';
      if (result.error) {
        status = Object.keys(result.levels || {}).length > 0 ? 'partial' : 'failed';
      }
      return {
        ...result,
        description,
        status: result.status || status,
        timestamp: this.core.formatDate(result.timestamp)
      };
    } catch (error) {
      console.error(`[${requestId}] Classification error:`, error);
      throw error;
    }
  }

  async classifyManually(request: ManualClassificationRequest): Promise<ClassificationResult> {
     const requestId = Math.random().toString(36).substring(7);
     try {
        const response = await this.core.fetchWithTimeout(formatEndpoint('/classify/manual'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: request.description,
                systemCode: request.systemCode, // Ensure backend expects camelCase or adjust here
                levels: request.levels,
            }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'Manual classification failed');
        }
        const result = await response.json();
        return {
            ...result,
            description: request.description,
            status: result.status || 'success',
            timestamp: this.core.formatDate(result.timestamp)
        };
     } catch (error) {
        console.error(`[${requestId}] Manual classification error:`, error);
        throw error;
     }
  }

  async rerunClassification(id: string): Promise<ClassificationResult> {
    const requestId = Math.random().toString(36).substring(7);
    try {
        const response = await this.core.fetchWithTimeout(formatEndpoint(`/history/${id}/rerun`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`Rerun classification failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`[${requestId}] Error rerunning classification:`, error);
        throw error;
    }
  }

  async deleteClassification(id: string): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    try {
        const response = await this.core.fetchWithTimeout(formatEndpoint(`/history/${id}`), {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Delete classification failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`[${requestId}] Error deleting classification:`, error);
        throw error;
    }
  }

  async getClassificationHistory(req: ClassificationHistoryRequest): Promise<ClassificationHistoryPage> {
    const params = new URLSearchParams();
    params.append('limit', (req.limit ?? 10).toString());
    if (req.cursor) params.append('cursor', req.cursor);
    if (req.status) params.append('status', req.status);
    if (req.startDate) params.append('start_date', req.startDate);
    if (req.endDate) params.append('end_date', req.endDate);
    if (req.search) params.append('search', req.search);
    if (req.sourceType) params.append('source_type', req.sourceType);
    if (req.createdBy) params.append('created_by', req.createdBy);

    const endpointPath = req.systemCode ? `/systems/${req.systemCode}/history` : '/history';
    const url = `${formatEndpoint(endpointPath)}?${params.toString()}`;
    const requestId = Math.random().toString(36).substring(7);

    try {
      const response = await this.core.fetchWithTimeout(url);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'Failed to get classification history');
      }
      const data = await response.json();

      // Map backend snake_case to frontend camelCase
      const items: ClassificationHistory[] = (data.items || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        systemCode: item.system_code ?? item.systemCode,
        additionalContext: item.additional_context ?? item.additionalContext,
        levels: item.levels,
        createdAt: this.core.formatDate(item.created_at ?? item.createdAt),
        status: item.status,
        createdBy: item.created_by ?? item.createdBy,
        sourceType: item.source_type ?? item.sourceType,
        ragContextUsed: item.rag_context_used ?? item.ragContextUsed,
        ragContext: item.rag_context ?? item.ragContext,
        levelResponses: item.level_responses ?? item.levelResponses,
        error: item.error,
        prompt: item.prompt,
      }));

      return {
        items: items,
        totalCount: data.total_count,
        nextCursor: data.next_cursor,
      };
    } catch (error) {
        console.error(`[${requestId}] Get classification history error:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to load history: ${error.message}`);
        } else {
            throw new Error('Failed to load history due to an unknown error.');
        }
    }
  }

  async deleteClassificationHistory(id: string): Promise<void> {
    const response = await this.core.fetchWithTimeout(formatEndpoint(`/history/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete classification history: ${errorText}`);
    }
  }
}