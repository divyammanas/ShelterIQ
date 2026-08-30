import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  Thermometer, 
  Timer, 
  Box, 
  Zap, 
  ShieldCheck, 
  AlertTriangle,
  Lightbulb,
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
    const textStyle = { color: isDarkMode ? '#a1a1aa' : '#52525b', fontFamily: 'Inter, sans-serif' };
    const gridBorderColor = isDarkMode ? '#27272a' : '#e4e4e7';
    
    return {
      backgroundColor: 'transparent',
      color: ['#f87171', '#34d399', '#60a5fa'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        borderColor: gridBorderColor,
        textStyle: { color: isDarkMode ? '#ffffff' : '#09090b' }
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
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } },
        splitLine: { lineStyle: { color: gridBorderColor } }
      },
      series: [
        {
          name: 'Indoor Air',
          type: 'line',
          data: simResult.T_air,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3 }
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
    const textStyle = { color: isDarkMode ? '#a1a1aa' : '#52525b', fontFamily: 'Inter, sans-serif' };
    const gridBorderColor = isDarkMode ? '#27272a' : '#e4e4e7';
    
    return {
      backgroundColor: 'transparent',
      color: ['#facc15', '#3b82f6', '#f97316', '#14b8a6'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        borderColor: gridBorderColor,
        textStyle: { color: isDarkMode ? '#ffffff' : '#09090b' }
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
        axisLabel: { textStyle },
        axisLine: { lineStyle: { color: gridBorderColor } },
        splitLine: { lineStyle: { color: gridBorderColor } }
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
          data: simResult.conduction_loss_W.map(v => -v), // map loss as negative flow direction
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
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
              <Thermometer size={16} className="text-red-500" /> Temperature Profile
            </h3>
            <div className="h-[240px] w-full">
              {simResult ? (
                <ReactECharts 
                  option={getTempChartOption()} 
                  style={{ height: '100%', width: '100%' }}
                  theme={isDarkMode ? 'dark' : 'light'}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400">Loading thermal models...</div>
              )}
            </div>
          </div>

          {/* Compact KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Indoor Min</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white font-mono">{minTemp} °C</span>
            </div>
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Indoor Max</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white font-mono">{maxTemp} °C</span>
            </div>
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Comfort Hours</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white font-mono">{comfortHours} h</span>
            </div>
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Heating Demand</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white font-mono">{heatingEnergy.toFixed(1)} kWh</span>
            </div>
          </div>

          {/* Instantaneous Heat Balance Card */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Instantaneous Heat Balance (Hour {activeHour.toFixed(1)}h)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Solar Gain</span>
                <span className="text-sm font-bold text-yellow-500 font-mono">+{current.solar_gain.toFixed(0)} W</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Conduction</span>
                <span className={`text-sm font-bold font-mono ${current.conduction_loss > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {current.conduction_loss > 0 ? `-${current.conduction_loss.toFixed(0)}` : `+${Math.abs(current.conduction_loss).toFixed(0)}`} W
                </span>
              </div>
              <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ventilation</span>
                <span className="text-sm font-bold text-orange-500 font-mono">-{current.ventilation_loss.toFixed(0)} W</span>
              </div>
              <div className="flex flex-col gap-1 pb-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Infiltration</span>
                <span className="text-sm font-bold text-purple-500 font-mono">-{ (current.ventilation_loss * 0.15).toFixed(0) } W</span>
              </div>
              <div className="flex flex-col gap-1 pb-3">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Thermal Mass</span>
                <span className={`text-sm font-bold font-mono ${current.storage_rate > 0 ? 'text-pink-500' : 'text-teal-500'}`}>
                  {current.storage_rate > 0 ? `Charging: +${current.storage_rate.toFixed(0)}` : `Discharging: -${Math.abs(current.storage_rate).toFixed(0)}`} W
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border-l-4 border-blue-500 justify-center">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Net Heat Flow</span>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">{current.net_heat_flow.toFixed(0)} W</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (3D Interactive Model Panel) */}
        <div className="xl:col-span-5 flex flex-col gap-4 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm self-stretch">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Box size={16} className="text-blue-500" /> Interactive 3D Model
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('physical')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  viewMode === 'physical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200'
                }`}
              >
                Physical
              </button>
              <button
                onClick={() => setViewMode('thermal')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  viewMode === 'thermal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-200'
                }`}
              >
                Thermal
              </button>
              <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg">
                {activeHour.toFixed(1)}h
              </span>
            </div>
          </div>

          {/* 3D Canvas element wrapper */}
          <div className="h-[320px] w-full relative">
            <ThreeDShelter
              viewMode={viewMode}
              envelopeOpacity={envelopeOpacity}
              visibilityStates={visibilityStates}
              isRotating={isRotating}
            />
          </div>

          {/* Toolbar Controls */}
          <div className="flex flex-col gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={() => setIsRotating(!isRotating)}
                  className={`flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 ${
                    isRotating 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                      : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <RotateCw size={12} />
                  <span>Rotate</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Opacity:</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.05"
                  value={envelopeOpacity}
                  onChange={(e) => setEnvelopeOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Visibility checks */}
            <div className="flex flex-wrap gap-1.5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              {(['roof', 'walls', 'floor', 'openings', 'mass', 'arrows'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleVisibility(key)}
                  className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                    visibilityStates[key]
                      ? 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">Hour:</span>
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
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" /> Current Design Specifications Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800">
          <div className="flex flex-col gap-1 p-2 sm:p-0">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Orientation</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white font-mono">{shelter.orientation_deg}° Azimuth</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Wall U-Value</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white font-mono">{getWallU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Roof U-Value</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white font-mono">{getRoofU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Ventilation (ACH)</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white font-mono">{shelter.ach} ACH</span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Thermal Mass</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white capitalize">
              {thermalMassType === 'none' ? 'None' : thermalMassType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-2 sm:p-0 sm:pl-6">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Climate Location</span>
            <span className="text-sm font-extrabold text-zinc-900 dark:text-white">Ladakh Winter</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid Row (Flow breakdown & Score Gauge & Advisor Recommendations) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left: Flows Chart */}
        <div className="xl:col-span-7 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
            <Timer size={16} className="text-blue-500" /> Energy Flow Breakdown
          </h3>
          <div className="h-[250px] w-full">
            {simResult ? (
              <ReactECharts 
                option={getFlowChartOption()} 
                style={{ height: '100%', width: '100%' }}
                theme={isDarkMode ? 'dark' : 'light'}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400">Loading flow metrics...</div>
            )}
          </div>
        </div>

        {/* Right: Gauge & Advisor splits */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6 self-stretch">
          
          {/* Design Score Gauge */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center relative">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 self-start mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-500" /> Design Score
            </div>
            
            {/* SVG Ring Gauge */}
            <div className="relative w-28 h-28 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="56" 
                  cy="56" 
                  r={radius} 
                  className="fill-none stroke-zinc-100 dark:stroke-zinc-800/80 stroke-[10]"
                />
                <circle 
                  cx="56" 
                  cy="56" 
                  r={radius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="fill-none stroke-blue-500 stroke-[10] stroke-linecap-round transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white font-mono">{score}</span>
                <span className="text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 leading-none mt-1">Points</span>
              </div>
            </div>

            {/* Score Breakdown metrics */}
            <div className="w-full space-y-1.5 mt-4 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 dark:text-zinc-500 font-medium">Comfort Target</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                  {((comfortHours / 72) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 dark:text-zinc-500 font-medium">Auxiliary Heating</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                  {heatingEnergy.toFixed(1)} kWh
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 dark:text-zinc-500 font-medium">Stability Index</span>
                <span className="font-bold text-zinc-900 dark:text-white font-mono">
                  ±{stdVal.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          {/* Advisor recommendations */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col self-stretch">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5 shrink-0">
              <Lightbulb size={14} className="text-amber-500" /> Advisor Recommendations
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
              {recommendations.map((rec, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    rec.type === 'danger'
                      ? 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-950/20 text-red-800 dark:text-red-300'
                      : rec.type === 'warning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950/20 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {rec.type === 'danger' ? (
                      <AlertTriangle size={14} className="text-red-500" />
                    ) : rec.type === 'warning' ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : (
                      <ShieldCheck size={14} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <div className="font-extrabold mb-0.5">{rec.title}</div>
                    <div>{rec.desc}</div>
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
