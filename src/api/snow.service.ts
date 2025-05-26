// src/api/snow.service.ts
import { API_ENDPOINTS } from '../config/api'; // Ensure API_ENDPOINTS is imported
import { ApiClientCore } from './core-client';
import {
  SnowAnalyzeRequestFE,
  SnowAnalyzeResponseFE,
  SnowHistoryRequestParamsFE,
  SnowHistoryPageFE,
} from '../snow/types/snow.types';

export class SnowService {
  constructor(private core: ApiClientCore) {}

  async analyzeTicket(ticketData: SnowAnalyzeRequestFE): Promise<SnowAnalyzeResponseFE> {
    const requestId = `snow-analyze-${Math.random().toString(36).substring(7)}`;
    console.log(`[${requestId}] SNOW: Analyzing ticket`);
    try {
      // Pass the base endpoint path from API_ENDPOINTS directly
      const response = await this.core.post<SnowAnalyzeResponseFE>(
        API_ENDPOINTS.snow.analyze, 
        ticketData
      );
      return response;
    } catch (error) {
      console.error(`[${requestId}] SNOW: Analyze ticket error:`, error);
      throw error;
    }
  }

  async getHistory(params: SnowHistoryRequestParamsFE): Promise<SnowHistoryPageFE> {
    const requestId = `snow-history-list-${Math.random().toString(36).substring(7)}`;
    console.log(`[${requestId}] SNOW: Fetching analysis history with params:`, params);
    
    try {
      // Pass the base endpoint path and params object directly to core.get
      // ApiClientCore's get method will handle calling formatEndpoint and appending query params.
      const response = await this.core.get<SnowHistoryPageFE>(API_ENDPOINTS.snow.history, params);
      
      const itemsWithFormattedDates = response.items.map(item => ({
        ...item,
        created_at: this.core.formatDate(item.created_at), // formatDate is a utility in ApiClientCore
      }));

      return { ...response, items: itemsWithFormattedDates };
    } catch (error) {
      console.error(`[${requestId}] SNOW: Get history error:`, error);
      throw error;
    }
  }

  async deleteHistory(id: string): Promise<void> {
    const requestId = `snow-history-delete-${Math.random().toString(36).substring(7)}`;
    console.log(`[${requestId}] SNOW: Deleting history item with ID: ${id}`);
    try {
      // Construct the path with the ID using API_ENDPOINTS
      const path = API_ENDPOINTS.snow.historyItem.replace('{id}', id);
      // Pass the constructed base path directly to core.delete
      await this.core.delete(path);
    } catch (error) {
      console.error(`[${requestId}] SNOW: Delete history error:`, error);
      throw error;
    }
  }
}