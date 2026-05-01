import { supabase } from '../lib/supabase';

const CHARTS_LIMIT = 5;

// Helper function to generate summary via LLM
async function generateSummary(interpretation: string): Promise<string> {
  try {
    // Assuming there's an API endpoint to generate summaries
    // This could be a direct LLM API call or a backend proxy
    const response = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: interpretation,
        language: 'en'
      })
    });
    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }
    const data = await response.json();
    return data.summary || interpretation.substring(0, 500); // Fallback to truncated original
  } catch (error) {
    console.error('Error generating summary:', error);
    return interpretation.substring(0, 500); // Fallback to truncated original
  }
}

export const chartsApi = {

  async saveChart(userId: string, chartData: Record<string, unknown>) {
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

  async getCharts(userId: string) {
    const { data, error } = await supabase
      .from('natal_charts')
      .select('*, chart_interpretations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChart(chartId: number) {
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

  getUniqueChartName(baseName: string, existingCharts: Array<{ name: string }>) {
    const existingNames = new Set(existingCharts.map(c => c.name));

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

    // Generate summary
    const summary = await generateSummary(interpretation);

    // Upsert interpretation (update if exists, insert if not)
    // Conflict target: (chart_id, type, name) - ensures unique analysis per chart+type+planet
    const { data, error } = await supabase
      .from('chart_interpretations')
      .upsert({
        chart_id: chartId,
        type,
        interpretation,
        summary,
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

  async saveChartWithInterpretation(userId: string, chartData: Record<string, unknown>, interpretation: string, planetAnalyses: Array<{planetName: string, analysis: string}> = []) {
    const chart = await this.saveChart(userId, chartData);
    await this.saveInterpretation(chart.id, 'full', interpretation);

    // Save planet analyses
    for (const { planetName, analysis } of planetAnalyses) {
      await this.savePlanetAnalysis(chart.id, planetName, analysis);
    }

    return chart;
  },

  CHARTS_LIMIT,
};

export default chartsApi;