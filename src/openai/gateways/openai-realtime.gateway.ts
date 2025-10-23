import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';

interface ClientConnection {
  ws: WebSocket;
  bufferCount: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/openai',
})
export class OpenAIRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly connections = new Map<string, ClientConnection>();

  constructor(private readonly configService: ConfigService) {}

  handleConnection(client: Socket) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const defaultModel =
      this.configService.get<string>('openai.realtimeModel') ||
      'gpt-4o-realtime-preview';
    const voice =
      (client.handshake.query.voice as string) ||
      this.configService.get<string>('openai.realtimeVoice') ||
      'alloy';
    const model = (client.handshake.query.model as string) || defaultModel;

    const inputAudioFormat =
      (client.handshake.query.format as string) ||
      this.configService.get<string>('openai.realtimeInputAudioFormat') ||
      'pcm16';
    const inputAudioSampleRate =
      (client.handshake.query.sr
        ? parseInt(client.handshake.query.sr as string, 10)
        : undefined) ||
      this.configService.get<number>('openai.realtimeInputAudioSampleRate') ||
      16000;
    const outputAudioFormat =
      this.configService.get<string>('openai.realtimeOutputAudioFormat') ||
      'pcm16';

    if (!apiKey) {
      client.emit('error', {
        message: 'OPENAI_API_KEY tidak ditemukan dalam konfigurasi',
      });
      client.disconnect(true);
      return;
    }

    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
      model,
    )}`;

    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    ws.on('open', () => {
      client.emit('ready', { model, voice });
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice,
          input_audio_format: inputAudioFormat,
          input_audio_sample_rate: inputAudioSampleRate,
          output_audio_format: outputAudioFormat,
        },
      };
      ws.send(JSON.stringify(sessionUpdate));
    });

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        const type: string = msg?.type || '';

        // Forward text delta variants
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
            client.emit('response_text', { delta });
          }
        }

        // Forward audio delta variants (base64)
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
            client.emit('response_audio_base64', audioB64);
          }
        }

        if (type === 'response.completed') {
          client.emit('response_done', msg);
        }

        // Forward any other event as-is for debugging
        if (!type) {
          client.emit('openai_event', msg);
        }
      } catch (e) {
        // If non-JSON binary payloads ever arrive
        client.emit('response_binary', data);
      }
    });

    ws.on('error', (err) => {
      client.emit('error', { message: err.message });
    });

    ws.on('close', () => {
      client.emit('end');
    });

    this.connections.set(client.id, { ws, bufferCount: 0 });
  }

  handleDisconnect(client: Socket) {
    const conn = this.connections.get(client.id);
    if (conn) {
      try {
        conn.ws.close();
      } finally {
        this.connections.delete(client.id);
      }
    }
  }

  /**
   * Kirim chunk audio dari client -> OpenAI (binary atau base64)
   */
  @SubscribeMessage('input_audio_chunk')
  onAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ArrayBuffer | Buffer | string,
  ) {
    const conn = this.connections.get(client.id);
    if (!conn) return;

    let base64: string;
    if (typeof payload === 'string') {
      base64 = payload.startsWith('data:') ? payload.split(',')[1] : payload;
    } else if (payload instanceof Buffer) {
      base64 = payload.toString('base64');
    } else {
      base64 = Buffer.from(payload as ArrayBuffer).toString('base64');
    }

    const append = { type: 'input_audio_buffer.append', audio: base64 };
    conn.ws.send(JSON.stringify(append));
    conn.bufferCount++;
  }

  /**
   * Komit buffer audio dan minta respons dari model
   */
  @SubscribeMessage('commit_audio')
  onCommit(@ConnectedSocket() client: Socket) {
    const conn = this.connections.get(client.id);
    if (!conn) return;

    conn.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    conn.ws.send(JSON.stringify({ type: 'response.create' }));
    conn.bufferCount = 0;
  }

  /**
   * Kirim teks input ke model
   */
  @SubscribeMessage('input_text')
  onText(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { text: string },
  ) {
    const conn = this.connections.get(client.id);
    if (!conn) return;

    const text = payload?.text ?? '';
    conn.ws.send(JSON.stringify({ type: 'input_text', text }));
    conn.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Akhiri sesi dengan eksplisit
   */
  @SubscribeMessage('end')
  onEnd(@ConnectedSocket() client: Socket) {
    const conn = this.connections.get(client.id);
    if (conn) {
      try {
        conn.ws.close();
      } finally {
        this.connections.delete(client.id);
      }
    }
  }
}
