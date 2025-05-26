// src/langgraph/services/langGraphSocketService.ts
import {
  LangGraphExecutionEvent,
  ExecuteGraphRequestFE,
} from '../types/langgraph'; // Assuming your types are here
import { API_CONFIG } from '../../config/api'; // To construct WebSocket URL

const DEFAULT_RECONNECT_INTERVAL_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 30000; // 30 seconds for keep-alive ping

export type LangGraphSocketMessageHandler = (event: LangGraphExecutionEvent) => void;
export type LangGraphSocketErrorHandler = (error: Event) => void;
export type LangGraphSocketCloseHandler = (event: CloseEvent) => void;
export type LangGraphSocketOpenHandler = () => void;

interface LangGraphSocketServiceOptions {
  onOpen?: LangGraphSocketOpenHandler;
  onMessage: LangGraphSocketMessageHandler;
  onError?: LangGraphSocketErrorHandler;
  onClose?: LangGraphSocketCloseHandler;
  autoReconnect?: boolean;
  baseWsUrl?: string; // e.g., ws://localhost:8000 or wss://yourdomain.com
}

export class LangGraphSocketService {
  private ws: WebSocket | null = null;
  private graphId: string | null = null;
  private executionId: string | null = null; // Can be predefined or generated
  private readonly onOpenCallback?: LangGraphSocketOpenHandler;
  private readonly onMessageCallback: LangGraphSocketMessageHandler;
  private readonly onErrorCallback?: LangGraphSocketErrorHandler;
  private readonly onCloseCallback?: LangGraphSocketCloseHandler;

  private readonly autoReconnect: boolean;
  private explicitlyClosed: boolean = false; // Flag to indicate explicit closure
  private reconnectAttempts: number = 0;
  private reconnectIntervalId: NodeJS.Timeout | null = null;
  private pingIntervalId: NodeJS.Timeout | null = null;

  private baseWsUrl: string;

  constructor(options: LangGraphSocketServiceOptions) {
    this.onOpenCallback = options.onOpen;
    this.onMessageCallback = options.onMessage;
    this.onErrorCallback = options.onError;
    this.onCloseCallback = options.onClose;
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
    this.explicitlyClosed = false; // Initialize here  // Determine base WebSocket URL
    if (options.baseWsUrl) {
        this.baseWsUrl = options.baseWsUrl;
    } else {
        // Construct from API_CONFIG (assuming HTTP/HTTPS maps to WS/WSS)
        const httpBase = API_CONFIG.baseUrl.startsWith('http')
            ? API_CONFIG.baseUrl
            : `${window.location.protocol}//${window.location.host}${API_CONFIG.baseUrl}`; // Handle relative base URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.baseWsUrl = `${wsProtocol}//${window.location.host}`; // Use current host
    }
    console.log('[LangGraphSocketService] Base WebSocket URL set to:', this.baseWsUrl);
  }  private getWebSocketUrl(): string {
    if (!this.graphId) {
      // Consider throwing an error or handling this case more robustly
      console.error("[LangGraphSocketService] Graph ID is not set.");
      throw new Error("Graph ID is not set for WebSocket connection.");
    }
    
    // Path should be relative to the baseWsUrl (which includes the API prefix like /api/v1/lg-vis)
    // The backend WebSocket endpoint is typically mounted at something like /ws/langgraph/graphs/...
    // relative to its own router prefix.
    const wsPathPrefix = "/ws/langgraph/graphs"; // Changed from "/api/v1/lg-vis/ws/langgraph/graphs"
    
    console.log('[LangGraphSocketService] Creating WebSocket URL with baseWsUrl:', this.baseWsUrl);
    console.log('[LangGraphSocketService] Using wsPathPrefix:', wsPathPrefix);

    let fullUrl: string;
    // This 'else' branch is taken when WebSocketServiceAdapter generates a client-side executionId
    if (this.executionId && !this.executionId.includes('/')) { 
      // Assumes executionId is just an ID, not a path segment
      fullUrl = `${this.baseWsUrl}${wsPathPrefix}/${this.graphId}/execute/${this.executionId}`;
    } else if (this.executionId && this.executionId.includes('/')) {
      // This case would be if executionId itself is a pre-formed path segment from baseWsUrl
      // e.g., if backend returned "/ws/langgraph/graphs/graphId/execute/execId"
      // and baseWsUrl was just "ws://host:port"
      // For now, assuming the client-generated executionId path is the primary one for this service.
      // If executionId is a full path like /api/v1/lg-vis/ws/..., then baseWsUrl should be ws://host:port
      // and this logic would need adjustment or clarification on what executionId contains.
      // Based on current setup with WebSocketServiceAdapter, this branch is less likely.
      fullUrl = `${this.baseWsUrl}${this.executionId.startsWith('/') ? '' : '/'}${this.executionId}`;
    } else {
      // Fallback or error if executionId is expected but missing or in an unexpected format
      // This path was originally for when executionId was not known.
      // Given WebSocketServiceAdapter always generates one, this might indicate an issue.
      console.warn('[LangGraphSocketService] executionId is null or in an unexpected format, constructing URL without it or with a placeholder.');
      // Defaulting to the structure used when executionId is a simple ID.
      // Consider if a different structure or error is more appropriate here.
      fullUrl = `${this.baseWsUrl}${wsPathPrefix}/${this.graphId}/execute${this.executionId ? `/${this.executionId}` : ''}`;
    }
    
    console.log('[LangGraphSocketService] Constructed WebSocket URL:', fullUrl);
    return fullUrl;
  }

  public connect(graphId: string, executionId?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[LangGraphSocketService] WebSocket is already open.');
      return;
    }
    this.graphId = graphId;
    this.executionId = executionId || null; // If undefined, it means server will generate one
    this.explicitlyClosed = false; // Reset flag on new connection attempt

    const wsUrl = this.getWebSocketUrl();
    console.log(`[LangGraphSocketService] Attempting to connect to: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`[LangGraphSocketService] WebSocket connected for graph '${this.graphId}', execution '${this.executionId || 'NEW'}'.`);
      this.reconnectAttempts = 0; // Reset on successful connection
      if (this.reconnectIntervalId) {
        clearInterval(this.reconnectIntervalId);
        this.reconnectIntervalId = null;
      }
      this.startPing();
      this.onOpenCallback?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as LangGraphExecutionEvent;
        // console.debug('[LangGraphSocketService] Message received:', data);
        this.onMessageCallback(data);
      } catch (error) {
        console.error('[LangGraphSocketService] Error parsing message or in onMessage callback:', error, event.data);
        // Optionally, notify via error callback or a specific message type
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('[LangGraphSocketService] WebSocket error:', event);
      this.onErrorCallback?.(event);
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[LangGraphSocketService] WebSocket closed for graph '${this.graphId}', execution '${this.executionId || 'PREVIOUS'}'. Code: ${event.code}, Reason: ${event.reason}`);
      this.stopPing();
      this.onCloseCallback?.(event);

      // MODIFIED: Check explicitlyClosed flag
      if (!this.explicitlyClosed && this.autoReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !event.wasClean) {
        this.reconnectAttempts++;
        const delay = DEFAULT_RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts -1); // Exponential backoff
        console.log(`[LangGraphSocketService] Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        this.reconnectIntervalId = setTimeout(() => {
          if (this.graphId && !this.explicitlyClosed) { // Check again before reconnecting
            this.connect(this.graphId, this.executionId || undefined); // Pass current executionId or let server generate
          }
        }, delay);
      } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[LangGraphSocketService] Max reconnect attempts reached.');
      }
    };
  }

  public send(initialMessage: ExecuteGraphRequestFE): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const messageString = JSON.stringify(initialMessage);
        console.log('[LangGraphSocketService] Sending initial message:', messageString);
        this.ws.send(messageString);
      } catch (error) {
        console.error('[LangGraphSocketService] Error sending initial message:', error);
      }
    } else {
      console.warn('[LangGraphSocketService] WebSocket is not open. Cannot send message.');
      // Optionally queue the message or throw an error
    }
  }

  private startPing(): void {
    this.stopPing(); // Clear any existing ping interval
    this.pingIntervalId = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // console.debug('[LangGraphSocketService] Sending ping');
        this.ws.send(JSON.stringify({ eventType: 'ping', timestamp: new Date().toISOString() }));
      } else {
        // console.debug('[LangGraphSocketService] WebSocket not open, stopping ping.');
        this.stopPing(); // Stop pinging if connection is closed for any reason
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
      // console.debug('[LangGraphSocketService] Ping interval stopped.');
    }
  }

  public close(code?: number, reason?: string): void {
    this.explicitlyClosed = true; // MODIFIED: Set the flag here
    this.stopPing();
    if (this.reconnectIntervalId) {
        clearInterval(this.reconnectIntervalId);
        this.reconnectIntervalId = null;
    }
    if (this.ws) {
      console.log(`[LangGraphSocketService] Closing WebSocket explicitly. Code: ${code}, Reason: ${reason}`);
      this.ws.close(code, reason);
      this.ws = null;
    }
    this.graphId = null;
    this.executionId = null;
  }

  public getReadyState(): number | undefined {
    return this.ws?.readyState;
  }
}