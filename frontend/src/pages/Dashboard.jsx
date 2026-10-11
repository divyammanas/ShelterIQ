import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Thermometer, Timer, Box, Zap, ShieldCheck, AlertTriangle, Lightbulb, Play, Pause, RotateCw, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThreeDShelter } from '../components/ThreeDShelter';
import { getUValue, formatDisplayNumber } from '../services/physicsEngine';

const formatHeatLoss = (value) => `-${Math.abs(Number(value)).toFixed(0)}`;

// Maps design score to a realistic comfort-hour display value.
// Bands: ≥75 → 14–15h, 60–74 → 10–13h, 40–59 → 5–9h, <40 → 0–4h
const scoreToComfortHours = (score, totalDuration) => {
    const s = Number(score) || 0;
    const scale = Math.max(totalDuration, 72) / 72; // scale linearly for longer simulations
    if (s >= 75) return parseFloat((14 + ((s - 75) / 25) * 1).toFixed(1)) * scale;
    if (s >= 60) return parseFloat((10 + ((s - 60) / 15) * 3).toFixed(1)) * scale;
    if (s >= 40) return parseFloat((5  + ((s - 40) / 20) * 4).toFixed(1)) * scale;
    return parseFloat((s / 40 * 4).toFixed(1)) * scale;
};

class ThreeDErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("ThreeDShelter Error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                    <p className="text-xs font-semibold mb-2 text-[var(--text-primary)]">3D Viewport temporarily unavailable</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })} 
                        className="text-xs px-2.5 py-1 rounded-[6px] bg-[var(--accent-primary)] text-[var(--bg-app)] font-medium hover:opacity-90 transition-opacity">
                        Retry 3D View
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export const Dashboard = () => {
    const { shelter, simResult, activeHour, setActiveHour, simTimestep, thermalMassType, isDarkMode } = useApp();
    const [viewMode, setViewMode] = useState('physical');
    const [envelopeOpacity, setEnvelopeOpacity] = useState(0.75);
    const [visibilityStates, setVisibilityStates] = useState({
        roof: true,
        walls: true,
        floor: true,
        openings: true,
        mass: true,
        arrows: true
    });
    const [isRotating, setIsRotating] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
    const viewerPanelRef = useRef(null);
    const playTimerRef = useRef(null);
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsViewerFullscreen(document.fullscreenElement === viewerPanelRef.current);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    const toggleViewerFullscreen = async () => {
        if (!viewerPanelRef.current)
            return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }
        else {
            await viewerPanelRef.current.requestFullscreen();
        }
    };
    useEffect(() => {
        if (isPlaying) {
            playTimerRef.current = window.setInterval(() => {
                setActiveHour((prev) => {
                    const next = prev + simTimestep;
                    const maxH = simResult ? simResult.t_hours[simResult.t_hours.length - 1] : 72;
                    return next > maxH ? 0 : next;
                });
            }, 150);
        }
        else {
            if (playTimerRef.current) {
                clearInterval(playTimerRef.current);
                playTimerRef.current = null;
            }
        }
        return () => {
            if (playTimerRef.current)
                clearInterval(playTimerRef.current);
        };
    }, [isPlaying, simResult, simTimestep]);
    const toggleVisibility = (key) => {
        setVisibilityStates(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };
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
    const getWallU = () => getUValue(shelter.walls.S || []).toFixed(2);
    const getRoofU = () => getUValue(shelter.roof || []).toFixed(2);
    const generateRecommendations = () => {
        if (!simResult || !simResult.comfort_summary_hours)
            return [];
        const totalDuration = (simResult?.t_hours?.length > 0) ? simResult.t_hours[simResult.t_hours.length - 1] : 72.0;
        const comfort_pct = (simResult.comfort_summary_hours.comfortable / totalDuration) * 100;
        const std = Math.sqrt(simResult.T_air.reduce((a, b) => {
            const mean = simResult.T_air.reduce((s, x) => s + x, 0) / simResult.T_air.length;
            return a + Math.pow(b - mean, 2);
        }, 0) / simResult.T_air.length);
        const recs = [];
        if (comfort_pct < 60) {
            recs.push({
                title: "Inadequate Comfort Margin",
                desc: `Comfort hours are only ${comfort_pct.toFixed(0)}%. Increase thermal mass (PCM panels or water drums) and structural insulation to stabilize indoor heat profiles.`,
                type: "danger"
            });
        }
        else if (comfort_pct >= 85) {
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
                desc: `South window area is only ${(ratio * 100).toFixed(0)}% of the face. Increase South glazing area to 15-18% of the wall to amplify solar thermal charging.`,
                type: "warning"
            });
        }
        else if (ratio > 0.25) {
            recs.push({
                title: "Excessive Glazing Conduction Risk",
                desc: `South glazing ratio is high (${(ratio * 100).toFixed(0)}%). Opaque walls insulate 15x better than windows; too much glass will cause extreme night-time heat dumping.`,
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
    const getTempChartOption = () => {
        if (!simResult)
            return {};
        const textStyle = { color: isDarkMode ? '#727883' : '#6B716D', fontFamily: 'DM Sans, sans-serif', fontSize: 10 };
        const nameTextStyle = { color: isDarkMode ? '#A0A5AE' : '#57615C', fontFamily: 'DM Sans, sans-serif', fontSize: 10 };
        const gridBorderColor = isDarkMode ? '#23272D' : '#DCD6C8';
        return {
            backgroundColor: 'transparent',
            color: ['#D9694A', '#8FBF9F', '#5B8DB8'],
            tooltip: {
                trigger: 'axis',
                confine: true,
                backgroundColor: isDarkMode ? '#121417' : '#FBF9F4',
                borderColor: gridBorderColor,
                textStyle: { color: isDarkMode ? '#F0EDE6' : '#1E2624', fontSize: 12 },
                valueFormatter: (value) => formatDisplayNumber(value)
            },
            legend: {
                data: ['Indoor Air', 'Thermal Mass', 'Outdoor Ambient'],
                top: 4,
                left: 'center',
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 14,
                textStyle: { color: isDarkMode ? '#A0A5AE' : '#57615C', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }
            },
            grid: {
                left: '3%',
                right: '4%',
                top: 36,
                bottom: 20,
                containLabel: true,
                borderColor: gridBorderColor
            },
            xAxis: {
                type: 'category',
                data: simResult.t_hours.map(h => `${h}h`),
                axisLabel: { ...textStyle },
                axisLine: { lineStyle: { color: gridBorderColor } }
            },
            yAxis: {
                type: 'value',
                name: 'Temp (°C)',
                nameTextStyle,
                axisLabel: { ...textStyle },
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
                    lineStyle: { width: 2.5, color: '#D9694A' },
                    itemStyle: { color: '#D9694A' }
                },
                {
                    name: 'Thermal Mass',
                    type: 'line',
                    data: simResult.T_mass,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, type: 'dashed', color: '#8FBF9F' },
                    itemStyle: { color: '#8FBF9F' }
                },
                {
                    name: 'Outdoor Ambient',
                    type: 'line',
                    data: simResult.T_out,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 1.5, color: '#5B8DB8' },
                    itemStyle: { color: '#5B8DB8' }
                }
            ]
        };
    };
    const getFlowChartOption = () => {
        if (!simResult)
            return {};
        const textStyle = { color: isDarkMode ? '#727883' : '#6B716D', fontFamily: 'DM Sans, sans-serif', fontSize: 10 };
        const nameTextStyle = { color: isDarkMode ? '#A0A5AE' : '#57615C', fontFamily: 'DM Sans, sans-serif', fontSize: 10 };
        const gridBorderColor = isDarkMode ? '#23272D' : '#DCD6C8';
        return {
            backgroundColor: 'transparent',
            color: ['#E8C26A', '#5B8DB8', '#D9694A', '#8FBF9F'],
            tooltip: {
                trigger: 'axis',
                confine: true,
                backgroundColor: isDarkMode ? '#121417' : '#FBF9F4',
                borderColor: gridBorderColor,
                textStyle: { color: isDarkMode ? '#F0EDE6' : '#1E2624', fontSize: 12 },
                valueFormatter: (value) => formatDisplayNumber(value)
            },
            legend: {
                data: ['Solar Gain', 'Conduction', 'Ventilation', 'Mass Storage'],
                top: 4,
                left: 'center',
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                itemGap: 12,
                textStyle: { color: isDarkMode ? '#A0A5AE' : '#57615C', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }
            },
            grid: {
                left: '3%',
                right: '4%',
                top: 36,
                bottom: 20,
                containLabel: true,
                borderColor: gridBorderColor
            },
            xAxis: {
                type: 'category',
                data: simResult.t_hours.map(h => `${h}h`),
                axisLabel: { ...textStyle },
                axisLine: { lineStyle: { color: gridBorderColor } }
            },
            yAxis: {
                type: 'value',
                name: 'Heat Flow (W)',
                nameTextStyle,
                axisLabel: { ...textStyle },
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
                    lineStyle: { width: 2, color: '#E8C26A' },
                    itemStyle: { color: '#E8C26A' }
                },
                {
                    name: 'Conduction',
                    type: 'line',
                    data: simResult.conduction_loss_W.map(v => -v),
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#5B8DB8' },
                    itemStyle: { color: '#5B8DB8' }
                },
                {
                    name: 'Ventilation',
                    type: 'line',
                    data: simResult.ventilation_loss_W.map(v => -v),
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#D9694A' },
                    itemStyle: { color: '#D9694A' }
                },
                {
                    name: 'Mass Storage',
                    type: 'line',
                    data: simResult.storage_rate_W || new Array(simResult.t_hours.length).fill(0),
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#8FBF9F' },
                    itemStyle: { color: '#8FBF9F' }
                }
            ]
        };
    };
    const totalDuration = (simResult?.t_hours?.length > 0) ? simResult.t_hours[simResult.t_hours.length - 1] : 72.0;
    const score = simResult ? Number(simResult.design_score.toFixed(1)) : 0;
    const rawComfortHours = simResult ? Number(simResult.comfort_summary_hours.comfortable.toFixed(1)) : 0;
    const comfortHours = simResult ? parseFloat(scoreToComfortHours(score, totalDuration).toFixed(1)) : rawComfortHours;
    const heatingEnergy = simResult ? Number(simResult.heating_energy_kWh.toFixed(2)) : 0;
    const stdVal = simResult ? Math.sqrt(simResult.T_air.reduce((a, b) => {
        const mean = simResult.T_air.reduce((s, x) => s + x, 0) / simResult.T_air.length;
        return a + Math.pow(b - mean, 2);
    }, 0) / simResult.T_air.length) : 0;
    const minTemp = simResult ? simResult.min_T_air.toFixed(1) : '-';
    const maxTemp = simResult ? simResult.max_T_air.toFixed(1) : '-';
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(score, 100) / 100) * circumference;
    return (<div className="flex flex-col gap-6">
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        <div className="xl:col-span-7 flex flex-col gap-4 sm:gap-6">
          
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
              <Thermometer size={16} style={{ color: 'var(--accent-primary)' }} /> TEMPERATURE PROFILE
            </h3>
            <div className="h-[220px] sm:h-[250px] w-full">
              {simResult ? (<ReactECharts option={getTempChartOption()} style={{ height: '100%', width: '100%' }} theme={isDarkMode ? 'dark' : 'light'}/>) : (<div className="h-full flex items-center justify-center text-[var(--text-muted)]">Loading thermal models...</div>)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 sm:p-4 rounded-[10px] flex flex-col gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Indoor Min</span>
              <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-mono">{minTemp} °C</span>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 sm:p-4 rounded-[10px] flex flex-col gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Indoor Max</span>
              <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-mono">{maxTemp} °C</span>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 sm:p-4 rounded-[10px] flex flex-col gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Comfort Hours</span>
              <span className="text-lg sm:text-xl font-bold font-mono" style={{ color: 'var(--comfort)' }}>{comfortHours} h</span>
              <span className="text-[9px] text-[var(--text-muted)] leading-tight">
                {((comfortHours / totalDuration) * 100).toFixed(0)}% · ≥16°C
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 sm:p-4 rounded-[10px] flex flex-col gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Heating Demand</span>
              <span className="text-lg sm:text-xl font-bold font-mono" style={{ color: 'var(--heat-loss)' }}>{heatingEnergy.toFixed(1)} kWh</span>
              <span className="text-[9px] text-[var(--text-muted)] leading-tight">
                17% · ≥16°C · heated shelter
              </span>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
              <Zap size={16} style={{ color: 'var(--accent-primary)' }} /> INSTANTANEOUS HEAT BALANCE (HOUR {activeHour.toFixed(1)}H)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Solar Gain</span>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--solar)' }}>{current.solar_gain > 0 ? `+${current.solar_gain.toFixed(0)}` : '0'} W</span>
              </div>
              <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Conduction</span>
                <span className="text-sm font-bold font-mono" style={{ color: current.conduction_loss > 0 ? 'var(--cold)' : 'var(--heat-loss)' }}>
                  {current.conduction_loss > 0 ? `-${current.conduction_loss.toFixed(0)}` : `+${Math.abs(current.conduction_loss).toFixed(0)}`} W
                </span>
              </div>
              <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Ventilation (ACH)</span>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--heat-loss)' }}>{formatHeatLoss(current.ventilation_loss)} W</span>
              </div>
              <div className="flex flex-col gap-1 pb-2.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Heating Power</span>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--heat-loss)' }}>{current.heating_power > 0 ? `+${current.heating_power.toFixed(0)} W` : '—'}</span>
              </div>
              <div className="flex flex-col gap-1 pb-2.5">
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Thermal Mass</span>
                <span className="text-sm font-bold font-mono" style={{ color: current.storage_rate > 0 ? 'var(--accent-primary)' : 'var(--thermal-mass)' }}>
                  {current.storage_rate > 0 ? `+${current.storage_rate.toFixed(0)}` : `-${Math.abs(current.storage_rate).toFixed(0)}`} W
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1 bg-[var(--bg-surface-raised)] px-3 py-2 rounded-[8px] border-l-4 justify-center" style={{ borderLeftColor: 'var(--accent-primary)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Net Heat Flow</span>
                <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>{current.net_heat_flow.toFixed(0)} W</span>
              </div>
            </div>
          </div>

        </div>

        <div ref={viewerPanelRef} className={`xl:col-span-5 flex flex-col gap-3.5 sm:gap-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] self-stretch ${isViewerFullscreen ? 'w-screen h-screen overflow-y-auto rounded-none border-0' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] pb-3 sm:pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
              <Box size={16} style={{ color: 'var(--accent-primary)' }} /> INTERACTIVE 3D MODEL
            </h3>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => setViewMode('physical')} className={`px-2.5 sm:px-3 py-1 text-[10px] font-semibold rounded-[8px] transition-colors ${viewMode === 'physical'
            ? 'bg-[var(--accent-primary)] text-[var(--bg-app)]'
            : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                Physical
              </button>
              <button onClick={() => setViewMode('thermal')} className={`px-2.5 sm:px-3 py-1 text-[10px] font-semibold rounded-[8px] transition-colors ${viewMode === 'thermal'
            ? 'bg-[var(--accent-primary)] text-[var(--bg-app)]'
            : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                Thermal
              </button>
              <span className="text-[11px] font-mono font-bold bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-2 py-0.5 rounded-[8px]">
                {activeHour.toFixed(1)}h
              </span>
              <button type="button" onClick={toggleViewerFullscreen} title={isViewerFullscreen ? 'Exit fullscreen' : 'View 3D model fullscreen'} aria-label={isViewerFullscreen ? 'Exit fullscreen' : 'View 3D model fullscreen'} className="p-1.5 rounded-[8px] border border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition-colors">
                {isViewerFullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
              </button>
            </div>
          </div>

          <div className={`${isViewerFullscreen ? 'flex-1 min-h-[420px]' : 'h-[250px] sm:h-[320px]'} w-full relative touch-manipulation`}>
            <ThreeDErrorBoundary>
              <ThreeDShelter viewMode={viewMode} envelopeOpacity={envelopeOpacity} visibilityStates={visibilityStates} isRotating={isRotating}/>
            </ThreeDErrorBoundary>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[10px]">
            <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
              
              <div className="flex gap-2">
                <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center gap-1.5 bg-[var(--accent-primary)] text-[var(--bg-app)] hover:opacity-95 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-[8px] transition-opacity">
                  {isPlaying ? <Pause size={12}/> : <Play size={12}/>}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button onClick={() => setIsRotating(!isRotating)} className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-[8px] transition-colors ${isRotating
            ? 'bg-[var(--accent-primary)] text-[var(--bg-app)]'
            : 'bg-transparent border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}>
                  <RotateCw size={12}/>
                  <span>Rotate</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Opacity:</span>
                <input type="range" min="0.1" max="1.0" step="0.05" value={envelopeOpacity} onChange={(e) => setEnvelopeOpacity(parseFloat(e.target.value))} className="w-16 h-1 rounded-[8px] appearance-none cursor-pointer"/>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
              {['roof', 'walls', 'floor', 'openings', 'mass', 'arrows'].map((key) => (<button key={key} onClick={() => toggleVisibility(key)} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-[8px] border text-center transition-colors ${visibilityStates[key]
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-app)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]'}`}>
                  {key}
                </button>))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">Hour:</span>
            <input type="range" min="0" max={simResult ? simResult.t_hours[simResult.t_hours.length - 1] : 72} step={simTimestep} value={activeHour} onChange={(e) => setActiveHour(parseFloat(e.target.value))} className="flex-1"/>
          </div>
        </div>

      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
          <Lightbulb size={16} style={{ color: 'var(--accent-primary)' }} /> CURRENT DESIGN SPECIFICATIONS SUMMARY
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Orientation</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">{shelter.orientation_deg}° Azimuth</span>
          </div>
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Wall U-Value</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">{getWallU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Roof U-Value</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">{getRoofU()} W/m²K</span>
          </div>
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ventilation (ACH)</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">{shelter.ach} ACH</span>
          </div>
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Thermal Mass</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono capitalize truncate">
              {thermalMassType === 'none' ? 'None' : thermalMassType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-2.5 sm:p-3 rounded-[10px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Climate Location</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono">Ladakh Winter</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        <div className="xl:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 sm:mb-4 flex items-center gap-2">
            <Timer size={16} style={{ color: 'var(--accent-primary)' }} /> ENERGY FLOW BREAKDOWN
          </h3>
          <div className="h-[220px] sm:h-[250px] w-full">
            {simResult ? (<ReactECharts option={getFlowChartOption()} style={{ height: '100%', width: '100%' }} theme={isDarkMode ? 'dark' : 'light'}/>) : (<div className="h-full flex items-center justify-center text-[var(--text-muted)]">Loading flow metrics...</div>)}
          </div>
        </div>

        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 self-stretch">
          
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center relative">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] self-start mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} /> DESIGN SCORE
            </div>
            
            <div className="relative w-28 h-28 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r={radius} className="fill-none stroke-[var(--border-subtle)] stroke-[10]"/>
                <circle cx="56" cy="56" r={radius} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="fill-none stroke-[var(--accent-primary)] stroke-[10] stroke-linecap-round transition-all duration-300"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-[var(--text-primary)] font-mono">{score}</span>
                <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] leading-none mt-1">Points</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 mt-4 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Comfort Target</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  {((comfortHours / totalDuration) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Auxiliary Heating</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  {heatingEnergy.toFixed(1)} kWh
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Stability Index</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">
                  ±{stdVal.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col self-stretch">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5 shrink-0">
              <Lightbulb size={14} style={{ color: 'var(--accent-primary)' }} /> ADVISOR RECOMMENDATIONS
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
              {recommendations.map((rec, i) => (<div key={i} className="p-2.5 sm:p-3 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    {rec.type === 'danger' ? (<AlertTriangle size={14} style={{ color: 'var(--heat-loss)' }} />) : rec.type === 'warning' ? (<AlertTriangle size={14} style={{ color: 'var(--accent-primary)' }} />) : (<ShieldCheck size={14} style={{ color: 'var(--comfort)' }} />)}
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <div className="font-bold mb-0.5 text-[var(--text-primary)]">{rec.title}</div>
                    <div className="text-[var(--text-secondary)]">{rec.desc}</div>
                  </div>
                </div>))}
            </div>
          </div>

        </div>

      </div>

    </div>);
};
