// src/services/chatStorage.ts
// localStorage for FREE plan

export const MAX_MESSAGES = 50; // limit for chat (FREE)
const CHAT_PREFIX = 'chat_';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  relevant_chunks?: unknown[];
}

export const saveChatHistory = (chartId: string | number, messages: ChatMessage[]): void => {
  if (!chartId) return;
  const limited = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(`${CHAT_PREFIX}${chartId}`, JSON.stringify(limited));
};

export const loadChatHistory = (chartId: string | number): ChatMessage[] => {
  if (!chartId) return [];
  try {
    const raw = localStorage.getItem(`${CHAT_PREFIX}${chartId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearChatHistory = (chartId: string | number): void => {
  if (!chartId) return;
  localStorage.removeItem(`${CHAT_PREFIX}${chartId}`);
};

// Helpers to check chat length against limits
export const isNearLimit = (messages: ChatMessage[]): boolean => messages.length >= MAX_MESSAGES - 2;
export const isAtLimit = (messages: ChatMessage[]): boolean => messages.length >= MAX_MESSAGES;