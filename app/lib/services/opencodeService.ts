import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('opencode-service');

export class OpenCodeService {
  private static _instance: OpenCodeService;
  private _client: OpencodeClient | null = null;
  private _config: {
    baseUrl: string;
    model?: string;
    providerId?: string;
    systemPrompt?: string;
    apiKey?: string;
  } = {
    baseUrl: process.env.OPENCODE_SERVER_URL || 'http://localhost:4096',
  };

  static getInstance(): OpenCodeService {
    if (!OpenCodeService._instance) {
      OpenCodeService._instance = new OpenCodeService();
    }
    return OpenCodeService._instance;
  }

  configure(config: Partial<OpenCodeService['_config']>): void {
    this._config = { ...this._config, ...config };
    this._client = null;
  }

  async getClient(): Promise<OpencodeClient> {
    if (!this._client) {
      this._client = createOpencodeClient({
        baseUrl: this._config.baseUrl,
        ...this._config,
      });
    }
    return this._client;
  }

  async createSession(
    options: {
      model?: string;
      providerId?: string;
      systemPrompt?: string;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<{ id: string }> {
    try {
      const client = await this.getClient();
      const result = await client.session.create({
        body: {
          model: options.model || this._config.model,
          providerId: options.providerId || this._config.providerId,
          systemPrompt: options.systemPrompt || this._config.systemPrompt,
          metadata: options.metadata,
        },
      });
      return { id: result.data.id };
    } catch (error) {
      logger.error('Failed to create OpenCode session:', error);
      throw error;
    }
  }

  async sendMessage(
    sessionId: string,
    message: string,
    options: {
      stream?: boolean;
    } = {},
  ): Promise<unknown> {
    try {
      const client = await this.getClient();

      if (options.stream) {
        const stream = await client.session.prompt({
          path: sessionId,
          body: {
            messages: [{ role: 'user' as const, content: message }],
          },
        });
        return stream;
      } else {
        const result = await client.session.prompt({
          path: sessionId,
          body: {
            messages: [{ role: 'user' as const, content: message }],
          },
        });
        return result.data;
      }
    } catch (error) {
      logger.error('Failed to send message to OpenCode:', error);
      throw error;
    }
  }

  async getSessionMessages(sessionId: string): Promise<unknown[]> {
    try {
      const client = await this.getClient();
      const result = await client.session.messages({
        path: sessionId,
      });
      return result.data;
    } catch (error) {
      logger.error('Failed to get session messages:', error);
      throw error;
    }
  }

  async abortSession(sessionId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.session.delete({
        path: sessionId,
      });
    } catch (error) {
      logger.error('Failed to abort session:', error);
      throw error;
    }
  }

  async summarizeSession(sessionId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.session.summarize({
        path: sessionId,
      });
    } catch (error) {
      logger.error('Failed to summarize session:', error);
      throw error;
    }
  }

  getBaseUrl(): string {
    return this._config.baseUrl;
  }
}
