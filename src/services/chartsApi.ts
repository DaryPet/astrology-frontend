// import { supabase } from '../lib/supabase'

// const CHARTS_LIMIT = 5

// export const chartsApi = {
//   async saveChart(userId, chartData) {
//     const chartToSave = {
//       user_id: userId,
//       name: chartData.name || 'Карта 1',
//       sun_sign: chartData.sun_sign,
//       moon_sign: chartData.moon_sign,
//       ascendant: chartData.ascendant,
//       planets: JSON.stringify(chartData.planets),
//       houses: JSON.stringify(chartData.houses),
//       aspects: JSON.stringify(chartData.aspects),
//       chart_data: chartData,
//       created_at: new Date().toISOString()
//     }

//     const { data, error } = await supabase
//       .from('natal_charts')
//       .insert(chartToSave)
//       .select()
//       .single()

//     if (error) throw error
//     return data
//   },

//   async getCharts(userId) {
//     const { data, error } = await supabase
//       .from('natal_charts')
//       .select('*')
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false })

//     if (error) throw error
//     return data || []
//   },

//   async deleteChart(chartId) {
//     const { error } = await supabase
//       .from('natal_charts')
//       .delete()
//       .eq('id', chartId)

//     if (error) throw error
//     return true
//   },

//   async getChartsCount(userId) {
//     const { count, error } = await supabase
//       .from('natal_charts')
//       .select('*', { count: 'exact', head: true })
//       .eq('user_id', userId)

//     if (error) throw error
//     return count || 0
//   },

//   async hasReachedLimit(userId) {
//     const count = await this.getChartsCount(userId)
//     return count >= CHARTS_LIMIT
//   },

//   CHARTS_LIMIT
// }

// export default chartsApi

import { supabase } from '../lib/supabase'

const CHARTS_LIMIT = 5

export const chartsApi = {

  async saveChart(userId: string, chartData: Record<string, unknown>) {
    console.log('=== SAVE CHART DATA ===', chartData)
    if (!chartData.name) {
      throw new Error('Chart name is required')
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
    }

    console.log('=== chartToSave ===', chartToSave)

    const { data, error } = await supabase
      .from('natal_charts')
      .insert(chartToSave)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    return data
  },

  async getCharts(userId: string) {
    const { data, error } = await supabase
      .from('natal_charts')
      .select('*, chart_interpretations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async deleteChart(chartId: number) {
    // Сначала удаляем интерпретации
    await supabase
      .from('chart_interpretations')
      .delete()
      .eq('chart_id', chartId)
    
    // Потом карту
    const { error } = await supabase
      .from('natal_charts')
      .delete()
      .eq('id', chartId)

    if (error) throw error
    return true
  },

  async getChartsCount(userId: string) {
    const { count, error } = await supabase
      .from('natal_charts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) throw error
    return count || 0
  },

  async hasReachedLimit(userId: string) {
    const count = await this.getChartsCount(userId)
    return count >= CHARTS_LIMIT
  },

  async saveInterpretation(chartId: number, type: string, interpretation: string) {
    console.log('Saving interpretation for chart:', chartId)
    const { data, error } = await supabase
      .from('chart_interpretations')
      .insert({
        chart_id: chartId,
        type,
        interpretation,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase saveInterpretation error:', error)
      throw error
    }
    return data
  },

  async saveChartWithInterpretation(userId: string, chartData: Record<string, unknown>, interpretation: string) {
    const chart = await this.saveChart(userId, chartData)
    await this.saveInterpretation(chart.id, 'full', interpretation)
    return chart
  },

  CHARTS_LIMIT,
}

export default chartsApi