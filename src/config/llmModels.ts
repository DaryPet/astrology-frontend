// src/config/llmModels.ts
// Модели для «Прогноза дня». provider = ключ адаптера на бекенде
// (claude/deepseek/gemini — существующие, openrouter — новый, model обязателен).
export interface LLMModelOption {
  provider: string;
  model: string | null;
  label: string;
}

export const LLM_MODELS: LLMModelOption[] = [
  { provider: 'claude',     model: null,                          label: 'Claude (Anthropic)' },
  { provider: 'openrouter', model: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet (OpenRouter)' },
  { provider: 'openrouter', model: 'openai/gpt-4o-mini',          label: 'GPT-4o mini (OpenRouter)' },
  { provider: 'openrouter', model: 'google/gemini-2.5-flash',     label: 'Gemini Flash (OpenRouter)' },
  { provider: 'deepseek',   model: null,                          label: 'DeepSeek' },
];

export const DEFAULT_LLM = LLM_MODELS[0];
