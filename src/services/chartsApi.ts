import { supabase } from '../lib/supabase';

export interface ChartResponse {
  id: string | number;
  name?: string;
  sun_sign?: string;
  chart_data?: Record<string, unknown>;
  chart_interpretations?: Array<{ type?: string; interpretation?: string; name?: string }>;
  created_at?: string;
}

const CHARTS_LIMIT = 5;

export const chartsApi = {

  async saveChart(userId: string, chartData: Record<string, unknown>): Promise<ChartResponse> {
    if (!chartData.name) {
      throw new Error('Chart name is required');
    }

    const chartToSave = {
      user_id: userId,
      name: chartData.name,
      sun_sign: chartData.sun_sign,
      moon_sign: chartData.moon_sign,
      ascendant: chartData.ascendant,
      planets: chartData.planets,
      houses: chartData.houses,
      aspects: chartData.aspects,
      chart_data: chartData,
    };

    const { data, error } = await supabase
      .from('natal_charts')
      .insert(chartToSave)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async getCharts(userId: string): Promise<ChartResponse[]> {
    const { data, error } = await supabase
      .from('natal_charts')
      .select('*, chart_interpretations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChart(chartId: number): Promise<ChartResponse> {
    const { data, error } = await supabase
      .from('natal_charts')
      .select('*, chart_interpretations(*)')
      .eq('id', chartId)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteChart(chartId: number) {
    // Сначала удаляем интерпретации
    await supabase
      .from('chart_interpretations')
      .delete()
      .eq('chart_id', chartId);

    // Потом карту
    const { error } = await supabase
      .from('natal_charts')
      .delete()
      .eq('id', chartId);

    if (error) throw error;
    return true;
  },

  async getChartsCount(userId: string) {
    const { count, error } = await supabase
      .from('natal_charts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  },

  async hasReachedLimit(userId: string) {
    const count = await this.getChartsCount(userId);
    return count >= CHARTS_LIMIT;
  },

  async checkChartByName(userId: string, name: string) {
    const { data, error } = await supabase
      .from('natal_charts')
      .select('id, name')
      .eq('user_id', userId)
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data || null;
  },

  getUniqueChartName(baseName: string, existingCharts: Array<{ name?: string }>) {
    const existingNames = new Set(existingCharts.map(c => c.name || ''));

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;

    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }

    return newName;
  },

  async updateChartName(chartId: number, newName: string) {
    const { data: chart, error: fetchError } = await supabase
      .from('natal_charts')
      .select('chart_data')
      .eq('id', chartId)
      .single();

    if (fetchError) throw fetchError;

    const updatedChartData = chart?.chart_data
      ? { ...chart.chart_data, name: newName }
      : { name: newName };

    const { data, error } = await supabase
      .from('natal_charts')
      .update({
        name: newName,
        chart_data: updatedChartData
      })
      .eq('id', chartId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveInterpretation(chartId: number, type: string, interpretation: string, name: string = '') {
    // Verify chart exists
    const { data: chart, error: chartError } = await supabase
      .from('natal_charts')
      .select('id')
      .eq('id', chartId)
      .single();

    if (chartError || !chart) {
      throw new Error(`Chart with id ${chartId} does not exist`);
    }

    // Upsert interpretation (update if exists, insert if not)
    // Conflict target: (chart_id, type, name) - ensures unique analysis per chart+type+planet
    const { data, error } = await supabase
      .from('chart_interpretations')
      .upsert({
        chart_id: chartId,
        type,
        interpretation,
        name, // planet name for type='planet'
        created_at: new Date().toISOString()
      }, {
        onConflict: 'chart_id,type,name'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async savePlanetAnalysis(chartId: number, planetName: string, analysis: string) {
    return this.saveInterpretation(chartId, 'planet', analysis, planetName);
  },

  async getPlanetAnalyses(chartId: number) {
    const { data, error } = await supabase
      .from('chart_interpretations')
      .select('*')
      .eq('chart_id', chartId)
      .eq('type', 'planet');

    if (error) throw error;
    return data || [];
  },

  /**
   * Сохранить AI-анализ прогрессий в chart_interpretations:
   * type='progressions_simple'/'progressions_advanced', name=период 'YYYY-MM'
   * (тот же паттерн, что full_simple/full_advanced и планетные анализы)
   */
  async saveProgressionsAnalysis(chartId: number, mode: string, period: string, analysis: string) {
    return this.saveInterpretation(chartId, `progressions_${mode}`, analysis, period);
  },

  /**
   * Получить сохранённый анализ прогрессий за период (или null)
   */
  /**
   * Анализ транзитов: chart_interpretations,
   * type='transits_simple'/'transits_advanced', name=день 'YYYY-MM-DD'
   */
  async saveTransitsAnalysis(chartId: number, mode: string, day: string, analysis: string) {
    return this.saveInterpretation(chartId, `transits_${mode}`, analysis, day);
  },

  async getTransitsAnalysis(chartId: number, mode: string, day: string): Promise<string | null> {
    if (!chartId) return null;
    const { data, error } = await supabase
      .from('chart_interpretations')
      .select('interpretation')
      .eq('chart_id', chartId)
      .eq('type', `transits_${mode}`)
      .eq('name', day)
      .maybeSingle();
    if (error) {
      console.error('Failed to load transits analysis:', error);
      return null;
    }
    return data?.interpretation ?? null;
  },

  async getProgressionsAnalysis(chartId: number, mode: string, period: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chart_interpretations')
      .select('interpretation')
      .eq('chart_id', chartId)
      .eq('type', `progressions_${mode}`)
      .eq('name', period)
      .maybeSingle();

    if (error) throw error;
    return data?.interpretation ?? null;
  },

  /**
   * Сохранить/получить AI-анализ прогрессивной синастрии:
   * type='progressed_synastry_simple'/'progressed_synastry_advanced', name=период 'YYYY-MM'
   * (отдельный namespace от натальных progressions_* — не пересекается)
   */
  async saveProgressedSynastryAnalysis(chartId: number, mode: string, period: string, analysis: string) {
    return this.saveInterpretation(chartId, `progressed_synastry_${mode}`, analysis, period);
  },

  async getProgressedSynastryAnalysis(chartId: number, mode: string, period: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chart_interpretations')
      .select('interpretation')
      .eq('chart_id', chartId)
      .eq('type', `progressed_synastry_${mode}`)
      .eq('name', period)
      .maybeSingle();

    if (error) throw error;
    return data?.interpretation ?? null;
  },

  async saveRelationshipTypes(chartId: number, data: unknown) {
    return this.saveInterpretation(chartId, 'relationship_types', JSON.stringify(data));
  },

  // async saveChartWithInterpretation(userId: string, chartData: Record<string, unknown>, interpretation: string, planetAnalyses: Array<{planetName: string, analysis: string}, simpleAnalysis?: string, advancedAnalysis?: string> = []) {
  async saveChartWithInterpretation(userId: string, chartData: Record<string, unknown>, interpretation: string, planetAnalyses: Array<{planetName: string, analysis: string}> = [], simpleAnalysis?: string, advancedAnalysis?: string) {
    const chart = await this.saveChart(userId, chartData);
    // Сохраняем ТОЛЬКО режимозависимые типы (simple + advanced), без общего 'full'
    if (simpleAnalysis) await this.saveInterpretation(Number(chart.id), 'full_simple', simpleAnalysis);
    if (advancedAnalysis) await this.saveInterpretation(Number(chart.id), 'full_advanced', advancedAnalysis);

    // Save planet analyses
    for (const { planetName, analysis } of planetAnalyses) {
      await this.savePlanetAnalysis(Number(chart.id), planetName, analysis);
    }

    return chart;
  },

  // async saveSynastryWithInterpretation(userId: string, synastryData: Record<string, unknown>, interpretation: string, simpleAnalysis?: string, advancedAnalysis?: string>) {
  async saveSynastryWithInterpretation(userId: string, synastryData: Record<string, unknown>, interpretation: string, simpleAnalysis?: string, advancedAnalysis?: string) {
    // Если name уже передан (например, при дубликате), используем его
    let name = synastryData.name as string | undefined;

    if (!name) {
      const p1 = synastryData.person1_name || '';
      const p2 = synastryData.person2_name || '';
      name = `${p1} & ${p2}`.trim();
      if (!name) name = 'Синастрия';
      if (name.length > 15) name = name.substring(0, 15);
    }

    const chartDataWithoutName = (({ name: _, ...rest }: Record<string, unknown>) => rest)(synastryData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart1 = synastryData.chart1 as any;

    const chartToSave = {
      user_id: userId,
      name,
      sun_sign: chart1?.sun_sign || null,
      moon_sign: chart1?.moon_sign || null,
      ascendant: chart1?.ascendant || null,
      chart_data: chartDataWithoutName,
    };

    const { data, error } = await supabase
      .from('natal_charts')
      .insert(chartToSave)
      .select()
      .single();

    if (error) throw error;

    // Сохраняем ТОЛЬКО режимозависимые типы (simple + advanced), без общего 'synastry'
    if (simpleAnalysis) await this.saveInterpretation(data.id, 'synastry_simple', simpleAnalysis);
    if (advancedAnalysis) await this.saveInterpretation(data.id, 'synastry_advanced', advancedAnalysis);
    return data;
  },

  // Маппинг сообщения чата в строку таблицы chat_messages
  _toChatRow(chartId: number, userId: string, msg: { role: string; content: string; relevant_chunks?: unknown[] }) {
    return {
      chart_id: chartId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      relevant_chunks: msg.relevant_chunks?.length ? JSON.stringify(msg.relevant_chunks) : null,
    };
  },

  // Добавляет ТОЛЬКО новые сообщения (по одному за обмен) — без дублирования истории
  async appendChatMessages(chartId: number, userId: string, newMessages: Array<{ role: string; content: string; relevant_chunks?: unknown[] }>) {
    if (!chartId || !userId || !newMessages?.length) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert(newMessages.map(msg => this._toChatRow(chartId, userId, msg)));

    if (error) throw error;
  },

  // Разовая запись всей накопленной истории (используется при первом сохранении карты)
  async saveChatMessages(chartId: number, userId: string, messages: Array<{ role: string; content: string; relevant_chunks?: unknown[] }>) {
    if (!chartId || !userId || !messages?.length) return;
    await this.appendChatMessages(chartId, userId, messages);
  },

  async getChatMessages(chartId: number): Promise<Array<{ role: 'user' | 'assistant'; content: string; relevant_chunks?: unknown[] }>> {
    if (!chartId) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, relevant_chunks')
      .eq('chart_id', chartId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(msg => {
      let chunks: unknown[] | undefined;
      if (msg.relevant_chunks) {
        try {
          chunks = typeof msg.relevant_chunks === 'string' ? JSON.parse(msg.relevant_chunks) : msg.relevant_chunks;
        } catch {
          chunks = undefined;
        }
      }
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        relevant_chunks: chunks,
      };
    });
  },

  CHARTS_LIMIT,
};

export default chartsApi;