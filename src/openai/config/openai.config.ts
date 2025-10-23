import { registerAs } from '@nestjs/config';

export interface OpenAIConfigParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export default registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
  defaultModel: process.env.OPENAI_MODEL || 'gpt-4o',
  defaultTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
}));
