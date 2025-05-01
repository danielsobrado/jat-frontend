import { formatEndpoint } from '../config/api';
import { ApiClientCore } from './core-client';
import { LlmConfig, UpdateConfigRequest } from './types'; // Import UpdateConfigRequest

export class ConfigService {
    constructor(private core: ApiClientCore) {}

    async getConfig(): Promise<LlmConfig & { ragEnabled?: boolean }> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            const response = await this.core.fetchWithTimeout(formatEndpoint('/settings/config'));
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || 'Failed to get configuration');
            }
            const data = await response.json();

            // Simplified transformation logic (adjust if complex cases needed)
            const transformObject = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(transformObject);
                const result: any = {};
                Object.entries(obj).forEach(([key, value]) => {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = typeof value === 'object' ? transformObject(value) : value;
                });
                return result;
            };

            const config: LlmConfig = {
                server: transformObject(data.server),
                service: transformObject(data.service),
                database: transformObject(data.database),
                validation: transformObject(data.validation),
                alert: transformObject(data.alert),
                llmEndpoint: data.service?.llm_endpoint || '',
                llmApiKey: data.service?.llm_api_key || '',
                ragEnabled: !!(data.database?.rag_enabled ?? data.ragEnabled ?? false), // Simplified check
            };
            console.log(`[${requestId}] Transformed config (API Key Redacted):`, { ...config, llmApiKey: '[REDACTED]', service: { ...config.service, llmApiKey: '[REDACTED]' } });
            return config;
        } catch (error) {
            console.error(`[${requestId}] Get config error:`, error);
            return { llmEndpoint: '', llmApiKey: '', ragEnabled: false }; // Default on error
        }
    }

    async updateConfig(configUpdate: UpdateConfigRequest): Promise<void> {
        const requestId = Math.random().toString(36).substring(7);
        const url = formatEndpoint('/settings/config'); // Ensure endpoint is correct (usually same as GET)
        try {
            // Log the update payload *without* sensitive fields if possible
             const safePayload = JSON.parse(JSON.stringify(configUpdate)); // Deep copy
             if (safePayload.service?.llmApiKey) safePayload.service.llmApiKey = '[REDACTED]';
             if (safePayload.alert?.emailSettings?.smtpPassword) safePayload.alert.emailSettings.smtpPassword = '[REDACTED]';
             console.log(`[${requestId}] Sending config update request to ${url}`, safePayload);

            const response = await this.core.fetchWithTimeout(url, {
                method: 'PUT', // Use PUT for updating the entire config resource (or PATCH for partial)
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configUpdate), // Send the update payload
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                console.error(`[${requestId}] Update config error response:`, error);
                throw new Error(error.error || 'Failed to update configuration');
            }
            console.log(`[${requestId}] Configuration updated successfully.`);
        } catch (error) {
            console.error(`[${requestId}] Update config error:`, error);
            throw error; // Re-throw error
        }
    }
}