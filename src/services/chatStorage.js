// src/services/chatStorage.js
// localStorage for FREE plan

export const MAX_MESSAGES = 50;       // limit for  chat (FREE)
const CHAT_PREFIX = 'chat_';

// Save chat history
export const saveChatHistory = (chartId, messages) => {
  if (!chartId) return;
  const limited = messages.slice(-MAX_MESSAGES); // only the last 20
  localStorage.setItem(`${CHAT_PREFIX}${chartId}`, JSON.stringify(limited));
};

// Load chat history
export const loadChatHistory = (chartId) => {
  if (!chartId) return [];
  try {
    const raw = localStorage.getItem(`${CHAT_PREFIX}${chartId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Clear chat history for a specific chart
export const clearChatHistory = (chartId) => {
  if (!chartId) return;
  localStorage.removeItem(`${CHAT_PREFIX}${chartId}`);
};

// Clear ALL chats (on logout)
// export const clearAllChats = () => {
//   Object.keys(localStorage)
//     .filter(key => key.startsWith(CHAT_PREFIX))
//     .forEach(key => localStorage.removeItem(key));
// };

// Helpers to check chat length against limits
export const isNearLimit = (messages) => messages.length >= MAX_MESSAGES - 2; // true on the 18th message
export const isAtLimit = (messages) => messages.length >= MAX_MESSAGES;        // true on the 20th message