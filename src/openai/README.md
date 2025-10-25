# OpenAI Microservice

Modul ini menyediakan integrasi lengkap dengan OpenAI melalui microservice TCP dan koneksi WebSocket real-time.

## Fitur Utama

- Percakapan teks dengan OpenAI (Chat Completions)
- Transcribe audio menggunakan Whisper
- Text-to-Speech menggunakan TTS
- Komunikasi real-time melalui WebSocket
- Dukungan untuk mode/konteks kustom
- Streaming respons untuk pengalaman pengguna yang lebih baik

## Arsitektur

Modul ini terdiri dari dua komponen utama:

1. **OpenAI REST Microservice** - Menyediakan endpoint TCP untuk operasi OpenAI
2. **OpenAI Realtime Gateway** - Menyediakan koneksi WebSocket untuk komunikasi real-time

## OpenAI REST Microservice

### Endpoint yang Tersedia

| Pattern | Deskripsi | Payload |
|---------|-----------|---------|
| `openai.start_conversation` | Memulai percakapan baru | `CreateOpenaiDto` |
| `openai.send_message` | Mengirim pesan ke percakapan yang ada | `MessageDto` |
| `openai.get_stream` | Mendapatkan stream respons | `string` (conversationId) |
| `openai.transcribe_audio` | Transcribe audio ke teks | `AudioRequestDto` |
| `openai.text_to_speech` | Konversi teks ke audio | `{ text: string }` |
| `openai.get_models` | Mendapatkan daftar model OpenAI | - |
| `openai.audio_conversation` | Percakapan lengkap dengan audio | `AudioConversationDto` |

### Contoh Penggunaan

```typescript
// Memulai percakapan
const result = await client.send('openai.start_conversation', {
  message: 'Halo, bagaimana kabarmu?',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000
}).toPromise();

// Mendapatkan ID percakapan
const conversationId = result.conversationId;

// Mengirim pesan ke percakapan yang ada
await client.send('openai.send_message', {
  conversationId,
  content: 'Ceritakan tentang NestJS',
  model: 'gpt-4o'
}).toPromise();

// Mendapatkan stream respons
const responseStream = client.send('openai.get_stream', conversationId);
responseStream.subscribe(chunk => {
  console.log('Respons:', chunk.content);
});

// Transcribe audio
const transcription = await client.send('openai.transcribe_audio', {
  audioBase64: base64Audio,
  model: 'gpt-4o'
}).toPromise();

// Text-to-Speech
const audioResult = await client.send('openai.text_to_speech', {
  text: 'Halo, ini adalah teks yang dikonversi menjadi audio'
}).toPromise();
```

## OpenAI Realtime Gateway (WebSocket)

Gateway WebSocket menyediakan komunikasi real-time dengan OpenAI, termasuk dukungan untuk audio dan teks.

### Koneksi

```javascript
const socket = io('ws://localhost:3000/ws/openai', {
  query: { 
    voice: 'nova',
    model: 'gpt-4o-realtime-preview',
    format: 'pcm16',
    sr: 16000,
    mode_id: 'your-mode-id' // Opsional: Gunakan pengaturan mode tertentu
  }
});
```

### Parameter Koneksi

- `voice`: Jenis suara (alloy, echo, fable, onyx, nova, shimmer) - default: 'alloy'
- `model`: Model OpenAI - default: 'gpt-4o-realtime-preview'
- `format`: Format input audio - default: 'pcm16'
- `sr`: Sample rate audio - default: 16000
- `mode_id`: ID mode untuk menggunakan pengaturan mode tertentu (opsional)

### Event dari Client ke Server

| Event | Deskripsi | Payload |
|-------|-----------|---------|
| `audio_chunk` | Mengirim potongan audio | `string` (base64) |
| `stop` | Menghentikan rekaman audio | - |
| `input_text` | Mengirim pesan teks | `{ text: string }` |
| `end` | Mengakhiri sesi | - |

### Event dari Server ke Client

| Event | Deskripsi | Payload |
|-------|-----------|---------|
| `ready` | Koneksi siap | `{ model: string, voice: string }` |
| `response_text` | Respons teks | `{ text: string }` |
| `response_audio_base64` | Respons audio | `{ audio: string }` |
| `response_done` | Respons selesai | `{ ... }` |
| `error` | Terjadi kesalahan | `{ message: string }` |
| `end` | Sesi berakhir | - |

### Contoh Penggunaan

```javascript
// Menangani event koneksi
socket.on('ready', (data) => {
  console.log('Terhubung ke OpenAI:', data);
});

// Menangani respons teks
socket.on('response_text', (data) => {
  console.log('Respons teks:', data);
});

// Menangani respons audio
socket.on('response_audio_base64', (data) => {
  // Putar audio respons
  const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
  audio.play();
});

// Mengirim pesan teks
socket.emit('input_text', { text: 'Halo, bagaimana kabarmu?' });

// Mengirim potongan audio
socket.emit('audio_chunk', base64AudioData);

// Menghentikan rekaman audio
socket.emit('stop');

// Mengakhiri sesi
socket.emit('end');
```

## Konfigurasi

Konfigurasi OpenAI diatur melalui variabel lingkungan:

```
# Konfigurasi OpenAI
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Konfigurasi OpenAI Realtime
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_REALTIME_VOICE=alloy
OPENAI_REALTIME_INPUT_FORMAT=pcm16
OPENAI_REALTIME_INPUT_SAMPLE_RATE=16000
OPENAI_REALTIME_OUTPUT_FORMAT=pcm16
```

## Pencatatan Pesan

Kedua layanan secara otomatis mencatat pesan ke database ketika pengguna diautentikasi. Pesan mencakup:

- Pesan pengguna: Input teks dan audio yang ditranskripsikan
- Respons AI: Respons teks dan respons audio yang ditranskripsikan
- Metadata: ID pengguna, timestamp, flag AI, jenis konten

## Penanganan Kesalahan

Kedua layanan mencakup penanganan kesalahan komprehensif:

- Kesalahan autentikasi: Token JWT tidak valid atau hilang
- Kesalahan API OpenAI: Batas rate, permintaan tidak valid, kegagalan API
- Kesalahan koneksi: Pemutusan WebSocket, masalah jaringan
- Kesalahan transkripsi: Masalah format audio, kegagalan pemrosesan