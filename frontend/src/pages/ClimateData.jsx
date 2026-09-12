import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Info, 
  Sun, 
  Database, 
  Sparkles, 
  Thermometer, 
  Wind, 
  Droplets, 
  Calendar, 
  CheckCircle2, 
  Download, 
  Table, 
  Activity, 
  ArrowDownRight, 
  Flame,
  Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FALLBACK_SCENARIOS_META, FALLBACK_CLIMATE_SUMMARY } from '../data/lehWeatherFallback';

const QUICK_SCENARIOS = [
  { id: 'typical_winter_72h', label: 'Typical Winter (72h)', badge: '❄️ Sub-zero & High Sun' },
  { id: 'coldest_week', label: 'Historic Cold Wave (7d)', badge: '🥶 -39.1°C Record Freeze' },
  { id: 'high_wind_period', label: 'High Wind Storm (72h)', badge: '💨 12.6 m/s Gusts' },
  { id: 'peak_solar_week', label: 'Peak Solar Week (7d)', badge: '☀️ >1,100 W/m² GHI' },
];

export const ClimateData = () => {
  const {
    climate,
    climateParams,
    updateClimateParams,
    runActiveSimulation,
    climateSource,
    selectedScenario,
    climateSummary,
    availableScenarios,
    selectRealClimateScenario,
    switchToSynthetic,
    isDarkMode
  } = useApp();

  const [activeChartTab, setActiveChartTab] = useState('temp_solar');
  const [showTablePreview, setShowTablePreview] = useState(false);

  const handleSliderChange = (key, value) => {
    updateClimateParams({ [key]: value });
    setTimeout(() => runActiveSimulation(), 100);
  };

  const handleScenarioChange = (scenarioId) => {
    selectRealClimateScenario(scenarioId);
    setTimeout(() => runActiveSimulation(), 150);
  };

  const handleModeSwitch = (mode) => {
    if (mode === 'real') {
      selectRealClimateScenario(selectedScenario || 'typical_winter_72h');
    } else {
      switchToSynthetic();
    }
    setTimeout(() => runActiveSimulation(), 150);
  };

  // Safe fallback guarantees - never crash even if API returned string or null
  const safeScenarios = Array.isArray(availableScenarios) && availableScenarios.length > 0
    ? availableScenarios
    : FALLBACK_SCENARIOS_META;
  const activeScenarioMeta = safeScenarios.find(s => s && s.id === selectedScenario) || safeScenarios[0];
  const safeSummary = (climateSummary && typeof climateSummary === 'object' && typeof climateSummary.total_records === 'number')
    ? climateSummary
    : FALLBACK_CLIMATE_SUMMARY;

  // Compute key statistics for the currently active weather series
  const scenarioStats = useMemo(() => {
    if (!climate || !climate.t_hours || climate.t_hours.length === 0) return null;
    const temps = climate.T_out || [];
    const ghis = climate.ghi || [];
    const winds = climate.wind || [];
    const rhs = climate.rh || [];
    
    const minTemp = temps.length ? Math.min(...temps) : 0;
    const maxTemp = temps.length ? Math.max(...temps) : 0;
    const meanTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const peakGhi = ghis.length ? Math.max(...ghis) : 0;
    const dt = climate.t_hours.length > 1 ? (climate.t_hours[1] - climate.t_hours[0]) : 1;
    const totalSolarKWh = ghis.length ? (ghis.reduce((a, b) => a + b, 0) * dt) / 1000 : 0;
    const maxWind = winds.length ? Math.max(...winds) : 0;
    const meanWind = winds.length ? winds.reduce((a, b) => a + b, 0) / winds.length : 0;
    const meanRh = rhs.length ? rhs.reduce((a, b) => a + b, 0) / rhs.length : 0;

    return {
      minTemp: minTemp.toFixed(1),
      maxTemp: maxTemp.toFixed(1),
      meanTemp: meanTemp.toFixed(1),
      peakGhi: Math.round(peakGhi),
      totalSolarKWh: totalSolarKWh.toFixed(1),
      maxWind: maxWind.toFixed(1),
      meanWind: meanWind.toFixed(1),
      meanRh: Math.round(meanRh),
      totalHours: Math.round(climate.t_hours[climate.t_hours.length - 1] || climate.t_hours.length)
    };
  }, [climate]);

  // Downsample timeseries if very long (e.g. annual dataset) for fast chart rendering
  const chartData = useMemo(() => {
    if (!climate || !climate.t_hours || climate.t_hours.length === 0) {
      return { labels: [], temps: [], ghis: [], winds: [], rhs: [] };
    }
    const len = climate.t_hours.length;
    const stride = len > 500 ? Math.ceil(len / 350) : 1;
    const labels = [];
    const temps = [];
    const ghis = [];
    const winds = [];
    const rhs = [];
    for (let i = 0; i < len; i += stride) {
      labels.push(`H+${climate.t_hours[i].toFixed(0)}`);
      temps.push(Number((climate.T_out[i] ?? 0).toFixed(1)));
      ghis.push(Number((climate.ghi[i] ?? 0).toFixed(0)));
      winds.push(Number((climate.wind?.[i] ?? 0).toFixed(1)));
      rhs.push(Number((climate.rh?.[i] ?? 0).toFixed(0)));
    }
    return { labels, temps, ghis, winds, rhs };
  }, [climate]);

  // Export active weather timeseries as CSV
  const exportWeatherCSV = () => {
    if (!climate || !climate.t_hours) return;
    const headers = ["Hour", "T_out_C", "GHI_Wm2", "Wind_ms", "RH_pct", "Cloud_pct"];
    const rows = [headers.join(",")];
    for (let i = 0; i < climate.t_hours.length; i++) {
      rows.push([
        climate.t_hours[i],
        climate.T_out[i]?.toFixed(2) ?? '',
        climate.ghi[i]?.toFixed(1) ?? '',
        climate.wind?.[i]?.toFixed(2) ?? '',
        climate.rh?.[i]?.toFixed(1) ?? '',
        climate.cloud?.[i]?.toFixed(1) ?? ''
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leh_weather_${selectedScenario || 'profile'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ECharts configuration options for Climate Profiles (strictly adheres to modern ECharts 5/6 API)
  const getChartOptions = () => {
    const labelColor = isDarkMode ? '#a1a1aa' : '#52525b';
    const gridBorderColor = isDarkMode ? '#27272a' : '#e4e4e7';
    const legendTextStyle = { color: labelColor, fontFamily: 'Inter, sans-serif' };

    if (activeChartTab === 'temp_solar') {
      return {
        backgroundColor: 'transparent',
        animationDuration: 300,
        tooltip: {
          trigger: 'axis',
          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
          borderColor: gridBorderColor,
          textStyle: { color: isDarkMode ? '#ffffff' : '#09090b', fontSize: 12 },
          formatter: (params) => {
            if (!params || !params.length) return '';
            let html = `<div class="font-bold text-xs mb-1">${params[0].axisValue}</div>`;
            params.forEach(p => {
              const unit = p.seriesName.includes('Temp') ? '°C' : ' W/m²';
              const dotColor = p.color;
              html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">
                <span class="flex items-center gap-1.5"><span style="background:${dotColor}" class="inline-block w-2 h-2 rounded-full"></span>${p.seriesName}:</span>
                <span class="font-mono font-bold">${p.value}${unit}</span>
              </div>`;
            });
            return html;
          }
        },
        legend: {
          data: ['Ambient Temperature (T_out)', 'Solar Radiation (GHI)'],
          textStyle: legendTextStyle,
          top: 0
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '5%',
          top: 36,
          containLabel: true,
          borderColor: gridBorderColor
        },
        xAxis: {
          type: 'category',
          data: chartData.labels,
          axisLabel: { 
            color: labelColor, 
            fontFamily: 'Inter, sans-serif', 
            fontSize: 10, 
            interval: Math.max(1, Math.floor(chartData.labels.length / 10)) 
          },
          axisLine: { lineStyle: { color: gridBorderColor } }
        },
        yAxis: [
          {
            type: 'value',
            name: 'Temp (°C)',
            nameTextStyle: { color: labelColor, fontFamily: 'Inter, sans-serif' },
            axisLabel: { color: labelColor, fontFamily: 'Inter, sans-serif', formatter: '{value}°C' },
            splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
          },
          {
            type: 'value',
            name: 'GHI (W/m²)',
            nameTextStyle: { color: labelColor, fontFamily: 'Inter, sans-serif' },
            axisLabel: { color: labelColor, fontFamily: 'Inter, sans-serif', formatter: '{value}' },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: 'Ambient Temperature (T_out)',
            type: 'line',
            yAxisIndex: 0,
            data: chartData.temps,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2.5, color: '#38bdf8' },
            itemStyle: { color: '#38bdf8' },
            markLine: {
              silent: true,
              data: [
                { yAxis: 0, lineStyle: { color: isDarkMode ? '#64748b' : '#94a3b8', type: 'dashed', width: 1 }, label: { formatter: '0°C Freeze', position: 'end', fontSize: 10, color: labelColor } }
              ]
            }
          },
          {
            name: 'Solar Radiation (GHI)',
            type: 'line',
            yAxisIndex: 1,
            data: chartData.ghis,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color: '#f59e0b' },
            itemStyle: { color: '#f59e0b' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(245, 158, 11, 0.35)' },
                  { offset: 1, color: 'rgba(245, 158, 11, 0.01)' }
                ]
              }
            }
          }
        ]
      };
    } else {
      return {
        backgroundColor: 'transparent',
        animationDuration: 300,
        tooltip: {
          trigger: 'axis',
          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
          borderColor: gridBorderColor,
          textStyle: { color: isDarkMode ? '#ffffff' : '#09090b', fontSize: 12 }
        },
        legend: {
          data: ['Wind Velocity (m/s)', 'Relative Humidity (%)'],
          textStyle: legendTextStyle,
          top: 0
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '5%',
          top: 36,
          containLabel: true,
          borderColor: gridBorderColor
        },
        xAxis: {
          type: 'category',
          data: chartData.labels,
          axisLabel: { 
            color: labelColor, 
            fontFamily: 'Inter, sans-serif', 
            fontSize: 10, 
            interval: Math.max(1, Math.floor(chartData.labels.length / 10)) 
          },
          axisLine: { lineStyle: { color: gridBorderColor } }
        },
        yAxis: [
          {
            type: 'value',
            name: 'Wind (m/s)',
            nameTextStyle: { color: labelColor, fontFamily: 'Inter, sans-serif' },
            axisLabel: { color: labelColor, fontFamily: 'Inter, sans-serif', formatter: '{value} m/s' },
            splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
          },
          {
            type: 'value',
            name: 'RH (%)',
            min: 0,
            max: 100,
            nameTextStyle: { color: labelColor, fontFamily: 'Inter, sans-serif' },
            axisLabel: { color: labelColor, fontFamily: 'Inter, sans-serif', formatter: '{value}%' },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: 'Wind Velocity (m/s)',
            type: 'line',
            yAxisIndex: 0,
            data: chartData.winds,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color: '#06b6d4' },
            itemStyle: { color: '#06b6d4' }
          },
          {
            name: 'Relative Humidity (%)',
            type: 'line',
            yAxisIndex: 1,
            data: chartData.rhs,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 2, color: '#6366f1' },
            itemStyle: { color: '#6366f1' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(99, 102, 241, 0.25)' },
                  { offset: 1, color: 'rgba(99, 102, 241, 0.01)' }
                ]
              }
            }
          }
        ]
      };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Main Climate Configuration Panel */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-6">
        
        {/* Header & Source Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Sun size={16} className="text-yellow-500" /> Site Climate Properties & Weather Data
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Configure real historical Leh weather records (2021–2025) or synthetic diurnal micro-climate to drive passive thermal simulations.
            </p>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleModeSwitch('real')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                climateSource === 'real'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Database size={14} />
              <span>Real Leh Dataset (5-Yr)</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('synthetic')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                climateSource === 'synthetic'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles size={14} />
              <span>Synthetic Model</span>
            </button>
          </div>
        </div>

        {/* Real Historical Weather Mode */}
        {climateSource === 'real' && (
          <div className="flex flex-col gap-6">
            
            {/* Scenario Selection Box */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Calendar size={14} /> Active Climate Scenario
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {activeScenarioMeta ? activeScenarioMeta.description : "Historical hourly records from Leh weather station (34.15° N, 3500m ASL)."}
                  </p>
                  {activeScenarioMeta && (
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Period: <strong className="text-zinc-700 dark:text-zinc-200">{activeScenarioMeta.start}</strong> → <strong className="text-zinc-700 dark:text-zinc-200">{activeScenarioMeta.end}</strong> ({activeScenarioMeta.duration_h} hours)
                    </span>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <select
                    value={selectedScenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                    className="bg-white dark:bg-[#121622] border border-blue-200 dark:border-blue-900/60 text-zinc-900 dark:text-zinc-100 text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer shadow-xs min-w-[220px]"
                  >
                    {safeScenarios.map((scen) => (
                      <option key={scen.id} value={scen.id}>
                        {scen.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Scenario Preset Chips */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-100/50 dark:border-blue-900/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 self-center mr-1">Quick Picks:</span>
                {QUICK_SCENARIOS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleScenarioChange(chip.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      selectedScenario === chip.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                  >
                    <span className="font-semibold">{chip.label}</span>
                    <span className="ml-1.5 opacity-80 text-[10px] hidden sm:inline">({chip.badge})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Scenario Current Driver Metrics */}
            {scenarioStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Thermometer size={12} className="text-red-500" /> Mean Temp
                  </span>
                  <p className="text-lg font-extrabold font-mono text-zinc-800 dark:text-zinc-100 mt-1">
                    {scenarioStats.meanTemp}°C
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Period Average</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <ArrowDownRight size={12} className="text-blue-500" /> Temp Low
                  </span>
                  <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">
                    {scenarioStats.minTemp}°C
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Coldest Hour</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Sun size={12} className="text-amber-500" /> Peak Solar GHI
                  </span>
                  <p className="text-lg font-extrabold font-mono text-amber-500 mt-1">
                    {scenarioStats.peakGhi} <span className="text-xs font-normal text-zinc-400">W/m²</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Clear-sky Peak</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Flame size={12} className="text-orange-500" /> Cumulative Solar
                  </span>
                  <p className="text-lg font-extrabold font-mono text-orange-600 dark:text-orange-400 mt-1">
                    {scenarioStats.totalSolarKWh} <span className="text-xs font-normal text-zinc-400">kWh/m²</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Total Insolation</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Wind size={12} className="text-cyan-500" /> Peak Wind
                  </span>
                  <p className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                    {scenarioStats.maxWind} <span className="text-xs font-normal text-zinc-400">m/s</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Max Gust Velocity</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Clock size={12} className="text-indigo-500" /> Duration
                  </span>
                  <p className="text-lg font-extrabold font-mono text-zinc-800 dark:text-zinc-100 mt-1">
                    {scenarioStats.totalHours} <span className="text-xs font-normal text-zinc-400">hours</span>
                  </p>
                  <span className="text-[10px] text-zinc-400 font-mono">Sim Timesteps</span>
                </div>
              </div>
            )}

            {/* 5-Year Overall Statistics Summary Cards */}
            {safeSummary && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" /> 5-Year Leh Station Verified Baseline ({safeSummary.total_records.toLocaleString()} Records)
                  </span>
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                    {safeSummary.location}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Temp Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Thermometer size={14} className="text-red-500" /> Temperature</span>
                      <span className="font-mono text-[11px]">{safeSummary.temperature.mean}°C mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Record Low</span>
                        <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">{safeSummary.temperature.min}°C</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Summer High</span>
                        <p className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">{safeSummary.temperature.max}°C</p>
                      </div>
                    </div>
                  </div>

                  {/* Solar Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Sun size={14} className="text-amber-500" /> Solar Radiation (GHI)</span>
                      <span className="font-mono text-[11px]">{safeSummary.ghi.mean} W/m² mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Peak GHI</span>
                        <p className="text-lg font-extrabold font-mono text-amber-500">{safeSummary.ghi.max} W/m²</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Night Low</span>
                        <p className="text-lg font-extrabold font-mono text-zinc-400">0 W/m²</p>
                      </div>
                    </div>
                  </div>

                  {/* Wind Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Wind size={14} className="text-cyan-500" /> Wind Velocity</span>
                      <span className="font-mono text-[11px]">{safeSummary.wind.mean} m/s mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Peak Gust</span>
                        <p className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{safeSummary.wind.max} m/s</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Calm Low</span>
                        <p className="text-lg font-extrabold font-mono text-zinc-400">{safeSummary.wind.min} m/s</p>
                      </div>
                    </div>
                  </div>

                  {/* Humidity Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Droplets size={14} className="text-blue-500" /> Relative Humidity</span>
                      <span className="font-mono text-[11px]">{safeSummary.humidity.mean}% mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Dry Min</span>
                        <p className="text-lg font-extrabold font-mono text-indigo-500">{safeSummary.humidity.min}%</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Wet Max</span>
                        <p className="text-lg font-extrabold font-mono text-zinc-400">{safeSummary.humidity.max}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Synthetic Diurnal Model Sliders */}
        {climateSource === 'synthetic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Site Latitude</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">34.15° N (Leh)</span>
              </label>
              <input type="text" value="34.15" disabled className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs cursor-not-allowed text-zinc-400 dark:text-zinc-500 font-mono"/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Diurnal Mean Temperature</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.tMean.toFixed(1)}°C</span>
              </label>
              <input type="range" min="-25" max="10" step="0.5" value={climateParams.tMean} onChange={(e) => handleSliderChange('tMean', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Diurnal Amplitude (Swing)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">±{climateParams.tAmp.toFixed(1)}°C</span>
              </label>
              <input type="range" min="2" max="18" step="0.5" value={climateParams.tAmp} onChange={(e) => handleSliderChange('tAmp', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Solar Peak GHI</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.ghiPeak} W/m²</span>
              </label>
              <input type="range" min="200" max="1200" step="10" value={climateParams.ghiPeak} onChange={(e) => handleSliderChange('ghiPeak', parseInt(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Average Wind Speed</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.windMean.toFixed(1)} m/s</span>
              </label>
              <input type="range" min="0" max="15" step="0.1" value={climateParams.windMean} onChange={(e) => handleSliderChange('windMean', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Relative Humidity</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.rhMean}%</span>
              </label>
              <input type="range" min="10" max="95" step="1" value={climateParams.rhMean} onChange={(e) => handleSliderChange('rhMean', parseInt(e.target.value))}/>
            </div>
          </div>
        )}

        {/* Informational Callout */}
        <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed flex gap-3">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5"/>
          <div>
            <strong className="text-zinc-950 dark:text-white font-bold">High-Altitude Cold Desert Physics & Solar Radiation:</strong>
            <p className="mt-1">
              At 3,500m elevation, Leh experiences atmospheric pressure ~66 kPa and optical air mass with minimal vapor attenuation. This generates intense clear-sky GHI peaks (frequently surpassing 1,000 W/m²) alongside sub-zero winter temperatures reaching down to -39°C. The active weather scenario feeds directly into the building thermal model, conduction calculations, sol-air surface temperature transformations, and design optimizations.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Climate Profile Timeseries Visualization */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Activity size={15} className="text-blue-500" /> Dynamic Climate Timeseries Curves
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Hourly ambient meteorological boundary conditions driving RC network conduction and solar-air sol-thermal gains.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Mode Switcher */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveChartTab('temp_solar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'temp_solar'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Temp & Solar GHI
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('wind_humidity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'wind_humidity'
                    ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Wind & Humidity
              </button>
            </div>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={exportWeatherCSV}
              title="Download scenario hourly weather CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* ECharts Canvas Container */}
        <div className="h-80 sm:h-96 w-full pt-2">
          {chartData.labels.length > 0 ? (
            <ReactECharts
              option={getChartOptions()}
              style={{ height: '100%', width: '100%' }}
              theme={isDarkMode ? 'dark' : 'light'}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              Loading weather timeseries data...
            </div>
          )}
        </div>
      </div>

      {/* Hourly Data Sample Inspector (Collapsible Table) */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table size={15} className="text-zinc-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Hourly Record Sample Table ({climate?.t_hours?.length || 0} Hours Available)
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setShowTablePreview(!showTablePreview)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showTablePreview ? "Collapse Table" : "Inspect Sampled Records"}
          </button>
        </div>

        {showTablePreview && (
          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-4">Hour Index</th>
                  <th className="py-2.5 px-4">Ambient Temp (T_out)</th>
                  <th className="py-2.5 px-4">Solar Radiation (GHI)</th>
                  <th className="py-2.5 px-4">Wind Speed</th>
                  <th className="py-2.5 px-4">Rel. Humidity</th>
                  <th className="py-2.5 px-4">Cloud Cover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono text-[11px]">
                {climate.t_hours.slice(0, 36).filter((_, i) => i % 2 === 0).map((h, idx) => {
                  const actualIdx = climate.t_hours.indexOf(h);
                  const temp = climate.T_out[actualIdx];
                  const ghi = climate.ghi[actualIdx];
                  const wind = climate.wind?.[actualIdx] ?? 0;
                  const rh = climate.rh?.[actualIdx] ?? 0;
                  const cloud = climate.cloud?.[actualIdx] ?? 0;

                  return (
                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2 px-4 font-bold text-zinc-900 dark:text-zinc-100">H+{h.toFixed(0)}</td>
                      <td className={`py-2 px-4 font-bold ${temp < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {temp.toFixed(2)}°C
                      </td>
                      <td className={`py-2 px-4 ${ghi > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-400'}`}>
                        {ghi.toFixed(1)} W/m²
                      </td>
                      <td className="py-2 px-4 text-cyan-600 dark:text-cyan-400">
                        {wind.toFixed(2)} m/s
                      </td>
                      <td className="py-2 px-4 text-zinc-500 dark:text-zinc-400">
                        {rh.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-zinc-400">
                        {cloud.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
