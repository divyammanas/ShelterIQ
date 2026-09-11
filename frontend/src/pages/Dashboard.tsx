import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Thermometer, 
  Timer, 
  Box, 
  Zap, 
  ShieldCheck, 
  AlertTriangle,
  ClipboardCheck,
  Layers,
  Play,
  Pause,
  RotateCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThreeDShelter } from '../components/ThreeDShelter';
import { getUValue } from '../services/physicsEngine';

export const Dashboard: React.FC = () => {
  const {
    shelter,
    simResult,
    activeHour,
    setActiveHour,
    thermalMassType,
    isDarkMode
  } = useApp();

  // 3D Canvas visualizer toggles
  const [viewMode, setViewMode] = useState<'physical' | 'thermal'>('physical');
  const [envelopeOpacity, setEnvelopeOpacity] = useState<number>(0.75);
  const [visibilityStates, setVisibilityStates] = useState({
    roof: true,
    walls: true,
    floor: true,
    openings: true,
    mass: true,
    arrows: true
  });
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  // Play timeline animation
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setInterval(() => {
        setActiveHour((prev: number) => {
          const next = prev + 0.5;
          const maxH = simResult ? simResult.t_hours[simResult.t_hours.length - 1] : 72;
          return next > maxH ? 0 : next;
        });
      }, 150);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }
    
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, simResult]);

  const toggleVisibility = (key: keyof typeof visibilityStates) => {
    setVisibilityStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Get active values at the slider's hour index
  const getActiveTimestepData = () => {
    if (!simResult || simResult.t_hours.length === 0) {
      return {
        T_air: 0,
        T_mass: 0,
        T_out: 0,
        solar_gain: 0,
        conduction_loss: 0,
        ventilation_loss: 0,
        storage_rate: 0,
        heating_power: 0,
        net_heat_flow: 0,
        comfort_status: 'uncomfortable'
      };
    }
    const stepSize = simResult.t_hours[1] - simResult.t_hours[0];
    let idx = Math.round(activeHour / (stepSize || 0.5));
    idx = Math.max(0, Math.min(idx, simResult.t_hours.length - 1));
    return {
      T_air: simResult.T_air[idx],
      T_mass: simResult.T_mass[idx],
      T_out: simResult.T_out[idx],
      solar_gain: simResult.solar_gain_W[idx],
      conduction_loss: simResult.conduction_loss_W[idx],
      ventilation_loss: simResult.ventilation_loss_W[idx],
      storage_rate: simResult.storage_rate_W ? simResult.storage_rate_W[idx] : 0,
      heating_power: simResult.heating_power_W ? simResult.heating_power_W[idx] : 0,
      net_heat_flow: simResult.net_heat_flow_W[idx],
      comfort_status: simResult.comfort_status[idx]
    };
  };

  const current = getActiveTimestepData();

  // Envelope thermal properties
  const getWallU = () => getUValue(shelter.walls.S || []).toFixed(2);
  const getRoofU = () => getUValue(shelter.roof || []).toFixed(2);

  // Recommendations calculation
  const generateRecommendations = () => {
    if (!simResult) return [];
    const comfort_pct = (simResult.comfort_summary_hours.comfortable / 72.0) * 100;
    const std = Math.sqrt(
      simResult.T_air.reduce((a, b) => {
        const mean = simResult.T_air.reduce((s, x) => s + x, 0) / simResult.T_air.length;
        return a + Math.pow(b - mean, 2);
      }, 0) / simResult.T_air.length
    );
    
    const recs = [];
    
    if (comfort_pct < 60) {
      recs.push({
        title: "Inadequate Comfort Margin",
        desc: `Comfort hours are only ${comfort_pct.toFixed(0)}%. Increase thermal mass (PCM panels or water drums) and structural insulation to stabilize indoor heat profiles.`,
        type: "danger"
      });
    } else if (comfort_pct >= 85) {
      recs.push({
        title: "High Performance Achieved",
        desc: "Excellent passive heating insulation balance. Comfort margins meet ASHRAE adaptive standards for northern high-altitude cold deserts.",
        type: "success"
      });
    }
    
    if (shelter.ach > 0.8) {
      recs.push({
        title: "High Infiltration Heat Loss",
        desc: `Air changes per hour (ACH = ${shelter.ach}) represents significant leakage. Seal window frames and entry doors to reduce infiltration below 0.4 ACH.`,
        type: "warning"
      });
    }
    
    const win_area = shelter.openings.find(o => !o.is_door)?.area || 0;
    const south_wall_area = shelter.length * shelter.height;
    const ratio = win_area / south_wall_area;
    
    if (ratio < 0.12) {
      recs.push({
        title: "Sub-Optimal Solar Aperture",
        desc: `South window area is only ${(ratio*100).toFixed(0)}% of the face. Increase South glazing area to 15-18% of the wall to amplify solar thermal charging.`,
        type: "warning"
      });
    } else if (ratio > 0.25) {
      recs.push({
        title: "Excessive Glazing Conduction Risk",
        desc: `South glazing ratio is high (${(ratio*100).toFixed(0)}%). Opaque walls insulate 15x better than windows; too much glass will cause extreme night-time heat dumping.`,
        type: "warning"
      });
    }
    
    if (std > 4.5) {
      recs.push({
        title: "Thermal Stability Issues",
        desc: `High temperature volatility (${std.toFixed(1)}°C standard deviation). Add PCM panels (RT21 paraffin) or interior concrete blocks to dump heat into storage.`,
        type: "warning"
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        title: "Balanced Thermal Footprint",
        desc: "The shelter design shows highly tuned insulation, orientation, and solar gain. Perfect alignment with regional Ladakh vernacular practices.",
        type: "success"
      });
    }
    
    return recs;
  };

  const recommendations = generateRecommendations();

  // ECharts Option configurations
  const getTempChartOption = () => {
    if (!simResult) return {};
    const textStyle = { color: isDarkMode ? '#94a3b8' : '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 };
    const gridBorderColor = isDarkMode ? '#1e2638' : '#e2e8f0';
    
    return {
      backgroundColor: 'transparent',
      color: ['#f43f5e', '#10b981', '#0284c7'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#121622' : '#ffffff',
        borderColor: isDarkMode ? '#2b364d' : '#cbd5e1',
        textStyle: { color: isDarkMode ? '#f1f5f9' : '#0f172a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }
      },
      legend: {
        data: ['Indoor Air', 'Thermal Mass', 'Outdoor Ambient'],
        textStyle
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        borderColor: gridBorderColor
      },
      xAxis: {
        type: 'category',
        data: simResult.t_hours.map(h => `${h}h`),
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } }
      },
      yAxis: {
        type: 'value',
        name: 'Temp (°C)',
        nameTextStyle: textStyle,
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } },
        splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
      },
      series: [
        {
          name: 'Indoor Air',
          type: 'line',
          data: simResult.T_air,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5 }
        },
        {
          name: 'Thermal Mass',
          type: 'line',
          data: simResult.T_mass,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed' }
        },
        {
          name: 'Outdoor Ambient',
          type: 'line',
          data: simResult.T_out,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5 }
        }
      ]
    };
  };

  const getFlowChartOption = () => {
    if (!simResult) return {};
    const textStyle = { color: isDarkMode ? '#94a3b8' : '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 };
    const gridBorderColor = isDarkMode ? '#1e2638' : '#e2e8f0';
    
    return {
      backgroundColor: 'transparent',
      color: ['#f59e0b', '#0284c7', '#14b8a6', '#fb7185'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#121622' : '#ffffff',
        borderColor: isDarkMode ? '#2b364d' : '#cbd5e1',
        textStyle: { color: isDarkMode ? '#f1f5f9' : '#0f172a', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }
      },
      legend: {
        data: ['Solar Gain', 'Conduction', 'Ventilation', 'Mass Storage'],
        textStyle
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        borderColor: gridBorderColor
      },
      xAxis: {
        type: 'category',
        data: simResult.t_hours.map(h => `${h}h`),
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } }
      },
      yAxis: {
        type: 'value',
        name: 'Heat Flow (W)',
        nameTextStyle: textStyle,
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } },
        splitLine: { lineStyle: { color: gridBorderColor, type: 'dashed' } }
      },
      series: [
        {
          name: 'Solar Gain',
          type: 'line',
          data: simResult.solar_gain_W,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 }
        },
        {
          name: 'Conduction',
          type: 'line',
          data: simResult.conduction_loss_W.map(v => -v),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 }
        },
        {
          name: 'Ventilation',
          type: 'line',
          data: simResult.ventilation_loss_W.map(v => -v),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 }
        },
        {
          name: 'Mass Storage',
          type: 'line',
          data: simResult.storage_rate_W || new Array(simResult.t_hours.length).fill(0),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 }
        }
      ]
    };
  };

  // Radial points gauge parameters
  const score = simResult ? Number(simResult.design_score.toFixed(1)) : 0;
  const comfortHours = simResult ? Number(simResult.comfort_summary_hours.comfortable.toFixed(1)) : 0;
  const heatingEnergy = simResult ? Number(simResult.heating_energy_kWh.toFixed(2)) : 0;
  
  // Calculate stability (standard deviation)
  const stdVal = simResult ? Math.sqrt(
    simResult.T_air.reduce((a, b) => {
      const mean = simResult.T_air.reduce((s, x) => s + x, 0) / simResult.T_air.length;
      return a + Math.pow(b - mean, 2);
    }, 0) / simResult.T_air.length
  ) : 0;
  
  const minTemp = simResult ? simResult.min_T_air.toFixed(1) : '-';
  const maxTemp = simResult ? simResult.max_T_air.toFixed(1) : '-';

  // SVG Gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(score, 100) / 100) * circumference;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Upper Grid Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Charts, KPIs, Heat Balance) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* Temperature Profile Card */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Thermometer size={15} className="text-rose-500" /> Temperature Profile (72h Transient)
            </h3>
            <div className="h-[240px] w-full">
              {simResult ? (
                <ReactECharts 
                  option={getTempChartOption()} 
                  style={{ height: '100%', width: '100%' }}
                  theme={isDarkMode ? 'dark' : 'light'}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">Computing thermal equilibrium...</div>
              )}
            </div>
          </div>

          {/* Compact KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] p-3.5 rounded-xl flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Indoor Min</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{minTemp} °C</span>
              <span className="text-[9px] text-slate-400 font-mono">T_in,min (cycle)</span>
            </div>
            <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] p-3.5 rounded-xl flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Indoor Max</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{maxTemp} °C</span>
              <span className="text-[9px] text-slate-400 font-mono">T_in,max (cycle)</span>
            </div>
            <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] p-3.5 rounded-xl flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Comfort Hours</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{comfortHours} h</span>
              <span className="text-[9px] text-slate-400 font-mono">of 72h window</span>
            </div>
            <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] p-3.5 rounded-xl flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Heating Demand</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">{heatingEnergy.toFixed(1)} kWh</span>
              <span className="text-[9px] text-slate-400 font-mono">Auxiliary deficit</span>
            </div>
          </div>

          {/* Instantaneous Heat Balance Card */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
              <Zap size={15} className="text-blue-500" /> Instantaneous Thermal Flux Matrix (t = {activeHour.toFixed(1)}h)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-[#1e2638] pb-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Solar Flux (Q_sol)</span>
                <span className="text-sm font-semibold text-amber-500 dark:text-amber-400 font-mono">+{current.solar_gain.toFixed(0)} W</span>
              </div>
              <div className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-[#1e2638] pb-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Conduction (Q_cond)</span>
                <span className={`text-sm font-semibold font-mono ${current.conduction_loss > 0 ? 'text-sky-500 dark:text-sky-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {current.conduction_loss > 0 ? `-${current.conduction_loss.toFixed(0)}` : `+${Math.abs(current.conduction_loss).toFixed(0)}`} W
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-[#1e2638] pb-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Ventilation (Q_vent)</span>
                <span className="text-sm font-semibold text-teal-500 dark:text-teal-400 font-mono">-{current.ventilation_loss.toFixed(0)} W</span>
              </div>
              <div className="flex flex-col gap-0.5 pb-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Infiltration (Q_inf)</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">-{ (current.ventilation_loss * 0.15).toFixed(0) } W</span>
              </div>
              <div className="flex flex-col gap-0.5 pb-2.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Storage Rate (dQ_m/dt)</span>
                <span className={`text-sm font-semibold font-mono ${current.storage_rate > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {current.storage_rate > 0 ? `Charging: +${current.storage_rate.toFixed(0)}` : `Discharging: -${Math.abs(current.storage_rate).toFixed(0)}`} W
                </span>
              </div>
              <div className="flex flex-col gap-0.5 bg-slate-50 dark:bg-[#161d2d] px-3 py-2 rounded-lg border border-slate-200 dark:border-[#1e2638] justify-center">
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider font-semibold">Net Enclosure Flux</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{current.net_heat_flow.toFixed(0)} W</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (3D Interactive Model Panel) */}
        <div className="xl:col-span-5 flex flex-col gap-4 bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs self-stretch">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1e2638] pb-3.5">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Box size={15} className="text-blue-500" /> Interactive Envelope 3D CAD
            </h3>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1e2638]">
                <button
                  onClick={() => setViewMode('physical')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-md transition-all ${
                    viewMode === 'physical'
                      ? 'bg-white dark:bg-[#182030] text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Physical
                </button>
                <button
                  onClick={() => setViewMode('thermal')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded-md transition-all ${
                    viewMode === 'thermal'
                      ? 'bg-white dark:bg-[#182030] text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Thermal
                </button>
              </div>
              <span className="text-xs font-mono font-semibold bg-slate-100 dark:bg-[#161d2d] border border-slate-200 dark:border-[#1e2638] px-2 py-1 rounded-md text-slate-700 dark:text-slate-300">
                {activeHour.toFixed(1)}h
              </span>
            </div>
          </div>

          {/* 3D Canvas element wrapper */}
          <div className="h-[320px] w-full relative rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e2638] bg-[#0c0f17]">
            <ThreeDShelter
              viewMode={viewMode}
              envelopeOpacity={envelopeOpacity}
              visibilityStates={visibilityStates}
              isRotating={isRotating}
            />
          </div>

          {/* Toolbar Controls */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1e2638] rounded-lg">
            <div className="flex flex-wrap gap-2.5 items-center justify-between">
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#121622] hover:bg-slate-50 dark:hover:bg-[#182030] text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={() => setIsRotating(!isRotating)}
                  className={`flex items-center gap-1.5 border text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-150 ${
                    isRotating 
                      ? 'bg-blue-50 dark:bg-[#182030] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40'
                      : 'bg-white dark:bg-[#121622] border-slate-200 dark:border-[#1e2638] hover:bg-slate-50 dark:hover:bg-[#182030]'
                  }`}
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Opacity:</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05"
                  value={envelopeOpacity}
                  onChange={(e) => setEnvelopeOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Visibility checks as precision CAD layer toggles */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-200 dark:border-[#1e2638] pt-2.5 items-center">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mr-1">LAYERS:</span>
              {(['roof', 'walls', 'floor', 'openings', 'mass', 'arrows'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleVisibility(key)}
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-md border transition-all flex items-center gap-1.5 ${
                    visibilityStates[key]
                      ? 'bg-slate-100 dark:bg-[#182030] border-slate-300 dark:border-[#2b364d] text-slate-800 dark:text-slate-200 shadow-2xs font-medium'
                      : 'bg-transparent border-dashed border-slate-200 dark:border-[#1e2638] text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${visibilityStates[key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-mono text-slate-400 dark:text-slate-400">Hour:</span>
            <input
              type="range"
              min="0"
              max={simResult ? simResult.t_hours[simResult.t_hours.length - 1] : 72}
              step="0.5"
              value={activeHour}
              onChange={(e) => setActiveHour(parseFloat(e.target.value))}
              className="flex-1"
            />
          </div>
        </div>

      </div>

      {/* Dynamic Summary Card */}
      <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <Layers size={15} className="text-blue-500" /> Current Design Specifications Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#1e2638]">
          <div className="flex flex-col gap-1 p-2 sm:p-0">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Orientation</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{shelter.orientation_deg}° Azimuth</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Wall U-Value</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{getWallU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Roof U-Value</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{getRoofU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Ventilation (ACH)</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{shelter.ach} ACH</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Thermal Mass</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {thermalMassType === 'none' ? 'None' : thermalMassType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-mono font-medium text-slate-400 dark:text-slate-400 uppercase tracking-wider">Climate Location</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Ladakh Winter</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid Row (Flow breakdown & Score Gauge & Thermal Diagnostics) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left: Flows Chart */}
        <div className="xl:col-span-7 bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Timer size={15} className="text-blue-500" /> Energy Flow Breakdown
          </h3>
          <div className="h-[250px] w-full">
            {simResult ? (
              <ReactECharts 
                option={getFlowChartOption()} 
                style={{ height: '100%', width: '100%' }}
                theme={isDarkMode ? 'dark' : 'light'}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">Computing flow dynamics...</div>
            )}
          </div>
        </div>

        {/* Right: Gauge & Advisor splits */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6 self-stretch">
          
          {/* Design Score Gauge */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs flex flex-col items-center justify-center relative">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 self-start mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-500" /> Design Score
            </div>
            
            {/* SVG Ring Gauge */}
            <div className="relative w-28 h-28 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="56" 
                  cy="56" 
                  r={radius} 
                  className="fill-none stroke-slate-100 dark:stroke-[#1e2638] stroke-[8]"
                />
                <circle 
                  cx="56" 
                  cy="56" 
                  r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="fill-none stroke-blue-500 stroke-[8] stroke-linecap-round transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{score}</span>
                <span className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-400 leading-none mt-0.5">Points</span>
              </div>
            </div>

            {/* Score Breakdown metrics */}
            <div className="w-full space-y-1.5 mt-3 border-t border-slate-100 dark:border-[#1e2638] pt-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Comfort Target</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {((comfortHours / 72) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Auxiliary Heating</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {heatingEnergy.toFixed(1)} kWh
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Stability Index</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  ±{stdVal.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          {/* Advisor recommendations */}
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#1e2638] rounded-xl p-5 shadow-xs flex flex-col self-stretch">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 shrink-0">
              <ClipboardCheck size={14} className="text-blue-500" /> Thermal Diagnostics & Design Insights
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
              {recommendations.map((rec, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    rec.type === 'danger'
                      ? 'bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-200'
                      : rec.type === 'warning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/15 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {rec.type === 'danger' ? (
                      <AlertTriangle size={13} className="text-rose-500" />
                    ) : rec.type === 'warning' ? (
                      <AlertTriangle size={13} className="text-amber-500" />
                    ) : (
                      <ShieldCheck size={13} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <div className="font-bold mb-0.5">{rec.title}</div>
                    <div className="text-slate-600 dark:text-slate-300">{rec.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
