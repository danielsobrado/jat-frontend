// src/langgraph/services/streamServiceFactory.ts
import { LangGraphExecutionEvent, ExecuteGraphRequestFE } from '../types/langgraph';
import { LangGraphSocketService } from './langGraphSocketService';
import { LangGraphSSEService } from './langGraphSSEService';
import { LangGraphStreamService } from './langGraphStreamService';

// Define the transport types
export type StreamTransportType = 'websocket' | 'sse' | 'http-stream';

// Common interface for all stream services
export interface ILangGraphStreamService {
  connect(graphId: string, executionRequest: ExecuteGraphRequestFE): Promise<string>;
  close(): void;
  send?(message: any): void; // Optional - only for WebSocket
}

// Event handlers interface
export interface StreamServiceHandlers {
  onOpen?: () => void;
  onMessage: (event: LangGraphExecutionEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

// Adapter for WebSocket to match the common interface
class WebSocketServiceAdapter implements ILangGraphStreamService {
  private service: LangGraphSocketService;
  private executionRequest?: ExecuteGraphRequestFE;

  constructor(handlers: StreamServiceHandlers, baseUrl?: string) {
    this.service = new LangGraphSocketService({
      onOpen: () => {
        handlers.onOpen?.();
        // Send initial message after connection opens
        if (this.executionRequest) {
          this.service.send(this.executionRequest);
        }
      },
      onMessage: handlers.onMessage,
      onError: handlers.onError 
        ? (event: Event) => {
            // Convert Event to Error with details
            const errorMessage = event instanceof ErrorEvent 
              ? `WebSocket error: ${event.message}` 
              : `WebSocket error: ${event.type}`;
            const error = new Error(errorMessage);
            handlers.onError?.(error);
          }
        : undefined,
      onClose: handlers.onClose,
      baseWsUrl: baseUrl,
    });
  }

  async connect(graphId: string, executionRequest: ExecuteGraphRequestFE): Promise<string> {
    this.executionRequest = executionRequest;
    // Generate execution ID for WebSocket (since it doesn't return one)
    const executionId = `ws_exec_${Math.random().toString(36).substr(2, 9)}`;
    this.service.connect(graphId, executionId);
    return executionId;
  }

  close(): void {
    this.service.close();
  }

  send(message: any): void {
    this.service.send(message);
  }
}

// Configuration for the factory
export interface StreamServiceConfig {
  transport: StreamTransportType;
  baseUrl?: string;
  handlers: StreamServiceHandlers;
}

// Factory class
export class StreamServiceFactory {
  private static instance: StreamServiceFactory;
  private defaultTransport: StreamTransportType = 'http-stream';

  private constructor() {}

  static getInstance(): StreamServiceFactory {
    if (!StreamServiceFactory.instance) {
      StreamServiceFactory.instance = new StreamServiceFactory();
    }
    return StreamServiceFactory.instance;
  }

  // Set default transport type (can be from environment or config)
  setDefaultTransport(transport: StreamTransportType): void {
    this.defaultTransport = transport;
    console.log(`[StreamServiceFactory] Default transport set to: ${transport}`);
  }

  // Create a stream service based on configuration
  createService(config: StreamServiceConfig): ILangGraphStreamService {
    const transport = config.transport || this.defaultTransport;
    console.log(`[StreamServiceFactory] Creating ${transport} service`);

    switch (transport) {
      case 'websocket':
        return new WebSocketServiceAdapter(config.handlers, config.baseUrl);

      case 'sse':
        // SSE service already matches the interface
        return new LangGraphSSEService({
          ...config.handlers,
          baseUrl: config.baseUrl,
        });

      case 'http-stream':
        // HTTP Stream service already matches the interface
        return new LangGraphStreamService({
          ...config.handlers,
          baseUrl: config.baseUrl,
        });

      default:
        throw new Error(`Unknown transport type: ${transport}`);
    }
  }

  // Get transport type from environment or config
  static getTransportFromConfig(): StreamTransportType {
    // Check environment variable
    const envTransport = process.env.REACT_APP_LANGGRAPH_TRANSPORT;
    if (envTransport && ['websocket', 'sse', 'http-stream'].includes(envTransport)) {
      return envTransport as StreamTransportType;
    }

    // Check local storage for user preference
    const storageTransport = localStorage.getItem('langgraph_transport');
    if (storageTransport && ['websocket', 'sse', 'http-stream'].includes(storageTransport)) {
      return storageTransport as StreamTransportType;
    }

    // Default to http-stream
    return 'http-stream';
  }
}