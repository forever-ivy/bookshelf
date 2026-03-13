import { createHttpClient } from '@/lib/api/core/http';
import { z } from 'zod';

const chatHistorySchema = z.object({
  current_user: z.unknown().nullable().optional(),
  history: z.array(
    z.object({
      content: z.string(),
      is_bot: z.boolean().optional(),
      role: z.string(),
    })
  ),
  ok: z.boolean().optional(),
});

const ttsSchema = z.object({
  audio_b64: z.string().optional(),
  audio_format: z.string().optional(),
});

export function createVoiceChatApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    chat(text: string) {
      return http.post('/api/chat', {
        data: { text },
      });
    },
    clearChat(userId?: number | null) {
      return http.post<null>('/api/chat/clear', {
        data: { user_id: userId ?? null },
      });
    },
    getChatHistory() {
      return http.get('/api/chat/history', { schema: chatHistorySchema });
    },
    getVoiceEvents() {
      return http.get('/api/voice_events');
    },
    notifyBooklist(payload: { book_title: string; child_name: string; note?: string }) {
      return http.post<null>('/api/booklist/notify', {
        data: payload,
      });
    },
    ttsSay(text: string) {
      return http.post('/api/tts_say', {
        data: { text },
        schema: ttsSchema,
      });
    },
    voiceChat() {
      return http.post('/api/voice_chat');
    },
    voiceIngest(formData: FormData, options?: { mode?: string; source?: string }) {
      return http.post('/api/voice/ingest', {
        data: formData,
        params: {
          mode: options?.mode ?? 'command',
          source: options?.source ?? 'app',
        },
      });
    },
  };
}
