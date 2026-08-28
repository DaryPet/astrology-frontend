import { supabase } from '../lib/supabase';
export interface StreamCallbacks<TFinal> {
  onStage: (stage: string) => void;
  onDelta: (text: string) => void;
  onFinal: (result: TFinal) => void;
  onError: (detail: string) => void;
}

const STREAM_URLS = {
  full: '/api/analysis/full',
  synastry: '/api/analysis/synastry/full',
  progressions: '/api/analysis/progressions',
  transits: '/api/analysis/transits',
  progressedSynastry: '/api/analysis/progressed-synastry',
  planet: '/api/analysis/planet',
  synastryAspect: '/api/synastry/aspect',
  chat: '/api/analysis/chat',
} as const;


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

export function streamFullAnalysis(
  payload: FullAnalysisPayload,
  callbacks: StreamCallbacks<StreamFinalResult>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.full, { ...payload, stream: true }, callbacks, signal);
}


export interface SynastryAnalysisPayload {
  chart1: Record<string, unknown>;
  chart2: Record<string, unknown>;
  aspects?: unknown;
  overlays?: unknown;
  language: string;
  top_k_per_book?: number;
  mode: string;
  relationship_context?: string;
}

export interface SynastryStreamFinal {
  analysis: string;
  chart1_summary?: unknown;
  chart2_summary?: unknown;
  aspects?: unknown;
  overlays?: unknown;
  summary?: string;
  relevant_chunks?: unknown[];
  language?: string;
  relationship_context?: string;
  created_at?: string;
}

export function streamSynastryAnalysis(
  payload: SynastryAnalysisPayload,
  callbacks: StreamCallbacks<SynastryStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.synastry, { ...payload, stream: true }, callbacks, signal);
}


export interface ProgressionsAnalysisPayload {
  natal_chart: Record<string, unknown>;
  progression_data: Record<string, unknown>;
  language: string;
  mode: string;
}

export interface ProgressionsStreamFinal {
  analysis: string;
  progressions_summary?: Record<string, unknown>;
  language?: string;
  version?: string;
}

export function streamProgressionsAnalysis(
  payload: ProgressionsAnalysisPayload,
  callbacks: StreamCallbacks<ProgressionsStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.progressions, { ...payload, stream: true }, callbacks, signal);
}

export interface TransitsAnalysisPayload {
  natal_chart: Record<string, unknown>;
  transit_data: Record<string, unknown>;
  language: string;
  mode: string;
  transit_latitude?: number;
  transit_longitude?: number;
  transit_place?: string;
}

export interface TransitsStreamFinal {
  analysis: string;
  transits_summary?: Record<string, unknown>;
  language?: string;
  version?: string;
}

export function streamTransitsAnalysis(
  payload: TransitsAnalysisPayload,
  callbacks: StreamCallbacks<TransitsStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.transits, { ...payload, stream: true }, callbacks, signal);
}

export interface ProgressedSynastryAnalysisPayload {
  progressed_synastry_data: Record<string, unknown>;
  language: string;
  mode: string;
  relationship_context?: string;
}

export interface ProgressedSynastryStreamFinal {
  analysis: string;
  progressed_synastry_summary?: Record<string, unknown>;
  language?: string;
  version?: string;
}

export function streamProgressedSynastryAnalysis(
  payload: ProgressedSynastryAnalysisPayload,
  callbacks: StreamCallbacks<ProgressedSynastryStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.progressedSynastry, { ...payload, stream: true }, callbacks, signal);
}

export interface PlanetAnalysisPayload {
  planet: string;
  sign?: string;
  degree?: number;
  house?: number;
  house_sign?: string;
  is_retrograde?: boolean;
  aspects?: unknown;
  language: string;
  chart_data?: Record<string, unknown>;
  mode: string;
}

export interface PlanetAnalysisStreamFinal {
  planet: string;
  sign?: string;
  house?: number;
  is_retrograde?: boolean;
  analysis: string;
  relevant_chunks?: unknown[];
}

export function streamPlanetAnalysis(
  payload: PlanetAnalysisPayload,
  callbacks: StreamCallbacks<PlanetAnalysisStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.planet, { ...payload, stream: true }, callbacks, signal);
}

export interface SynastryAspectPayload {
  planet1: string;
  planet2: string;
  aspect_name: string;
  aspect_name_ru?: string;
  orb?: number;
  language: string;
  mode: string;
}

export interface SynastryAspectStreamFinal {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string;
  orb?: number;
  analysis: string;
  relevant_chunks?: unknown[];
}

export function streamSynastryAspectAnalysis(
  payload: SynastryAspectPayload,
  callbacks: StreamCallbacks<SynastryAspectStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.synastryAspect, { ...payload, stream: true }, callbacks, signal);
}

export interface ChatAnalysisPayload {
  question: string;
  chart_data?: Record<string, unknown>;
  summary?: string;
  chat_history?: unknown[];
  language: string;
  relationship_context?: string;
}

export interface ChatStreamFinal {
  answer: string;
  relevant_chunks?: unknown[];
}

export function streamChatAnalysis(
  payload: ChatAnalysisPayload,
  callbacks: StreamCallbacks<ChatStreamFinal>,
  signal?: AbortSignal,
): Promise<void> {
  return streamAnalysis(STREAM_URLS.chat, { ...payload, stream: true }, callbacks, signal);
}

async function streamAnalysis<TFinal>(
  url: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks<TFinal>,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
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

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    try {
      const data = await response.json();
      callbacks.onFinal(data as TFinal);
    } catch (err) {
      callbacks.onError((err as Error).message || 'Invalid JSON response');
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let terminalReceived = false;
  const trackedCallbacks: StreamCallbacks<TFinal> = {
    ...callbacks,
    onFinal: (result) => {
      terminalReceived = true;
      callbacks.onFinal(result);
    },
    onError: (detail) => {
      terminalReceived = true;
      callbacks.onError(detail);
    },
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        dispatchBlock(block, trackedCallbacks);
        separatorIndex = buffer.indexOf('\n\n');
      }
    }
    if (!terminalReceived) {
      callbacks.onError('Stream ended unexpectedly without a final result');
    }
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return;
    callbacks.onError((err as Error).message || 'Stream read error');
  }
}

function dispatchBlock<TFinal>(block: string, callbacks: StreamCallbacks<TFinal>): void {
  let eventType = '';
  let dataText = '';

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
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
    callbacks.onFinal(data as unknown as TFinal);
    break;
  case 'error':
    callbacks.onError(typeof data.detail === 'string' ? data.detail : 'Unknown error');
    break;
  default:
    break;
  }
}
