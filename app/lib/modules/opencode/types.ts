export interface OpenCodeConfig {
  baseUrl: string;
  model?: string;
  providerId?: string;
  systemPrompt?: string;
  apiKey?: string;
}

export interface OpenCodeMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: Part[];
  metadata?: Record<string, any>;
}

export interface Part {
  type: 'text' | 'file' | 'thinking' | 'tool_call' | 'tool_result';
  id?: string;
  text?: string;
  file?: {
    id: string;
    name: string;
    path?: string;
    url?: string;
  };
  thinking?: string;
  toolCall?: {
    id: string;
    name: string;
    args?: Record<string, unknown>;
  };
  toolResult?: {
    id: string;
    toolName: string;
    result: unknown;
    isError?: boolean;
  };
}

export interface OpenCodeSession {
  id: string;
  agentId?: string;
  model?: string;
  providerId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'idle' | 'running' | 'paused' | 'finished' | 'aborted';
  metadata?: Record<string, any>;
}

export interface OpenCodeStreamEvent {
  type: string;
  data: unknown;
  id?: string;
}

export interface OpenCodeResponse {
  sessionId: string;
  messages: OpenCodeMessage[];
  parts: Part[];
  stream?: AsyncIterable<OpenCodeStreamEvent>;
  usage?: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  };
}
