import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateOpenaiDto } from './dto/create-openai.dto';
import { MessageDto } from './dto/message.dto';
import { AudioRequestDto } from './dto/audio-request.dto';
import { AudioConversationDto } from './dto/audio-conversation.dto';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Observable, Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface Conversation {
  messages: ChatCompletionMessageParam[];
  subject: Subject<any>;
}

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai: OpenAI;
  private readonly conversations = new Map<string, Conversation>();

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async startConversation(createOpenaiDto: CreateOpenaiDto) {
    const conversationId =
      createOpenaiDto.conversationId || crypto.randomUUID();

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        messages: [],
        subject: new Subject(),
      });
    }

    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      // Tambahkan pesan pengguna ke riwayat percakapan
      conversation.messages.push({
        role: 'user',
        content: createOpenaiDto.message,
      } as ChatCompletionMessageParam);

      try {
        // Buat stream dari OpenAI
        const stream = await this.openai.chat.completions.create({
          model:
            createOpenaiDto.model ||
            this.configService.get<string>('openai.defaultModel') ||
            'gpt-4o',
          messages: conversation.messages,
          temperature:
            createOpenaiDto.temperature ||
            this.configService.get<number>('openai.defaultTemperature') ||
            0.7,
          max_tokens:
            createOpenaiDto.maxTokens ||
            this.configService.get<number>('openai.defaultMaxTokens') ||
            2000,
          stream: true,
        });

        let fullResponse = '';

        // Proses stream dan kirim ke subject
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            conversation.subject.next({ content, conversationId });
          }
        }

        // Tambahkan respons asisten ke riwayat percakapan
        conversation.messages.push({
          role: 'assistant',
          content: fullResponse,
        } as ChatCompletionMessageParam);

        // Tandai akhir stream
        conversation.subject.next({ done: true, conversationId });

        return { conversationId };
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Error in OpenAI stream: ${err.message}`, err.stack);
        conversation.subject.error(err);
        return { error: err.message, conversationId };
      }
    }

    return { error: 'Failed to create conversation', conversationId };
  }

  getResponseStream(conversationId: string): Observable<any> {
    if (!this.conversations.has(conversationId)) {
      const subject = new Subject();
      this.conversations.set(conversationId, { messages: [], subject });
    }

    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      return conversation.subject.asObservable();
    }

    // If conversation doesn't exist, create a new subject and return an error
    const errorSubject = new Subject<any>();
    errorSubject.error({ error: 'Conversation not found' });
    return errorSubject.asObservable();
  }

  async sendMessage(messageDto: MessageDto) {
    const { conversationId, content } = messageDto;

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        messages: [],
        subject: new Subject(),
      });
    }

    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      // Tambahkan pesan pengguna ke riwayat percakapan
      conversation.messages.push({
        role: 'user',
        content,
      } as ChatCompletionMessageParam);

      try {
        // Buat stream dari OpenAI
        const stream = await this.openai.chat.completions.create({
          model:
            messageDto.model ||
            this.configService.get<string>('openai.defaultModel') ||
            'gpt-4o',
          messages: conversation.messages,
          temperature:
            messageDto.temperature ||
            this.configService.get<number>('openai.defaultTemperature') ||
            0.7,
          max_tokens:
            messageDto.maxTokens ||
            this.configService.get<number>('openai.defaultMaxTokens') ||
            2000,
          stream: true,
        });

        let fullResponse = '';

        // Proses stream dan kirim ke subject
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            conversation.subject.next({ content, conversationId });
          }
        }

        // Tambahkan respons asisten ke riwayat percakapan
        conversation.messages.push({
          role: 'assistant',
          content: fullResponse,
        } as ChatCompletionMessageParam);

        // Tandai akhir stream
        conversation.subject.next({ done: true, conversationId });

        return { conversationId };
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Error in OpenAI stream: ${err.message}`, err.stack);
        conversation.subject.error(err);
        return { error: err.message, conversationId };
      }
    }

    return { error: 'Conversation not found', conversationId };
  }

  /**
   * Konversi audio ke teks menggunakan OpenAI Whisper API
   */
  async transcribeAudio(audioRequestDto: AudioRequestDto) {
    const { conversationId, audioBase64 } = audioRequestDto;
    const convId = conversationId || crypto.randomUUID();

    try {
      // Ekstrak data audio dari base64
      const matches = audioBase64.match(/^data:(.+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        throw new Error('Format audio base64 tidak valid');
      }

      const [, mimeType, base64Data] = matches;
      const buffer = Buffer.from(base64Data, 'base64');

      // Simpan file audio sementara
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio-${Date.now()}.wav`);
      fs.writeFileSync(tempFilePath, buffer);

      // Transcribe audio menggunakan OpenAI
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      // Hapus file sementara
      fs.unlinkSync(tempFilePath);

      // Simpan transcription ke conversation jika ada
      if (this.conversations.has(convId)) {
        const conversation = this.conversations.get(convId);
        if (conversation) {
          conversation.messages.push({
            role: 'user',
            content: transcription.text,
          } as ChatCompletionMessageParam);
        }
      } else {
        this.conversations.set(convId, {
          messages: [
            {
              role: 'user',
              content: transcription.text,
            } as ChatCompletionMessageParam,
          ],
          subject: new Subject(),
        });
      }

      // Buat respons dari OpenAI
      const conversation = this.conversations.get(convId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const completion = await this.openai.chat.completions.create({
        model:
          audioRequestDto.model ||
          this.configService.get<string>('openai.defaultModel') ||
          'gpt-4o',
        messages: conversation.messages,
        temperature:
          audioRequestDto.temperature ||
          this.configService.get<number>('openai.defaultTemperature') ||
          0.7,
        max_tokens:
          audioRequestDto.maxTokens ||
          this.configService.get<number>('openai.defaultMaxTokens') ||
          2000,
      });

      const responseText = completion.choices[0].message.content || '';

      // Simpan respons ke conversation
      conversation.messages.push({
        role: 'assistant',
        content: responseText,
      } as ChatCompletionMessageParam);

      // Konversi respons teks ke audio
      const speechFile = path.join(tempDir, `speech-${Date.now()}.mp3`);
      const mp3Response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: responseText,
      });

      const buffer2 = Buffer.from(await mp3Response.arrayBuffer());
      fs.writeFileSync(speechFile, buffer2);

      // Baca file audio sebagai base64
      const audioResponse = fs.readFileSync(speechFile);
      const audioBase64Response = `data:audio/mp3;base64,${audioResponse.toString('base64')}`;

      // Hapus file sementara
      fs.unlinkSync(speechFile);

      return {
        conversationId: convId,
        transcription: transcription.text,
        responseText,
        audioResponse: audioBase64Response,
      };
    } catch (error) {
      this.logger.error(
        `Error in audio transcription: ${error.message}`,
        error.stack,
      );
      return { error: error.message, conversationId: convId };
    }
  }

  /**
   * Konversi teks ke audio menggunakan OpenAI TTS API
   */
  async textToSpeech(text: string) {
    try {
      const tempDir = os.tmpdir();
      const speechFile = path.join(tempDir, `speech-${Date.now()}.mp3`);

      const mp3Response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      fs.writeFileSync(speechFile, buffer);

      // Baca file audio sebagai base64
      const audioResponse = fs.readFileSync(speechFile);
      const audioBase64 = `data:audio/mp3;base64,${audioResponse.toString('base64')}`;

      // Hapus file sementara
      fs.unlinkSync(speechFile);

      return { audioBase64 };
    } catch (error) {
      this.logger.error(
        `Error in text to speech: ${error.message}`,
        error.stack,
      );
      return { error: error.message };
    }
  }

  /**
   * Get available models from OpenAI
   */
  async getAvailableModels() {
    try {
      const models = await this.openai.models.list();
      return models.data;
    } catch (error) {
      this.logger.error(
        `Error fetching OpenAI models: ${error.message}`,
        error.stack,
      );
      return { error: error.message };
    }
  }

  /**
   * Percakapan langsung menggunakan audio ke model
   */
  async audioConversation(audioConversationDto: AudioConversationDto) {
    const { conversationId, audioBase64 } = audioConversationDto;
    const convId = conversationId || crypto.randomUUID();

    try {
      // Ekstrak data audio dari base64
      const matches = audioBase64.match(/^data:(.+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        throw new Error('Format audio base64 tidak valid');
      }

      const [, mimeType, base64Data] = matches;
      const buffer = Buffer.from(base64Data, 'base64');

      // Simpan file audio sementara
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio-${Date.now()}.wav`);
      fs.writeFileSync(tempFilePath, buffer);

      // Inisialisasi conversation jika belum ada
      if (!this.conversations.has(convId)) {
        this.conversations.set(convId, {
          messages: [],
          subject: new Subject(),
        });
      }

      const conversation = this.conversations.get(convId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Transcribe audio menggunakan OpenAI Whisper API terlebih dahulu
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      // Tambahkan transcription ke conversation
      conversation.messages.push({
        role: 'user',
        content: transcription.text,
      } as ChatCompletionMessageParam);

      // Hapus file sementara
      fs.unlinkSync(tempFilePath);

      // Buat stream dari OpenAI
      const stream = await this.openai.chat.completions.create({
        model:
          audioConversationDto.model ||
          this.configService.get<string>('openai.defaultModel') ||
          'gpt-4o',
        messages: conversation.messages,
        temperature:
          audioConversationDto.temperature ||
          this.configService.get<number>('openai.defaultTemperature') ||
          0.7,
        max_tokens:
          audioConversationDto.maxTokens ||
          this.configService.get<number>('openai.defaultMaxTokens') ||
          2000,
        stream: true,
      });

      let fullResponse = '';

      // Proses stream dan kirim ke subject
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          conversation.subject.next({ content, conversationId: convId });
        }
      }

      // Tambahkan respons asisten ke riwayat percakapan
      conversation.messages.push({
        role: 'assistant',
        content: fullResponse,
      } as ChatCompletionMessageParam);

      // Tandai akhir stream
      conversation.subject.next({ done: true, conversationId: convId });

      // Konversi respons teks ke audio
      const speechFile = path.join(tempDir, `speech-${Date.now()}.mp3`);
      const mp3Response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: fullResponse,
      });

      const buffer2 = Buffer.from(await mp3Response.arrayBuffer());
      fs.writeFileSync(speechFile, buffer2);

      // Baca file audio sebagai base64
      const audioResponse = fs.readFileSync(speechFile);
      const audioBase64Response = `data:audio/mp3;base64,${audioResponse.toString('base64')}`;

      // Hapus file sementara
      fs.unlinkSync(speechFile);

      return {
        conversationId: convId,
        responseText: fullResponse,
        audioResponse: audioBase64Response,
      };
    } catch (error) {
      this.logger.error(
        `Error in audio conversation: ${error.message}`,
        error.stack,
      );
      return { error: error.message, conversationId: convId };
    }
  }
}
