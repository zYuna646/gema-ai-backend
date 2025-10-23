import { registerAs } from '@nestjs/config';

export interface OpenAIConfigParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  realtimeModel?: string;
  realtimeVoice?: string;
  realtimeInputAudioFormat?: string;
  realtimeInputAudioSampleRate?: number;
  realtimeOutputAudioFormat?: string;
}

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
  defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
  defaultTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
  realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
  realtimeVoice: process.env.OPENAI_REALTIME_VOICE || 'alloy',
  realtimeInputAudioFormat: process.env.OPENAI_REALTIME_INPUT_FORMAT || 'pcm16',
  realtimeInputAudioSampleRate: parseInt(
    process.env.OPENAI_REALTIME_INPUT_SAMPLE_RATE || '16000',
    10,
  ),
  realtimeOutputAudioFormat:
    process.env.OPENAI_REALTIME_OUTPUT_FORMAT || 'pcm16',
}));
