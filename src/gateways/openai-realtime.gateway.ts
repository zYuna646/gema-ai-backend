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
import { OpenaiService } from '../openai/openai.service';
import { ModeService } from '../mode/mode.service';

interface ClientSession {
  clientId: string;
  userId?: string;
  modeId?: string; // Store mode ID for the session
  isActive: boolean;
  bufferCount: number;
  createdAt: Date;
  audioChunks: string[]; // Store audio chunks for transcription
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
    private readonly openaiService: OpenaiService,
    private readonly modeService: ModeService,
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

      // Extract mode_id from query parameters
      const modeId = client.handshake.query?.mode_id as string;

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

      // Get mode settings if mode_id is provided
      let mode: any = null;
      if (modeId) {
        try {
          mode = await this.modeService.findOne(modeId);
          this.logger.log(`Mode loaded for client ${client.id}: ${mode.name}`);
        } catch (error) {
          this.logger.warn(
            `Invalid mode_id ${modeId} for client ${client.id}: ${error.message}`,
          );
          client.emit('error', {
            message: 'Invalid mode_id provided',
            error: error.message,
          });
          client.disconnect();
          return;
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

      // Use temperature from mode or default
      const temperature = mode?.temperature ?? 0.7;

      // Use max_tokens from settings
      const maxTokens = settings?.max_tokens || 2000;

      const inputAudioFormat =
        (client.handshake.query.format as string) || 'pcm16';
      const inputAudioSampleRate = client.handshake.query.sr
        ? parseInt(client.handshake.query.sr as string, 10)
        : 16000;

      this.logger.log(
        `Client connected: ${client.id}${userId ? ` (User: ${userId})` : ''}${modeId ? ` (Mode: ${mode?.name})` : ''}`,
      );

      // Buat session untuk client
      const session: ClientSession = {
        clientId: client.id,
        userId,
        modeId,
        isActive: true,
        bufferCount: 0,
        createdAt: new Date(),
        audioChunks: [], // Initialize audio chunks array
      };

      this.sessions.set(client.id, session);

      // Emit event ke OpenAI Microservice untuk inisialisasi koneksi
      this.eventEmitter.emit('init_openai_connection', {
        clientId: client.id,
        userId,
        modeId,
        mode: mode
          ? {
              context: mode.context,
              temperature: mode.temperature,
              role: mode.role,
            }
          : null,
        voice,
        model,
        temperature,
        maxTokens,
        inputAudioFormat,
        inputAudioSampleRate,
      });

      this.logger.log(
        `Session created for client ${client.id} with voice: ${voice}, model: ${model}, temperature: ${temperature}, maxTokens: ${maxTokens}${userId ? `, user: ${userId}` : ''}${mode ? `, mode: ${mode.name} (${mode.role})` : ''}`,
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

    // Store audio chunk for transcription
    session.audioChunks.push(base64);

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

    // Create message record for user audio input with transcription
    if (
      session.userId &&
      session.bufferCount > 0 &&
      session.audioChunks.length > 0
    ) {
      try {
        // Combine all audio chunks into a single base64 string
        const combinedAudio = session.audioChunks.join('');
        const audioBase64 = `data:audio/wav;base64,${combinedAudio}`;

        // Transcribe the audio using OpenAI service
        const transcriptionResult = await this.openaiService.transcribeAudio({
          audioBase64,
          conversationId: session.clientId,
        });

        let content = '[Audio Input]';
        if (transcriptionResult && transcriptionResult.transcription) {
          content = transcriptionResult.transcription;
        }

        await this.messageService.create({
          user_id: session.userId,
          content: content,
          is_ai: false,
        });

        this.logger.log(
          `User audio message recorded for user ${session.userId} with transcription: ${content.substring(0, 50)}...`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create user audio message: ${error.message}`,
        );

        // Fallback: create message without transcription
        try {
          await this.messageService.create({
            user_id: session.userId,
            content: '[Audio Input - Transcription Failed]',
            is_ai: false,
          });
        } catch (fallbackError) {
          this.logger.error(
            `Failed to create fallback message: ${fallbackError.message}`,
          );
        }
      }
    }

    // Emit ke OpenAI Microservice untuk commit audio
    this.eventEmitter.emit('commit_audio', {
      clientId: client.id,
    });

    // Clear audio chunks and reset buffer count
    session.audioChunks = [];
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
        this.logger.log(
          `User text message recorded for user ${session.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create user text message: ${error.message}`,
        );
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

        // Try to extract text content from various possible payload structures
        if (payload?.response?.output?.content) {
          const textContent = payload.response.output.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join(' ');

          if (textContent.trim()) {
            content = textContent;
          }
        } else if (payload?.text) {
          // Direct text response
          content = payload.text;
        } else if (payload?.response?.text) {
          // Nested text response
          content = payload.response.text;
        } else if (payload?.transcript) {
          // Transcript from audio response
          content = payload.transcript;
        } else if (payload?.response?.transcript) {
          // Nested transcript
          content = payload.response.transcript;
        }

        await this.messageService.create({
          user_id: session.userId,
          content: content,
          is_ai: true,
        });
        this.logger.log(
          `AI response message recorded for user ${session.userId} with content: ${content.substring(0, 50)}...`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create AI response message: ${error.message}`,
        );

        // Fallback: create message without content extraction
        try {
          await this.messageService.create({
            user_id: session.userId,
            content: '[AI Response - Content Extraction Failed]',
            is_ai: true,
          });
        } catch (fallbackError) {
          this.logger.error(
            `Failed to create fallback AI message: ${fallbackError.message}`,
          );
        }
      }
    }

    // Handle audio responses that need transcription
    if (session?.userId && type === 'response_audio_base64' && payload?.audio) {
      try {
        // Transcribe AI audio response to get text content
        const audioBase64 = `data:audio/wav;base64,${payload.audio}`;
        const transcriptionResult = await this.openaiService.transcribeAudio({
          audioBase64,
          conversationId: session.clientId,
        });

        if (transcriptionResult?.transcription) {
          await this.messageService.create({
            user_id: session.userId,
            content: transcriptionResult.transcription,
            is_ai: true,
          });
          this.logger.log(
            `AI audio response transcribed and recorded for user ${session.userId}: ${transcriptionResult.transcription.substring(0, 50)}...`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to transcribe AI audio response: ${error.message}`,
        );
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
