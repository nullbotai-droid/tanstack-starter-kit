import type { OpenCodeConfig, OpenCodeResponse, OpenCodeSession, OpenCodeMessage, Part } from './opencode/types';
import { LLMManager } from './llm/manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('OpenCodeManager');

export class OpenCodeManager {
  private static _instance: OpenCodeManager;
  private _config: OpenCodeConfig | null = null;
  private _llmManager: LLMManager | null = null;
  private _currentSession: OpenCodeSession | null = null;

  private constructor() {}

  static getInstance(): OpenCodeManager {
    if (!OpenCodeManager._instance) {
      OpenCodeManager._instance = new OpenCodeManager();
    }
    return OpenCodeManager._instance;
  }

  configure(config: OpenCodeConfig): void {
    this._config = config;
    this._currentSession = null;
    logger.info('OpenCode configured:', {
      baseUrl: config.baseUrl,
      model: config.model,
      providerId: config.providerId,
    });
  }

  isConfigured(): boolean {
    return !!this._config;
  }

  getConfig(): OpenCodeConfig | null {
    return this._config;
  }

  async initializeLLMManager(env: Record<string, string> = {}): Promise<LLMManager> {
    if (!this._llmManager) {
      this._llmManager = LLMManager.getInstance(env);
      logger.info('LLM Manager initialized');
    }
    return this._llmManager;
  }

  getLLMManager(): LLMManager | null {
    return this._llmManager || null;
  }

  async createAgentSession(
    options: {
      model?: string;
      providerId?: string;
      systemPrompt?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<{ sessionId: string }> {
    if (!this._config) {
      throw new Error('OpenCode is not configured');
    }

    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    const config: Partial<ConstructorParameters<typeof OpenCodeService.configure>>[0] = {
      baseUrl: this._config.baseUrl,
      model: options.model || this._config.model,
      providerId: options.providerId || this._config.providerId,
      systemPrompt: options.systemPrompt || this._config.systemPrompt,
    };

    opencodeService.configure(config);

    const result = await opencodeService.createSession({
      model: options.model,
      providerId: options.providerId,
      systemPrompt: options.systemPrompt,
      metadata: options.metadata,
    });

    this._currentSession = {
      id: result.id,
      agentId: result.id,
      model: options.model || this._config.model,
      providerId: options.providerId || this._config.providerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'idle',
      metadata: options.metadata,
    };

    logger.info('OpenCode agent session created:', {
      sessionId: result.id,
      model: this._currentSession.model,
      providerId: this._currentSession.providerId,
    });

    return { sessionId: result.id };
  }

  getCurrentSession(): OpenCodeSession | null {
    return this._currentSession;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      stream?: boolean;
      outputFormat?: 'text' | 'json' | 'markdown';
      maxTurns?: number;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<OpenCodeResponse> {
    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    const streamResponse = await opencodeService.sendPrompt(sessionId, message, options);

    const response: OpenCodeResponse = {
      sessionId,
      messages: [],
      parts: [],
    };

    if (options.stream) {
      response.stream = streamResponse as unknown as AsyncIterable<unknown>;
    } else {
      const messages = await opencodeService.getSessionMessages(sessionId);
      response.messages = messages as unknown as OpenCodeMessage[];
    }

    this._updateSessionStatus('running');

    return response;
  }

  private _updateSessionStatus(status: OpenCodeSession['status']): void {
    if (this._currentSession) {
      this._currentSession.status = status;
      this._currentSession.updatedAt = new Date().toISOString();
    }
  }

  async abortSession(sessionId: string): Promise<void> {
    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    await opencodeService.abortSession(sessionId);

    if (this._currentSession && this._currentSession.id === sessionId) {
      this._updateSessionStatus('aborted');
    }

    logger.info('OpenCode session aborted:', { sessionId });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    await opencodeService.deleteSession(sessionId);

    if (this._currentSession && this._currentSession.id === sessionId) {
      this._currentSession = null;
    }

    logger.info('OpenCode session deleted:', { sessionId });
  }

  async getSessionMessages(sessionId: string): Promise<OpenCodeMessage[]> {
    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    return await opencodeService.getSessionMessages(sessionId);
  }

  async summarizeSession(sessionId: string, prompt?: string): Promise<void> {
    const { OpenCodeService } = await import('./services/opencodeService');
    const opencodeService = OpenCodeService.getInstance();

    await opencodeService.summarizeSession(sessionId, prompt);
    logger.info('OpenCode session summarized:', { sessionId });
  }

  getBaseUrl(): string {
    return this._config?.baseUrl || 'http://localhost:4096';
  }
}
