import { useCallback, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { chartsApi, type ChatContextType } from '../services/chartsApi';
import { astrologyAPI } from '../services/api';
import { streamChatAnalysis } from '../services/streamApi';
import { useStreamedText } from './useStreamedText';
import { isInFlight, markInFlight, clearInFlight, waitForClear } from '../utils/inFlightRegistry';
import { appendStreamText, getStreamText, clearStreamText } from '../utils/streamTextRegistry';
import type { ChatMessage } from '../services/chatStorage';
import { logger } from '../utils/logger';

interface SendParams {
  chartId: number | string;
  userId: string;
  chartData: Record<string, unknown>;
  summary: string;
  language: string;
}

/**
 * One independent chat thread scoped to a (chart, contextType) pair — same
 * send/persist/reconnect semantics as the natal chat
 * (Dashboard.tsx's sendChatMessage/loadChatForChart: save on onFinal, not
 * on the typewriter finishing; ref-guarded reconnect replay), generalized
 * so the progressions and progressed-synastry threads share one
 * implementation instead of two more hand-copied ones — see
 * openspec/changes/add-progressions-chat/design.md. The natal thread
 * itself is intentionally left as-is in Dashboard.tsx (already shipped,
 * already exercised) rather than migrated onto this hook.
 *
 * `savedChartIdRef` must be the same ref the caller updates on every
 * `savedChartId` change (`savedChartIdRef.current = savedChartId` in a
 * `useEffect`) — used to detect the user having switched to a different
 * chart while an answer for this one is still in flight.
 */
export function useChatThread(contextType: ChatContextType, savedChartIdRef: RefObject<string | number | null>) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  // Same shape as the natal chat's pendingChatCharts: a chart whose answer
  // is still generating in the background stays marked here even after
  // switching to a different chart, so returning to it shows "still
  // loading" rather than a stale idle state.
  const [pendingChartIds, setPendingChartIds] = useState<Set<number>>(new Set());
  const stream = useStreamedText(() => {});

  // Same reentrancy guard as the natal chat's chatResumeInFlightRef —
  // without it, a double-invoked load() (React.StrictMode, a second visit
  // before the first resume settled) starts two independent replay loops
  // into the one shared `stream`, interleaving text.
  const resumeInFlightRef = useRef<Record<string, boolean>>({});

  const reset = useCallback(() => {
    setHistory([]);
    setInput('');
    setVisible(false);
  }, []);

  const load = useCallback(async (chartIdRaw: number | string) => {
    const chartId = Number(chartIdRaw);
    try {
      const dbMessages = await chartsApi.getChatMessages(chartId, contextType);
      if (Number(savedChartIdRef.current) !== chartId) return;
      setHistory(dbMessages as ChatMessage[]);
    } catch (err) {
      logger.error(`Failed to load ${contextType} chat history:`, err);
    }

    // A question sent before a Dashboard remount (navigating away and back)
    // may still be answering in the background — reconnect instead of
    // leaving the chat panel looking dead. Same pattern as the natal
    // chat's loadChatForChart.
    const registryKey = `chat:${contextType}:${chartId}`;
    if (!isInFlight(registryKey)) return;
    if (resumeInFlightRef.current[registryKey]) return;
    resumeInFlightRef.current[registryKey] = true;

    setPendingChartIds(prev => new Set(prev).add(chartId));
    stream.reset();

    let seenLength = 0;
    const replay = () => {
      if (Number(savedChartIdRef.current) !== chartId) return;
      const current = getStreamText(registryKey);
      if (current.length > seenLength) {
        stream.handleDelta(current.slice(seenLength));
        seenLength = current.length;
      }
    };
    replay();
    const replayInterval = window.setInterval(replay, 400);

    waitForClear(registryKey, async () => {
      window.clearInterval(replayInterval);
      delete resumeInFlightRef.current[registryKey];
      try {
        const dbMessages = await chartsApi.getChatMessages(chartId, contextType);
        if (Number(savedChartIdRef.current) === chartId) {
          setHistory(dbMessages as ChatMessage[]);
        }
      } catch (err) {
        logger.error(`Failed to reload ${contextType} chat history:`, err);
      } finally {
        setPendingChartIds(prev => {
          const next = new Set(prev);
          next.delete(chartId);
          return next;
        });
      }
    }, {
      // Chat answers normally take seconds, not minutes — 5 minutes is a
      // generous ceiling so a real answer never gets cut off, while still
      // giving up instead of spinning forever if something went wrong.
      intervalMs: 5000,
      maxAttempts: 60,
      onTimeout: () => {
        window.clearInterval(replayInterval);
        delete resumeInFlightRef.current[registryKey];
        setPendingChartIds(prev => {
          const next = new Set(prev);
          next.delete(chartId);
          return next;
        });
        if (Number(savedChartIdRef.current) === chartId) {
          setHistory(prev => [...prev, {
            role: 'assistant' as const,
            content: t('dashboard.chat.timeout'),
          }]);
        }
      },
    });
  }, [contextType, savedChartIdRef, stream, t]);

  const send = useCallback((params: SendParams) => {
    const chartId = Number(params.chartId);
    if (pendingChartIds.has(chartId)) return;
    const question = input.trim();
    if (!question) return;

    const registryKey = `chat:${contextType}:${chartId}`;
    const currentHistory = [...history];
    const userMessage = { role: 'user' as const, content: question };
    setHistory(prev => [...prev, userMessage]);
    chartsApi.appendChatMessages(chartId, params.userId, contextType, [userMessage]).catch(err => {
      logger.error(`Failed to save ${contextType} chat message:`, err);
    });
    setInput('');

    setPendingChartIds(prev => new Set(prev).add(chartId));

    const chatPayload = {
      question,
      chart_data: params.chartData,
      summary: params.summary,
      chat_history: currentHistory,
      language: params.language,
    };

    const finishPending = () => {
      clearStreamText(registryKey);
      clearInFlight(registryKey);
      setPendingChartIds(prev => {
        const next = new Set(prev);
        next.delete(chartId);
        return next;
      });
    };

    // Defensive: a buffer left over from an earlier request that never
    // reached finishPending() must not bleed into this new question's
    // deltas — same defensive clear the natal chat does.
    clearStreamText(registryKey);
    markInFlight(registryKey);
    stream.reset();

    streamChatAnalysis(
      chatPayload,
      {
        onStage: stream.handleStage,
        onDelta: (text: string) => {
          appendStreamText(registryKey, text);
          stream.handleDelta(text);
        },
        onFinal: (result) => {
          // Save + clear the instant the real result is known, not once the
          // on-screen typewriter visually catches up — that effect gets
          // cancelled if this component unmounts first (leaving the chart
          // before the answer finished typing), and onDone would never fire.
          stream.handleFinal(result.answer);
          const botMessage = {
            role: 'assistant' as const,
            content: result.answer || t('dashboard.chat.noAnswer'),
            relevant_chunks: result.relevant_chunks || [],
          };
          chartsApi.appendChatMessages(chartId, params.userId, contextType, [botMessage])
            .catch(err => {
              logger.error(`Failed to save ${contextType} chat message:`, err);
            })
            .finally(finishPending);
          if (Number(savedChartIdRef.current) === chartId) {
            setHistory(prev => [...prev, botMessage]);
          }
        },
        onError: async (detail) => {
          if (!stream.hasDelta()) {
            try {
              const response = await astrologyAPI.chatAnalysis(chatPayload);
              const botMessage = {
                role: 'assistant' as const,
                content: (response as { data?: { answer?: string; relevant_chunks?: unknown[] } })?.data?.answer || t('dashboard.chat.noAnswer'),
                relevant_chunks: (response as { data?: { relevant_chunks?: unknown[] } })?.data?.relevant_chunks || [],
              };
              chartsApi.appendChatMessages(chartId, params.userId, contextType, [botMessage]).catch(err => {
                logger.error(`Failed to save ${contextType} chat message:`, err);
              });
              if (Number(savedChartIdRef.current) === chartId) {
                setHistory(prev => [...prev, botMessage]);
              }
            } catch (error) {
              if (Number(savedChartIdRef.current) === chartId) {
                setHistory(prev => [...prev, {
                  role: 'assistant' as const,
                  content: t('dashboard.chat.errorWithDetails', { error: (error as Error).message }),
                }]);
              }
            } finally {
              finishPending();
            }
            return;
          }
          stream.handleError();
          if (Number(savedChartIdRef.current) === chartId) {
            setHistory(prev => [...prev, {
              role: 'assistant' as const,
              content: t('dashboard.chat.errorWithDetails', { error: detail }),
            }]);
          }
          finishPending();
        },
      }
    );
  }, [contextType, history, input, pendingChartIds, savedChartIdRef, stream, t]);

  return {
    history,
    input,
    setInput,
    visible,
    setVisible,
    pendingChartIds,
    stream,
    send,
    load,
    reset,
  };
}
