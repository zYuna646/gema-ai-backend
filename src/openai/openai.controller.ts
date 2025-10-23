import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OpenaiService } from './openai.service';
import { CreateOpenaiDto } from './dto/create-openai.dto';
import { MessageDto } from './dto/message.dto';
import { AudioRequestDto } from './dto/audio-request.dto';
import { Observable } from 'rxjs';

@Controller()
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  @MessagePattern('openai.start_conversation')
  startConversation(@Payload() createOpenaiDto: CreateOpenaiDto) {
    return this.openaiService.startConversation(createOpenaiDto);
  }

  @MessagePattern('openai.get_stream')
  getStream(@Payload() conversationId: string): Observable<any> {
    return this.openaiService.getResponseStream(conversationId);
  }

  @MessagePattern('openai.send_message')
  sendMessage(@Payload() messageDto: MessageDto) {
    return this.openaiService.sendMessage(messageDto);
  }

  @MessagePattern('openai.transcribe_audio')
  transcribeAudio(@Payload() audioRequestDto: AudioRequestDto) {
    return this.openaiService.transcribeAudio(audioRequestDto);
  }

  @MessagePattern('openai.text_to_speech')
  textToSpeech(@Payload() data: { text: string }) {
    return this.openaiService.textToSpeech(data.text);
  }

  @MessagePattern('openai.get_models')
  getModels() {
    return this.openaiService.getAvailableModels();
  }
}
