// type AnalysisKey = string;

// interface PendingAnalysis {
//   promise: Promise<{ analysis: string }>;
//   abortCtrl: AbortController;
// }

// const analysisCache = new Map<AnalysisKey, PendingAnalysis>();

// export function getFullAnalysis(
//   chartData: Record<string, unknown>,
//   mode: 'simple' | 'advanced',
//   language: string,
//   opts?: { signal?: AbortSignal }
// ): Promise<{ analysis: string }> {
//   const chartName = (chartData.name as string) ?? 'unknown';
//   const chartType = (chartData.type as string) ?? 'chart';
//   const key = `${chartType}-${chartName}-${mode}` as AnalysisKey;

//   const existing = analysisCache.get(key);
//   if (existing) return existing.promise;

//   const abortCtrl = new AbortController();
//   const signal = opts?.signal ?? abortCtrl.signal;

//   const promise = (async () => {
//     try {
//       let result;
//       if (chartData.type === 'synastry') {
//         const { astrologyAPI } = await import('../services/api');
//         result = await astrologyAPI.getFullSynastryAnalysis(
//           {
//             chart1: chartData.chart1,
//             chart2: chartData.chart2,
//             aspects: chartData.aspects,
//             overlays: chartData.overlays,
//           },
//           language,
//           5,
//           mode,
//           { signal }
//         );
//       } else {
//         const { astrologyAPI } = await import('../services/api');
//         result = await astrologyAPI.getFullChartAnalysis(
//           chartData,
//           language,
//           5,
//           mode,
//           { signal }
//         );
//       }
//       return { analysis: result.analysis };
//     } finally {
//       analysisCache.delete(key);
//     }
//   })();

//   analysisCache.set(key, { promise, abortCtrl });
//   return promise;
// }

// export function cancelAnalysis(
//   chartData: Record<string, unknown>,
//   mode: 'simple' | 'advanced'
// ): void {
//   const chartName = (chartData.name as string) ?? 'unknown';
//   const chartType = (chartData.type as string) ?? 'chart';
//   const key = `${chartType}-${chartName}-${mode}` as AnalysisKey;

//   const pending = analysisCache.get(key);
//   if (pending) {
//     pending.abortCtrl.abort();
//     analysisCache.delete(key);
//   }
// }

import { astrologyAPI } from './api';

type AnalysisKey = string;

interface PendingAnalysis {
  promise: Promise<{ analysis: string }>;
  abortCtrl: AbortController;
}

const analysisCache = new Map<AnalysisKey, PendingAnalysis>();

export function getFullAnalysis(
  chartData: Record<string, unknown>,
  mode: 'simple' | 'advanced',
  language: string
): Promise<{ analysis: string }> {
  // const chartName = (chartData.name as string) ?? 'unknown';
  // const chartType = (chartData.type as string) ?? 'chart';
  // const key = `${chartType}-${chartName}-${mode}` as AnalysisKey;
  const chartName = (chartData.name as string)
  ?? (chartData.type === 'synastry'
    ? `${chartData.person1_name ?? 'p1'}_${chartData.person2_name ?? 'p2'}_${chartData.relationship_context ?? 'default'}`
    : 'unknown');
  const chartType = (chartData.type as string) ?? 'chart';
  const key = `${chartType}-${chartName}-${mode}`;

  // Если запрос уже идёт — возвращаем тот же промис, новый к LLM не уходит
  const existing = analysisCache.get(key);
  if (existing) return existing.promise;

  const abortCtrl = new AbortController();
  const signal = abortCtrl.signal;

  const promise = (async () => {
    try {
      let result;
      if (chartData.type === 'synastry') {
        result = await astrologyAPI.getFullSynastryAnalysis(
          {
            chart1: chartData.chart1,
            chart2: chartData.chart2,
            aspects: chartData.aspects,
            overlays: chartData.overlays,
            relationship_context: chartData.relationship_context as string | undefined,
          },
          language,
          5,
          mode,
          { signal }
        );
      } else {
        result = await astrologyAPI.getFullChartAnalysis(
          chartData as never,
          language,
          5,
          mode,
          { signal }
        );
      }
      return { analysis: result.analysis };
    } finally {
      // Чистим в любом случае — успех или ошибка
      // analysisCache.delete(key);
    }
  })();

  analysisCache.set(key, { promise, abortCtrl });
  return promise;
}

export function cancelAnalysis(
  chartData: Record<string, unknown>,
  mode: 'simple' | 'advanced'
): void {
  const chartName = (chartData.name as string) ?? 'unknown';
  const chartType = (chartData.type as string) ?? 'chart';
  const key = `${chartType}-${chartName}-${mode}` as AnalysisKey;

  const pending = analysisCache.get(key);
  if (pending) {
    pending.abortCtrl.abort();
    analysisCache.delete(key);
  }
}