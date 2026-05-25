import { Router } from 'express';
import { mountChatCompletions } from './chat-completions';

const router = Router();

/** OpenAI-compatible path: POST /beta/chat/completions (same behavior as POST /api/chat/completions) */
mountChatCompletions(router, '/chat/completions');

export default router;
