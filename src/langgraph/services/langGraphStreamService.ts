// src/langgraph/services/langGraphStreamService.ts
import { LangGraphExecutionEvent, ExecuteGraphRequestFE } from '../types/langgraph';

export type LangGraphStreamMessageHandler = (event: LangGraphExecutionEvent) => void;
export type LangGraphStreamErrorHandler = (error: Error) => void;
export type LangGraphStreamOpenHandler = () => void;
export type LangGraphStreamCloseHandler = () => void;

interface LangGraphStreamServiceOptions {
  onOpen?: LangGraphStreamOpenHandler;
  onMessage: LangGraphStreamMessageHandler;
  onError?: LangGraphStreamErrorHandler;
  onClose?: LangGraphStreamCloseHandler;
  baseUrl?: string;
}

export class LangGraphStreamService {
  private abortController: AbortController | null = null;
  private readonly onOpenCallback?: LangGraphStreamOpenHandler;
  private readonly onMessageCallback: LangGraphStreamMessageHandler;
  private readonly onErrorCallback?: LangGraphStreamErrorHandler;
  private readonly onCloseCallback?: LangGraphStreamCloseHandler;
  private baseUrl: string;

  constructor(options: LangGraphStreamServiceOptions) {
    this.onOpenCallback = options.onOpen;
    this.onMessageCallback = options.onMessage;
    this.onErrorCallback = options.onError;
    this.onCloseCallback = options.onClose;
    this.baseUrl = options.baseUrl || '/api/v1/lg-vis';
  }

  public async connect(graphId: string, executionRequest: ExecuteGraphRequestFE): Promise<string> {
    this.close(); // Close any existing connection

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.baseUrl}/graphs/${graphId}/execute/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson',
        },
        body: JSON.stringify({
          input_args: executionRequest.inputArgs,
          simulation_delay_ms: executionRequest.simulation_delay_ms,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start execution: ${response.status} - ${errorText}`);
      }

      // Get execution ID from response header
      const executionId = response.headers.get('X-Execution-ID') || 'unknown';
      
      // Process the stream
      this.processStream(response, executionId);

      return executionId;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[LangGraphStreamService] Stream aborted');
      } else {
        console.error('[LangGraphStreamService] Connection error:', error);
        this.onErrorCallback?.(error as Error);
      }
      throw error;
    }
  }

  private async processStream(response: Response, executionId: string): Promise<void> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body available');
    }

    let buffer = '';

    try {
      this.onOpenCallback?.();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[LangGraphStreamService] Stream completed');
          // Process any remaining data in buffer
          if (buffer.trim()) {
            this.processLine(buffer);
          }
          this.onCloseCallback?.();
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.processLine(line);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[LangGraphStreamService] Stream processing aborted');
      } else {
        console.error('[LangGraphStreamService] Stream processing error:', error);
        this.onErrorCallback?.(error as Error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private processLine(line: string): void {
    try {
      const event = JSON.parse(line) as LangGraphExecutionEvent;
      console.log('[LangGraphStreamService] Received event:', event.eventType, event);
      this.onMessageCallback(event);
    } catch (error) {
      console.error('[LangGraphStreamService] Error parsing line:', error, 'Line:', line);
    }
  }

  public close(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}