// src/services/chatStorage.ts
// Chat storage constants and helpers

export const MAX_MESSAGES = 50; // limit for chat (FREE)

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  relevant_chunks?: unknown[];
}

// Helpers to check chat length against limits
export const isNearLimit = (messages: ChatMessage[]): boolean => messages.length >= MAX_MESSAGES - 2;
export const isAtLimit = (messages: ChatMessage[]): boolean => messages.length >= MAX_MESSAGES;