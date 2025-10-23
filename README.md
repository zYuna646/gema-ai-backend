<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## OpenAI Integration

This application provides comprehensive OpenAI integration through both REST API microservices and real-time WebSocket connections.

### Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# OpenAI Realtime Configuration
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_REALTIME_VOICE=alloy
OPENAI_REALTIME_INPUT_FORMAT=pcm16
OPENAI_REALTIME_INPUT_SAMPLE_RATE=16000
OPENAI_REALTIME_OUTPUT_FORMAT=pcm16

# JWT Configuration (for authentication)
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h
```

### OpenAI Realtime Gateway (WebSocket API)

The OpenAI Realtime Gateway provides real-time audio and text communication with OpenAI's GPT models through WebSocket connections.

#### Connection

Connect to the WebSocket endpoint:
```
ws://localhost:3000/ws/openai
```

#### Authentication

Authentication is optional but recommended. You can authenticate using JWT token in two ways:

1. **Query Parameter:**
```javascript
const socket = io('ws://localhost:3000/ws/openai', {
  query: { token: 'your-jwt-token' }
});
```

2. **Auth Object:**
```javascript
const socket = io('ws://localhost:3000/ws/openai', {
  auth: { token: 'your-jwt-token' }
});
```

#### Connection Parameters

You can customize the OpenAI session with query parameters:

- `voice`: Voice type (alloy, echo, fable, onyx, nova, shimmer) - default: 'alloy'
- `model`: OpenAI model - default: 'gpt-4o-realtime-preview'
- `format`: Audio input format - default: 'pcm16'
- `sr`: Audio sample rate - default: 16000

Example:
```javascript
const socket = io('ws://localhost:3000/ws/openai', {
  query: { 
    voice: 'nova',
    model: 'gpt-4o-realtime-preview',
    format: 'pcm16',
    sr: 16000
  }
});
```

#### WebSocket Events

##### Client to Server Events

**1. `audio_chunk`** - Send audio data
```javascript
// Send audio chunk (base64 encoded)
socket.emit('audio_chunk', audioBase64Data);
```

**2. `stop`** - Commit/stop audio recording
```javascript
// Stop recording and process audio
socket.emit('stop');
```

**3. `input_text`** - Send text message
```javascript
// Send text input
socket.emit('input_text', { text: 'Hello, how are you?' });
```

**4. `end`** - End the session
```javascript
// End the OpenAI session
socket.emit('end');
```

##### Server to Client Events

**1. `ready`** - Connection established
```javascript
socket.on('ready', (data) => {
  console.log('OpenAI ready:', data.model, data.voice);
});
```

**2. `response_text`** - Text response from OpenAI
```javascript
socket.on('response_text', (data) => {
  console.log('Text response:', data);
});
```

**3. `response_audio_base64`** - Audio response from OpenAI
```javascript
socket.on('response_audio_base64', (data) => {
  console.log('Audio response:', data);
  // data contains base64 encoded audio
});
```

**4. `response_done`** - Response completed
```javascript
socket.on('response_done', (data) => {
  console.log('Response completed:', data);
});
```

**5. `error`** - Error occurred
```javascript
socket.on('error', (error) => {
  console.error('OpenAI error:', error);
});
```

**6. `end`** - Session ended
```javascript
socket.on('end', () => {
  console.log('OpenAI session ended');
});
```

#### Complete WebSocket Client Example

```javascript
import { io } from 'socket.io-client';

// Connect with authentication and custom settings
const socket = io('ws://localhost:3000/ws/openai', {
  auth: { token: 'your-jwt-token' },
  query: { 
    voice: 'nova',
    model: 'gpt-4o-realtime-preview'
  }
});

// Handle connection events
socket.on('ready', (data) => {
  console.log('Connected to OpenAI:', data);
});

socket.on('response_text', (data) => {
  console.log('Text response:', data);
});

socket.on('response_audio_base64', (data) => {
  // Play audio response
  const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
  audio.play();
});

socket.on('response_done', (data) => {
  console.log('Response completed');
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

// Send text message
function sendText(message) {
  socket.emit('input_text', { text: message });
}

// Send audio (example with MediaRecorder)
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        socket.emit('audio_chunk', base64);
      };
      reader.readAsDataURL(event.data);
    }
  };
  
  mediaRecorder.start(100); // Send chunks every 100ms
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    socket.emit('stop');
  }
}
```

### OpenAI Microservice (REST API)

The OpenAI microservice provides REST API endpoints for various OpenAI operations through TCP microservice communication.

#### Available Endpoints

**1. Start Conversation**
- **Pattern:** `openai.start_conversation`
- **Description:** Start a new conversation with OpenAI
- **Payload:**
```typescript
{
  conversationId?: string; // Optional UUID
  message: string;         // Required message
  model?: string;          // Optional model (default: gpt-4o)
  temperature?: number;    // Optional (0.0-1.0, default: 0.7)
  maxTokens?: number;      // Optional (default: 2000)
}
```

**2. Send Message**
- **Pattern:** `openai.send_message`
- **Description:** Send a message to existing conversation
- **Payload:**
```typescript
{
  conversationId: string;  // Required UUID
  content: string;         // Required message content
  model?: string;          // Optional model
  temperature?: number;    // Optional temperature
  maxTokens?: number;      // Optional max tokens
}
```

**3. Get Response Stream**
- **Pattern:** `openai.get_stream`
- **Description:** Get streaming response for a conversation
- **Payload:** `string` (conversationId)
- **Returns:** `Observable<any>` - Streaming response

**4. Transcribe Audio**
- **Pattern:** `openai.transcribe_audio`
- **Description:** Transcribe audio to text using Whisper
- **Payload:**
```typescript
{
  conversationId?: string; // Optional UUID
  audioBase64: string;     // Required base64 audio data
  model?: string;          // Optional model
  temperature?: number;    // Optional temperature
  maxTokens?: number;      // Optional max tokens
}
```

**5. Text to Speech**
- **Pattern:** `openai.text_to_speech`
- **Description:** Convert text to speech
- **Payload:**
```typescript
{
  text: string;           // Required text to convert
}
```

**6. Get Available Models**
- **Pattern:** `openai.get_models`
- **Description:** Get list of available OpenAI models
- **Payload:** None

**7. Audio Conversation**
- **Pattern:** `openai.audio_conversation`
- **Description:** Complete audio conversation (transcribe + chat + TTS)
- **Payload:**
```typescript
{
  conversationId?: string; // Optional UUID
  audioBase64: string;     // Required base64 audio data
  model?: string;          // Optional model
  temperature?: number;    // Optional temperature
  maxTokens?: number;      // Optional max tokens
}
```

#### Microservice Client Example

```typescript
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

// Create microservice client
const client: ClientProxy = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: {
    host: 'localhost',
    port: 3001,
  },
});

// Start conversation
const startConversation = async () => {
  const result = await client.send('openai.start_conversation', {
    message: 'Hello, how can you help me?',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000
  }).toPromise();
  
  console.log('Conversation started:', result);
  return result.conversationId;
};

// Send message to existing conversation
const sendMessage = async (conversationId: string) => {
  const result = await client.send('openai.send_message', {
    conversationId,
    content: 'Tell me about NestJS',
    model: 'gpt-4o'
  }).toPromise();
  
  console.log('Message sent:', result);
};

// Get streaming response
const getStream = (conversationId: string) => {
  return client.send('openai.get_stream', conversationId);
};

// Transcribe audio
const transcribeAudio = async (audioBase64: string) => {
  const result = await client.send('openai.transcribe_audio', {
    audioBase64,
    model: 'gpt-4o'
  }).toPromise();
  
  console.log('Transcription:', result);
  return result;
};

// Text to speech
const textToSpeech = async (text: string) => {
  const result = await client.send('openai.text_to_speech', {
    text
  }).toPromise();
  
  console.log('Audio generated:', result);
  return result;
};

// Complete audio conversation
const audioConversation = async (audioBase64: string) => {
  const result = await client.send('openai.audio_conversation', {
    audioBase64,
    model: 'gpt-4o',
    temperature: 0.7
  }).toPromise();
  
  console.log('Audio conversation result:', result);
  return result;
};
```

### Message Recording

Both the WebSocket gateway and microservice automatically record messages to the database when users are authenticated. Messages include:

- **User messages:** Text and transcribed audio input
- **AI responses:** Text responses and transcribed audio responses
- **Metadata:** User ID, timestamp, AI flag, content type

The system uses OpenAI's Whisper model for audio transcription to ensure accurate message content recording.

### Error Handling

Both services include comprehensive error handling:

- **Authentication errors:** Invalid or missing JWT tokens
- **OpenAI API errors:** Rate limits, invalid requests, API failures
- **Connection errors:** WebSocket disconnections, network issues
- **Transcription errors:** Audio format issues, processing failures

All errors are logged and appropriate error responses are sent to clients.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
