// src/langgraph/services/langGraphSSEService.ts
import { LangGraphExecutionEvent, ExecuteGraphRequestFE } from '../types/langgraph';

export type LangGraphSSEMessageHandler = (event: LangGraphExecutionEvent) => void;
export type LangGraphSSEErrorHandler = (error: Error) => void;
export type LangGraphSSEOpenHandler = () => void;
export type LangGraphSSECloseHandler = () => void;

interface LangGraphSSEServiceOptions {
  onOpen?: LangGraphSSEOpenHandler;
  onMessage: LangGraphSSEMessageHandler;
  onError?: LangGraphSSEErrorHandler;
  onClose?: LangGraphSSECloseHandler;
  baseUrl?: string;
}

export class LangGraphSSEService {
  private eventSource: EventSource | null = null;
  private readonly onOpenCallback?: LangGraphSSEOpenHandler;
  private readonly onMessageCallback: LangGraphSSEMessageHandler;
  private readonly onErrorCallback?: LangGraphSSEErrorHandler;
  private readonly onCloseCallback?: LangGraphSSECloseHandler;
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(options: LangGraphSSEServiceOptions) {
    this.onOpenCallback = options.onOpen;
    this.onMessageCallback = options.onMessage;
    this.onErrorCallback = options.onError;
    this.onCloseCallback = options.onClose;
    this.baseUrl = options.baseUrl || '/api/v1/lg-vis';
  }

  public async connect(graphId: string, executionRequest: ExecuteGraphRequestFE): Promise<string> {
    this.close(); // Close any existing connection

    try {
      // First, make a POST request to initiate execution
      const response = await fetch(`${this.baseUrl}/graphs/${graphId}/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputArgs: executionRequest.inputArgs,
          simulation_delay_ms: executionRequest.simulation_delay_ms,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start execution: ${response.status}`);
      }

      // Get execution ID from response header
      const executionId = response.headers.get('X-Execution-ID') || 'unknown';

      // Create EventSource from the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      // Process the SSE stream
      this.processSSEStream(reader, decoder, executionId);

      return executionId;
    } catch (error) {
      console.error('[LangGraphSSEService] Connection error:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  private async processSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    executionId: string
  ): Promise<void> {
    let buffer = '';

    try {
      this.onOpenCallback?.();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[LangGraphSSEService] Stream completed');
          this.onCloseCallback?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[LangGraphSSEService] Received event:', data);
              this.onMessageCallback(data as LangGraphExecutionEvent);
            } catch (e) {
              console.error('[LangGraphSSEService] Error parsing SSE data:', e, line);
            }
          } else if (line.startsWith('event: ')) {
            // Event type is in the event field, we can use it for routing if needed
            console.log('[LangGraphSSEService] Event type:', line.slice(7));
          }
        }
      }
    } catch (error) {
      console.error('[LangGraphSSEService] Stream processing error:', error);
      this.onErrorCallback?.(error as Error);
    } finally {
      reader.releaseLock();
    }
  }

  public close(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}