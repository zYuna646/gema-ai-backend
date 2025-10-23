import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from '../message/message.service';

interface ClientSession {
  clientId: string;
  userId?: string;
  isActive: boolean;
  bufferCount: number;
  createdAt: Date;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/openai',
})
export class OpenAIRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(OpenAIRealtimeGateway.name);
  private readonly sessions = new Map<string, ClientSession>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
  ) {
    // Listen untuk response dari OpenAI Microservice
    this.eventEmitter.on(
      'openai_response',
      this.handleOpenAIResponse.bind(this),
    );
    this.eventEmitter.on('openai_error', this.handleOpenAIError.bind(this));
    this.eventEmitter.on('openai_ready', this.handleOpenAIReady.bind(this));
    this.eventEmitter.on('openai_end', this.handleOpenAIEnd.bind(this));
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or headers
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      let userId: string | undefined;
      let user: any;

      // Try to authenticate user if token is provided
      if (token) {
        try {
          const decoded = this.jwtService.verify(token);
          userId = decoded.sub;
          if (userId) {
            user = await this.usersService.findOne(userId);
          }
        } catch (error) {
          this.logger.warn(
            `Invalid token for client ${client.id}: ${error.message}`,
          );
        }
      }

      // Get latest settings
      const settings = await this.settingsService.getLatest();

      // Determine voice from user's sound_type or fallback to query/default
      let voice = 'alloy'; // default
      if (user?.sound_type) {
        voice = user.sound_type;
      } else if (client.handshake.query.voice) {
        voice = client.handshake.query.voice as string;
      }

      // Use model from settings or fallback to query/default
      const model =
        settings?.model ||
        (client.handshake.query.model as string) ||
        'gpt-4o-realtime-preview';

      // Use max_tokens from settings
      const maxTokens = settings?.max_tokens || 2000;

      const inputAudioFormat =
        (client.handshake.query.format as string) || 'pcm16';
      const inputAudioSampleRate = client.handshake.query.sr
        ? parseInt(client.handshake.query.sr as string, 10)
        : 16000;

      this.logger.log(
        `Client connected: ${client.id}${userId ? ` (User: ${userId})` : ''}`,
      );

      // Buat session untuk client
      const session: ClientSession = {
        clientId: client.id,
        userId,
        isActive: true,
        bufferCount: 0,
        createdAt: new Date(),
      };

      this.sessions.set(client.id, session);

      // Emit event ke OpenAI Microservice untuk inisialisasi koneksi
      this.eventEmitter.emit('init_openai_connection', {
        clientId: client.id,
        userId,
        voice,
        model,
        maxTokens,
        inputAudioFormat,
        inputAudioSampleRate,
      });

      this.logger.log(
        `Session created for client ${client.id} with voice: ${voice}, model: ${model}, maxTokens: ${maxTokens}${userId ? `, user: ${userId}` : ''}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling connection for client ${client.id}: ${error.message}`,
      );
      client.emit('error', {
        message: 'Connection failed',
        error: error.message,
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const session = this.sessions.get(client.id);
    if (session) {
      session.isActive = false;

      // Emit event ke OpenAI Microservice untuk cleanup
      this.eventEmitter.emit('cleanup_openai_connection', {
        clientId: client.id,
      });

      this.sessions.delete(client.id);
    }
  }

  /**
   * Handle audio chunk dari frontend
   */
  @SubscribeMessage('audio_chunk')
  onAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ArrayBuffer | Buffer | string,
  ) {
    const session = this.sessions.get(client.id);
    if (!session || !session.isActive) {
      this.logger.warn(
        `Audio chunk received for inactive session: ${client.id}`,
      );
      return;
    }

    let base64: string;
    if (typeof payload === 'string') {
      base64 = payload.startsWith('data:') ? payload.split(',')[1] : payload;
    } else if (payload instanceof Buffer) {
      base64 = payload.toString('base64');
    } else {
      base64 = Buffer.from(payload as ArrayBuffer).toString('base64');
    }

    // Log audio chunk received
    this.logger.debug(
      `Audio chunk received from client ${client.id}, size: ${base64.length}`,
    );

    // Emit ke OpenAI Microservice
    this.eventEmitter.emit('process_audio_chunk', {
      clientId: client.id,
      audioData: base64,
    });

    session.bufferCount++;
  }

  /**
   * Handle stop/commit audio dari frontend
   */
  @SubscribeMessage('stop')
  async onStop(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session || !session.isActive) {
      this.logger.warn(`Stop received for inactive session: ${client.id}`);
      return;
    }

    this.logger.log(`Audio commit requested by client ${client.id}`);

    // Create message record for user audio input
    if (session.userId && session.bufferCount > 0) {
      try {
        await this.messageService.create({
          user_id: session.userId,
          content: '[Audio Input]',
          is_ai: false,
        });
        this.logger.log(`User audio message recorded for user ${session.userId}`);
      } catch (error) {
        this.logger.error(`Failed to create user audio message: ${error.message}`);
      }
    }

    // Emit ke OpenAI Microservice untuk commit audio
    this.eventEmitter.emit('commit_audio', {
      clientId: client.id,
    });

    session.bufferCount = 0;
  }

  /**
   * Handle text input dari frontend
   */
  @SubscribeMessage('input_text')
  async onText(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { text: string },
  ) {
    const session = this.sessions.get(client.id);
    if (!session || !session.isActive) {
      this.logger.warn(
        `Text input received for inactive session: ${client.id}`,
      );
      return;
    }

    const text = payload?.text ?? '';
    this.logger.log(
      `Text input received from client ${client.id}: ${text.substring(0, 50)}...`,
    );

    // Create message record for user text input
    if (session.userId && text.trim()) {
      try {
        await this.messageService.create({
          user_id: session.userId,
          content: text,
          is_ai: false,
        });
        this.logger.log(`User text message recorded for user ${session.userId}`);
      } catch (error) {
        this.logger.error(`Failed to create user text message: ${error.message}`);
      }
    }

    // Emit ke OpenAI Microservice
    this.eventEmitter.emit('process_text_input', {
      clientId: client.id,
      text,
    });
  }

  /**
   * Handle end session dari frontend
   */
  @SubscribeMessage('end')
  onEnd(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (session) {
      this.logger.log(`Session end requested by client ${client.id}`);
      session.isActive = false;

      // Emit ke OpenAI Microservice
      this.eventEmitter.emit('end_openai_session', {
        clientId: client.id,
      });

      this.sessions.delete(client.id);
    }
  }

  /**
   * Handle response dari OpenAI Microservice
   */
  private async handleOpenAIResponse(data: any) {
    const { clientId, type, payload } = data;
    const client = this.server.sockets.sockets.get(clientId);

    if (!client) {
      this.logger.warn(`Client ${clientId} not found for OpenAI response`);
      return;
    }

    this.logger.debug(
      `OpenAI response received for client ${clientId}, type: ${type}`,
    );

    // Get session to access userId
    const session = this.sessions.get(clientId);

    // Create message record for AI responses
    if (session?.userId && type === 'response_done') {
      try {
        let content = '[AI Audio Response]';
        
        // Try to extract text content if available
        if (payload?.response?.output?.content) {
          const textContent = payload.response.output.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join(' ');
          
          if (textContent.trim()) {
            content = textContent;
          }
        }

        await this.messageService.create({
          user_id: session.userId,
          content: content,
          is_ai: true,
        });
        this.logger.log(`AI response message recorded for user ${session.userId}`);
      } catch (error) {
        this.logger.error(`Failed to create AI response message: ${error.message}`);
      }
    }

    // Forward response ke client berdasarkan type
    switch (type) {
      case 'response_text':
        client.emit('response_text', payload);
        break;
      case 'response_audio_base64':
        client.emit('response_audio_base64', payload);
        break;
      case 'response_done':
        client.emit('response_done', payload);
        break;
      default:
        client.emit('openai_event', payload);
    }
  }

  /**
   * Handle error dari OpenAI Microservice
   */
  private handleOpenAIError(data: any) {
    const { clientId, error } = data;
    const client = this.server.sockets.sockets.get(clientId);

    if (!client) {
      this.logger.warn(`Client ${clientId} not found for OpenAI error`);
      return;
    }

    this.logger.error(`OpenAI error for client ${clientId}: ${error.message}`);
    client.emit('error', error);
  }

  /**
   * Handle ready dari OpenAI Microservice
   */
  private handleOpenAIReady(data: any) {
    const { clientId, model, voice } = data;
    const client = this.server.sockets.sockets.get(clientId);

    if (!client) {
      this.logger.warn(`Client ${clientId} not found for OpenAI ready`);
      return;
    }

    this.logger.log(`OpenAI ready for client ${clientId}`);
    client.emit('ready', { model, voice });
  }

  /**
   * Handle end dari OpenAI Microservice
   */
  private handleOpenAIEnd(data: any) {
    const { clientId } = data;
    const client = this.server.sockets.sockets.get(clientId);

    if (!client) {
      this.logger.warn(`Client ${clientId} not found for OpenAI end`);
      return;
    }

    this.logger.log(`OpenAI session ended for client ${clientId}`);
    client.emit('end');

    // Cleanup session
    this.sessions.delete(clientId);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return Array.from(this.sessions.values()).filter((s) => s.isActive).length;
  }

  /**
   * Get session info
   */
  getSessionInfo(clientId: string): ClientSession | undefined {
    return this.sessions.get(clientId);
  }
}
