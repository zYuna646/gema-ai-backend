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
  inputAudioFormat: string;
  inputAudioSampleRate: number;
  aiAudioChunks: string[]; // Store AI audio chunks for optional transcription
  // VAD state and config
  isSpeaking: boolean;
  vadThresholdRms: number;
  vadHangoverMs: number;
  vadSilenceTimeout?: NodeJS.Timeout;
  vadLastSpeechAt?: number;
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
        inputAudioFormat,
        inputAudioSampleRate,
        aiAudioChunks: [],
        // VAD defaults
        isSpeaking: false,
        vadThresholdRms: 0.015, // ~ -36 dBFS, tweakable
        vadHangoverMs: 300,
        vadSilenceTimeout: undefined,
        vadLastSpeechAt: undefined,
      };

      this.sessions.set(client.id, session);

      // Emit initial VAD state to client
      client.emit('vad_state', {
        isSpeaking: false,
        threshold: session.vadThresholdRms,
        hangoverMs: session.vadHangoverMs,
      });
      this.logger.debug(`Initial VAD state for client ${client.id}: isSpeaking=false`);
      
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
  
      // Clear VAD silence timer if any
      if (session.vadSilenceTimeout) {
        clearTimeout(session.vadSilenceTimeout);
        session.vadSilenceTimeout = undefined;
      }
  
      // Emit event ke OpenAI Microservice untuk cleanup
      this.eventEmitter.emit('cleanup_openai_connection', {
        clientId: client.id,
      });
  
      this.sessions.delete(client.id);
    }
  }

  /**
   * Helper: hitung RMS pada PCM16 mono
   */
  private pcm16Rms(pcm: Buffer): number {
    if (!pcm || pcm.length < 2) return 0;
    const samples = pcm.length / 2;
    let sumsq = 0;
    for (let i = 0; i < pcm.length; i += 2) {
      const s = pcm.readInt16LE(i);
      const norm = s / 32768;
      sumsq += norm * norm;
    }
    return Math.sqrt(sumsq / samples);
  }

  /**
   * Flush audio AI yang ditahan saat user berbicara
   */
  private flushBufferedAIChunks(session: ClientSession) {
    const client = this.server.sockets.sockets.get(session.clientId);
    if (!client) {
      this.logger.warn(`Client ${session.clientId} not found during AI flush`);
      session.aiAudioChunks = [];
      return;
    }

    if (session.aiAudioChunks.length > 0) {
      const count = session.aiAudioChunks.length;
      this.logger.log(
        `Flushing ${count} buffered AI audio chunks to client ${session.clientId} (post-silence)`,
      );
      for (const chunk of session.aiAudioChunks) {
        client.emit('response_audio_base64', { audio: chunk });
      }
      session.aiAudioChunks = [];
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

    const wasSpeaking = session.isSpeaking;

    // Decode to base64 string as received
    let base64Original: string;
    if (typeof payload === 'string') {
      base64Original = payload.startsWith('data:')
        ? payload.split(',')[1]
        : payload;
    } else if (payload instanceof Buffer) {
      base64Original = payload.toString('base64');
    } else {
      base64Original = Buffer.from(payload as ArrayBuffer).toString('base64');
    }

    // Always store original chunk for offline transcription
    session.audioChunks.push(base64Original);

    const format = (session.inputAudioFormat || 'pcm16').toLowerCase();

    // Only stream PCM16 to OpenAI Realtime; resample to 24kHz if needed
    if (format.includes('pcm')) {
      const pcmBuffer = Buffer.from(base64Original, 'base64');

      // VAD: deteksi berbicara menggunakan RMS
      const rms = this.pcm16Rms(pcmBuffer);
      const isSpeech = rms >= session.vadThresholdRms;
      const now = Date.now();

      if (isSpeech) {
        session.isSpeaking = true;
        session.vadLastSpeechAt = now;
        if (session.vadSilenceTimeout) clearTimeout(session.vadSilenceTimeout);
        // Jadwalkan flush AI audio setelah periode hangover jika tidak ada chunk berikutnya
        session.vadSilenceTimeout = setTimeout(() => {
          session.isSpeaking = false;
          this.flushBufferedAIChunks(session);
        }, session.vadHangoverMs);

        // Emit VAD speaking start if transitioned
        if (!wasSpeaking) {
          client.emit('vad_state', {
            isSpeaking: true,
            rms,
            threshold: session.vadThresholdRms,
            hangoverMs: session.vadHangoverMs,
          });
          this.logger.debug(
            `VAD state: speaking=true for client ${client.id} (rms=${rms.toFixed(4)})`,
          );
        }
      }

      const fromRate = session.inputAudioSampleRate || 16000;
      const targetRate = 24000;

      let finalBase64: string;
      if (fromRate !== targetRate) {
        const resampled = this.resamplePCM16Mono(pcmBuffer, fromRate, targetRate);
        this.logger.debug(
          `Resampled PCM16 for client ${client.id}: ${fromRate}Hz -> ${targetRate}Hz, in=${pcmBuffer.length}B out=${resampled.length}B (rms=${rms.toFixed(4)}, threshold=${session.vadThresholdRms})`,
        );
        finalBase64 = resampled.toString('base64');
      } else {
        finalBase64 = pcmBuffer.toString('base64');
        this.logger.debug(
          `PCM16 for client ${client.id}: ${fromRate}Hz, in=${pcmBuffer.length}B (rms=${rms.toFixed(4)}, threshold=${session.vadThresholdRms})`,
        );
      }

      // PCM16 resampling dan konversi base64 final
      const targetSampleRate = 24000;
      const resampledBytes = Buffer.from(finalBase64, 'base64').length;
      const resampledMs = Math.round(((resampledBytes / 2) / targetSampleRate) * 1000);

      // Hanya kirim ke OpenAI jika sedang berbicara (VAD true)
      if (isSpeech) {
        this.logger.debug(
          `PCM16 chunk forwarded to OpenAI (client ${client.id}): ~${resampledMs}ms (${resampledBytes}B @ ${targetSampleRate}Hz) [speaking]`,
        );

        // Emit ke service untuk diproses
        this.eventEmitter.emit('process_audio_chunk', {
          clientId: client.id,
          audioData: finalBase64,
        });

        session.bufferCount++;
        this.logger.debug(
          `PCM16 chunk forwarded to OpenAI for client ${client.id}, bufferCount=${session.bufferCount}`,
        );
      } else {
        this.logger.debug(
          `PCM16 chunk NOT forwarded (client ${client.id}): silent (~${resampledMs}ms, rms=${rms.toFixed(4)} < ${session.vadThresholdRms})`,
        );
      }
    } else {
      // Non-PCM input cannot be streamed directly; rely on offline transcription path
      this.logger.warn(
        `Non-PCM input format "${session.inputAudioFormat}" cannot be streamed to Realtime. Stored for transcription only.`,
      );
    }
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
        const combinedAudioBase64 = session.audioChunks.join('');

        // Determine transcription format based on inputAudioFormat
        let audioBase64: string;
        const format = (session.inputAudioFormat || 'pcm16').toLowerCase();
        if (format.includes('pcm')) {
          const pcmBuffer = Buffer.from(combinedAudioBase64, 'base64');
          const wavBuffer = this.pcm16ToWav(
            pcmBuffer,
            session.inputAudioSampleRate || 16000,
            1,
          );
          audioBase64 = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/wav (PCM16 → WAV), sr=${session.inputAudioSampleRate || 16000}`,
          );
        } else if (format.includes('webm')) {
          audioBase64 = `data:audio/webm;base64,${combinedAudioBase64}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/webm`,
          );
        } else if (format.includes('mp3') || format.includes('mpeg')) {
          audioBase64 = `data:audio/mp3;base64,${combinedAudioBase64}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/mp3`,
          );
        } else if (format.includes('m4a') || format.includes('mp4')) {
          audioBase64 = `data:audio/m4a;base64,${combinedAudioBase64}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/m4a`,
          );
        } else if (format.includes('wav')) {
          audioBase64 = `data:audio/wav;base64,${combinedAudioBase64}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/wav`,
          );
        } else if (format.includes('ogg')) {
          audioBase64 = `data:audio/ogg;base64,${combinedAudioBase64}`;
          this.logger.debug(
            `Sending audio for transcription with format: audio/ogg`,
          );
        } else {
          const pcmBuffer = Buffer.from(combinedAudioBase64, 'base64');
          const wavBuffer = this.pcm16ToWav(
            pcmBuffer,
            session.inputAudioSampleRate || 16000,
            1,
          );
          audioBase64 = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
          this.logger.warn(
            `Unknown inputAudioFormat "${session.inputAudioFormat}". Falling back to WAV conversion.`,
          );
        }

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

    this.logger.debug('Commit audio');

    // Only commit if we actually streamed PCM chunks; prevents 'buffer too small'
    if (session.bufferCount > 0) {
      this.eventEmitter.emit('commit_audio', {
        clientId: client.id,
      });
    } else {
      this.logger.warn(
        `Skipping commit for client ${client.id}: no PCM chunks were streamed to OpenAI`,
      );
    }

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

    // Gate audio responses while user is speaking
    if (session && type === 'response_audio_base64' && payload?.audio) {
      if (session.isSpeaking) {
        session.aiAudioChunks.push(payload.audio);
        this.logger.debug(
          `Holding AI audio chunk for client ${clientId} (user speaking). Buffered=${session.aiAudioChunks.length}`,
        );
        return; // do not emit now
      } else if (session.aiAudioChunks.length > 0) {
        // If silence now, flush buffered chunks first
        this.flushBufferedAIChunks(session);
      }
    }

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
        const audioBase64 = `data:audio/mp3;base64,${payload.audio}`;

        // Log the audio format for debugging
        this.logger.debug(
          `Attempting to transcribe AI audio response for client ${session.clientId}, audio format: audio/mp3`,
        );

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

  // Helper: Convert PCM16 buffer to WAV (mono)
  private pcm16ToWav(
    pcmBuffer: Buffer,
    sampleRate: number,
    channels = 1,
  ): Buffer {
    const bytesPerSample = 2; // 16-bit
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM
    header.writeUInt16LE(1, 20); // Audio format 1 = PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  // Helper: Resample PCM16 mono buffer to target sample rate (linear)
  private resamplePCM16Mono(
    pcmBuffer: Buffer,
    fromRate: number,
    toRate: number,
  ): Buffer {
    if (fromRate === toRate) return pcmBuffer;

    const inSamples = new Int16Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      Math.floor(pcmBuffer.byteLength / 2),
    );

    const ratio = toRate / fromRate;
    const outLen = Math.floor(inSamples.length * ratio);
    const outBuffer = Buffer.alloc(outLen * 2);
    const outView = new DataView(
      outBuffer.buffer,
      outBuffer.byteOffset,
      outBuffer.byteLength,
    );

    for (let j = 0; j < outLen; j++) {
      const pos = j / ratio; // j * fromRate / toRate
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, inSamples.length - 1);
      const w = pos - i0;
      const val = Math.round(inSamples[i0] * (1 - w) + inSamples[i1] * w);
      const clamped = Math.max(-32768, Math.min(32767, val));
      outView.setInt16(j * 2, clamped, true);
    }

    return outBuffer;
  }
}
