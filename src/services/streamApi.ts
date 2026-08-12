// SSE-клиент для стримингового натального анализа (`POST /analysis/full` c `stream: true`).
// Пишется руками, без новых зависимостей — см. plans/streaming-analysis-frontend.md.
// axios стримить ответ в браузере не умеет, поэтому здесь fetch; существующий
// axios-путь (src/services/api.ts) не трогаем, он остаётся рабочим fallback'ом.
import { supabase } from '../lib/supabase';

// Тело запроса — то же, что уходит из astrologyAPI.getFullChartAnalysis (api.ts),
// плюс флаг stream.
export interface FullAnalysisPayload {
  chart_data: Record<string, unknown>;
  language: string;
  top_books?: number;
  mode: string;
  birth_date?: string | null;
  birth_place?: string | null;
}

export interface StreamFinalResult {
  analysis: string;
  language: string;
  version: string;
}

export interface StreamCallbacks {
  onStage: (stage: string) => void;
  onDelta: (text: string) => void;
  onFinal: (result: StreamFinalResult) => void;
  onError: (detail: string) => void;
}

const STREAM_URL = '/api/analysis/full';

export async function streamFullAnalysis(
  payload: FullAnalysisPayload,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    // Тот же источник токена, что у axios-инстанса (api.ts): живая сессия
    // Supabase, а не ручная копия из localStorage.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    response = await fetch(STREAM_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return;
    callbacks.onError((err as Error).message || 'Network error');
    return;
  }

  if (!response.ok || !response.body) {
    callbacks.onError(`HTTP ${response.status}`);
    return;
  }

  // Бекенд не всегда стримит: на кэш-попадании (тот же chart_data+mode+language
  // уже считался недавно) он отвечает обычным JSON без единого SSE-блока —
  // тогда парсер ниже (ждёт "\n\n") ни разу не сработает, ни один колбэк не
  // вызовется, и вызывающий код зависнет в состоянии загрузки. Ловим это по
  // content-type и завершаем сразу через onFinal, не трогая ридер потока.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    try {
      const data = await response.json();
      callbacks.onFinal(data as StreamFinalResult);
    } catch (err) {
      callbacks.onError((err as Error).message || 'Invalid JSON response');
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        dispatchBlock(block, callbacks);
        separatorIndex = buffer.indexOf('\n\n');
      }
      // Неполный блок остаётся в buffer до следующего чанка.
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return;
    callbacks.onError((err as Error).message || 'Stream read error');
  }
}

// Разбирает один SSE-блок вида "event: <type>\ndata: <json>" и диспетчеризует в колбэки.
function dispatchBlock(block: string, callbacks: StreamCallbacks): void {
  let eventType = '';
  let dataText = '';

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    // Heartbeat-комментарии бекенда (`: ping`) — стандартные SSE-комментарии,
    // держат соединение живым во время долгих пауз (например, на стадии
    // "searching"); это не данные, молча пропускаем.
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataText += line.slice('data:'.length).trim();
    }
  }

  if (!eventType || !dataText) return;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataText);
  } catch {
    return;
  }

  switch (eventType) {
  case 'stage':
    if (typeof data.stage === 'string') callbacks.onStage(data.stage);
    break;
  case 'delta':
    if (typeof data.text === 'string') callbacks.onDelta(data.text);
    break;
  case 'final':
    callbacks.onFinal(data as unknown as StreamFinalResult);
    break;
  case 'error':
    callbacks.onError(typeof data.detail === 'string' ? data.detail : 'Unknown error');
    break;
  default:
    break;
  }
}
