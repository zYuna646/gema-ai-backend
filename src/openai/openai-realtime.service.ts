import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import WebSocket from 'ws';

interface OpenAIConnection {
  clientId: string;
  ws: WebSocket;
  bufferCount: number;
  isConnected: boolean;
  voice: string;
  model: string;
  createdAt: Date;
  pendingAudioChunks: string[];
}

@Injectable()
export class OpenAIRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(OpenAIRealtimeService.name);
  private readonly connections = new Map<string, OpenAIConnection>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('OpenAI Realtime Service initialized');
  }

  /**
   * Handle inisialisasi koneksi OpenAI untuk client
   */
  @OnEvent('init_openai_connection')
  async handleInitConnection(data: {
    clientId: string;
    userId?: string;
    modeId?: string;
    mode?: {
      context: string;
      temperature: number;
      role: string;
    } | null;
    voice: string;
    model: string;
    temperature: number;
    maxTokens: number;
    inputAudioFormat: string;
    inputAudioSampleRate: number;
  }) {
    const {
      clientId,
      userId,
      modeId,
      mode,
      voice,
      model,
      temperature,
      maxTokens,
      inputAudioFormat,
      inputAudioSampleRate,
    } = data;

    this.logger.log(
      `Initializing OpenAI connection for client: ${clientId}${userId ? ` (User: ${userId})` : ''}${modeId ? ` (Mode: ${modeId})` : ''}`,
    );

    const apiKey = this.configService.get<string>('openai.apiKey');
    if (!apiKey) {
      this.eventEmitter.emit('openai_error', {
        clientId,
        error: { message: 'OPENAI_API_KEY tidak ditemukan dalam konfigurasi' },
      });
      return;
    }

    const outputAudioFormat =
      this.configService.get<string>('openai.realtimeOutputAudioFormat') ||
      'pcm16';
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    ws.on('open', () => {
      this.logger.log(`OpenAI WebSocket connected for client: ${clientId}`);

      // Emit ready ke gateway
      this.eventEmitter.emit('openai_ready', { clientId, model, voice });

      // Send session update
      const sessionUpdate: any = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice,
          input_audio_format: inputAudioFormat,
          // Removed unsupported input_audio_sample_rate per API error
          output_audio_format: outputAudioFormat,
          temperature,
          // Removed unsupported max_output_tokens per API error
        },
      };

      // Add mode context as system instructions if available
      if (mode?.context) {
        sessionUpdate.session.instructions = mode.context;
      }

      ws.send(JSON.stringify(sessionUpdate));
    });

    ws.on('message', (data: WebSocket.RawData) => {
      this.handleOpenAIMessage(clientId, data);
    });

    ws.on('error', (err) => {
      this.logger.error(
        `OpenAI WebSocket error for client ${clientId}: ${err.message}`,
      );
      this.eventEmitter.emit('openai_error', {
        clientId,
        error: { message: err.message },
      });
    });

    ws.on('close', () => {
      this.logger.log(`OpenAI WebSocket closed for client: ${clientId}`);
      this.eventEmitter.emit('openai_end', { clientId });
      this.connections.delete(clientId);
    });

    // Store connection
    const connection: OpenAIConnection = {
      clientId,
      ws,
      bufferCount: 0,
      isConnected: true,
      voice,
      model,
      createdAt: new Date(),
      pendingAudioChunks: [],
    };

    this.connections.set(clientId, connection);
  }

  /**
   * Handle audio chunk dari gateway
   */
  @OnEvent('process_audio_chunk')
  handleAudioChunk(data: { clientId: string; audioData: string }) {
    const { clientId, audioData } = data;
    const connection = this.connections.get(clientId);

    if (!connection || !connection.isConnected) {
      this.logger.warn(
        `Audio chunk received for inactive connection: ${clientId}`,
      );
      return;
    }

    // Hitung durasi chunk (diasumsikan PCM16 mono 24kHz setelah resampling di gateway)
    const chunkBytes = Buffer.from(audioData, 'base64').length;
    const chunkMs = this.computePCM16DurationMs(audioData, 24000);

    this.logger.debug(
      `Processing audio chunk for client ${clientId}, size: ${chunkBytes}B (~${chunkMs.toFixed(1)}ms)`,
    );

    // Periksa status WebSocket sebelum mengirim data
    if (connection.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(
        `WebSocket not ready for client ${clientId}, readyState: ${connection.ws.readyState}. Buffering audio chunk (~${chunkMs.toFixed(1)}ms).`,
      );
      
      // Simpan chunk untuk dikirim nanti saat WebSocket siap
      if (!connection.pendingAudioChunks) {
        connection.pendingAudioChunks = [];
      }
      connection.pendingAudioChunks.push(audioData);
      return;
    }

    // Kirim audio chunks yang di-buffer saat WebSocket sudah siap
    if (connection.pendingAudioChunks && connection.pendingAudioChunks.length > 0) {
      const totalBufferedMs = connection.pendingAudioChunks.reduce((acc, ch) => acc + this.computePCM16DurationMs(ch, 24000), 0);
      const totalBufferedBytes = connection.pendingAudioChunks.reduce((acc, ch) => acc + Buffer.from(ch, 'base64').length, 0);
      this.logger.log(`Sending ${connection.pendingAudioChunks.length} buffered audio chunks for client: ${clientId} (~${totalBufferedMs.toFixed(1)}ms, ${totalBufferedBytes}B)`);
      
      for (const buffered of connection.pendingAudioChunks) {
        try {
          const ms = this.computePCM16DurationMs(buffered, 24000);
          const bytes = Buffer.from(buffered, 'base64').length;
          const append = { type: 'input_audio_buffer.append', audio: buffered };
          connection.ws.send(JSON.stringify(append));
          connection.bufferCount++;
          
          this.logger.debug(
            `Buffered chunk sent to OpenAI for client ${clientId}: ~${ms.toFixed(1)}ms (${bytes}B). Buffer count: ${connection.bufferCount}`,
          );
        } catch (error) {
          this.logger.error(
            `Error sending buffered audio chunk to OpenAI for client ${clientId}: ${error.message}`,
          );
        }
      }
      
      // Clear the buffer after sending
      connection.pendingAudioChunks = [];
    }

    try {
      const append = { type: 'input_audio_buffer.append', audio: audioData };
      connection.ws.send(JSON.stringify(append));
      connection.bufferCount++;

      // Log audio sent to OpenAI
      this.logger.debug(
        `Audio chunk sent to OpenAI for client ${clientId}: ~${chunkMs.toFixed(1)}ms (${chunkBytes}B). Buffer count: ${connection.bufferCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending audio chunk to OpenAI for client ${clientId}: ${error.message}`,
      );
    }
  }

  /**
   * Handle commit audio dari gateway
   */
  @OnEvent('commit_audio')
  handleCommitAudio(data: { clientId: string }) {
    const { clientId } = data;
    const connection = this.connections.get(clientId);

    if (!connection || !connection.isConnected) {
      this.logger.warn(
        `Commit audio received for inactive connection: ${clientId}`,
      );
      return;
    }

    this.logger.log(`Committing audio buffer for client ${clientId}`);

    connection.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    connection.ws.send(JSON.stringify({ type: 'response.create' }));
    connection.bufferCount = 0;

    // Log audio committed
    this.logger.log(`Audio committed to OpenAI for client ${clientId}`);
  }

  /**
   * Handle text input dari gateway
   */
  @OnEvent('process_text_input')
  handleTextInput(data: { clientId: string; text: string }) {
    const { clientId, text } = data;
    const connection = this.connections.get(clientId);

    if (!connection || !connection.isConnected) {
      this.logger.warn(
        `Text input received for inactive connection: ${clientId}`,
      );
      return;
    }

    this.logger.log(
      `Processing text input for client ${clientId}: ${text.substring(0, 50)}...`,
    );

    connection.ws.send(JSON.stringify({ type: 'input_text', text }));
    connection.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Handle end session dari gateway
   */
  @OnEvent('end_openai_session')
  handleEndSession(data: { clientId: string }) {
    const { clientId } = data;
    const connection = this.connections.get(clientId);

    if (connection) {
      this.logger.log(`Ending OpenAI session for client ${clientId}`);
      connection.isConnected = false;

      try {
        connection.ws.close();
      } catch (error) {
        this.logger.error(
          `Error closing WebSocket for client ${clientId}: ${error.message}`,
        );
      } finally {
        this.connections.delete(clientId);
      }
    }
  }

  /**
   * Handle cleanup connection dari gateway
   */
  @OnEvent('cleanup_openai_connection')
  handleCleanupConnection(data: { clientId: string }) {
    const { clientId } = data;
    const connection = this.connections.get(clientId);

    if (connection) {
      this.logger.log(`Cleaning up OpenAI connection for client ${clientId}`);
      connection.isConnected = false;

      try {
        connection.ws.close();
      } catch (error) {
        this.logger.error(
          `Error during cleanup for client ${clientId}: ${error.message}`,
        );
      } finally {
        this.connections.delete(clientId);
      }
    }
  }

  /**
   * Handle message dari OpenAI WebSocket
   */
  private handleOpenAIMessage(clientId: string, data: WebSocket.RawData) {
    try {
      const msg = JSON.parse(data.toString());
      const type: string = msg?.type || '';

      this.logger.debug(
        `OpenAI message received for client ${clientId}, type: ${type}`,
      );

      // Emit and log errors coming from OpenAI
      if (type === 'error') {
        const err = msg?.error || msg;
        this.logger.error(
          `OpenAI message error for client ${clientId}: ${typeof err === 'string' ? err : JSON.stringify(err)}`,
        );
        this.eventEmitter.emit('openai_error', { clientId, error: err });
      }

      // Handle text delta variants
      if (
        type === 'response.delta' ||
        type === 'response.output_text.delta' ||
        type === 'output_text.delta' ||
        type === 'text.delta'
      ) {
        const delta =
          msg?.delta ??
          msg?.response?.output_text?.delta ??
          msg?.output_text?.delta ??
          msg?.text ??
          '';
        if (delta) {
          this.eventEmitter.emit('openai_response', {
            clientId,
            type: 'response_text',
            payload: { delta },
          });
        }
      }

      // Handle audio transcript delta variants
      if (
        type === 'response.audio_transcript.delta' ||
        type === 'audio_transcript.delta'
      ) {
        const transcriptDelta =
          msg?.delta ??
          msg?.response?.audio_transcript?.delta ??
          msg?.audio_transcript?.delta ??
          '';
        if (transcriptDelta) {
          this.eventEmitter.emit('openai_response', {
            clientId,
            type: 'response_text',
            payload: { delta: transcriptDelta },
          });
        }
      }

      // Handle audio delta variants (base64)
      if (
        type === 'response.output_audio.delta' ||
        type === 'output_audio.delta' ||
        type === 'audio.delta'
      ) {
        const audioB64 =
          msg?.delta ??
          msg?.response?.output_audio?.delta ??
          msg?.audio?.delta ??
          msg?.audio ??
          '';
        if (audioB64) {
          this.eventEmitter.emit('openai_response', {
            clientId,
            type: 'response_audio_base64',
            payload: { audio: audioB64 },
          });
        }
      }

      // Handle response completed
      if (type === 'response.completed') {
        this.eventEmitter.emit('openai_response', {
          clientId,
          type: 'response_done',
          payload: msg,
        });

        this.logger.log(`OpenAI response completed for client ${clientId}`);
      }

      // Forward any other event as-is for debugging
      if (!type) {
        this.eventEmitter.emit('openai_response', {
          clientId,
          type: 'openai_event',
          payload: msg,
        });
      }
    } catch (e) {
      // If non-JSON binary payloads ever arrive
      this.eventEmitter.emit('openai_response', {
        clientId,
        type: 'response_binary',
        payload: data,
      });
    }
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return Array.from(this.connections.values()).filter((c) => c.isConnected)
      .length;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(clientId: string): OpenAIConnection | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Get all connections info
   */
  getAllConnectionsInfo(): OpenAIConnection[] {
    return Array.from(this.connections.values());
  }

  // Helper: hitung durasi PCM16 mono (ms)
  private computePCM16DurationMs(base64Audio: string, sampleRate = 24000): number {
    try {
      const bytes = Buffer.from(base64Audio, 'base64').length;
      const samples = bytes / 2; // 2 bytes per PCM16 sample
      return (samples / sampleRate) * 1000;
    } catch (e) {
      this.logger.warn(`Failed to compute PCM16 duration: ${e.message}`);
      return 0;
    }
  }
}
