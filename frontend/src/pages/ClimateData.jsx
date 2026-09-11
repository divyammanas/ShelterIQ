import React from 'react';
import { Info, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
export const ClimateData = () => {
  const { climateParams, updateClimateParams, runActiveSimulation } = useApp();
    const handleSliderChange = (key, value) => {
        updateClimateParams({ [key]: value });
        setTimeout(() => runActiveSimulation(), 100);
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <div className="lg:col-span-12 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <Sun size={16} className="text-yellow-500"/> Site Climate Properties
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Latitude</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">34.0° N</span>
            </label>
            <input type="text" value="34.0" disabled className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed text-zinc-400 dark:text-zinc-600 font-mono"/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Diurnal Mean Temp</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.tMean.toFixed(1)}°C</span>
            </label>
            <input type="range" min="-25" max="5" step="0.5" value={climateParams.tMean} onChange={(e) => handleSliderChange('tMean', parseFloat(e.target.value))}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Diurnal Amplitude</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.tAmp.toFixed(1)}°C</span>
            </label>
            <input type="range" min="3" max="18" step="0.5" value={climateParams.tAmp} onChange={(e) => handleSliderChange('tAmp', parseFloat(e.target.value))}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Solar Peak GHI</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.ghiPeak} W/m²</span>
            </label>
            <input type="range" min="200" max="1000" step="10" value={climateParams.ghiPeak} onChange={(e) => handleSliderChange('ghiPeak', parseInt(e.target.value))}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Average Wind Speed</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.windMean.toFixed(1)} m/s</span>
            </label>
            <input type="range" min="0" max="12" step="0.1" value={climateParams.windMean} onChange={(e) => handleSliderChange('windMean', parseFloat(e.target.value))}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Relative Humidity</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.rhMean}%</span>
            </label>
            <input type="range" min="10" max="90" step="1" value={climateParams.rhMean} onChange={(e) => handleSliderChange('rhMean', parseInt(e.target.value))}/>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Cloud Cover</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{climateParams.cloudMean}%</span>
            </label>
            <input type="range" min="0" max="100" step="1" value={climateParams.cloudMean} onChange={(e) => handleSliderChange('cloudMean', parseInt(e.target.value))}/>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5"/>
          <div>
            <strong className="text-zinc-950 dark:text-white">High-Altitude Cold Desert Profile:</strong>
            <p className="mt-1">
              Ladakh features high GHI clarity due to thin air (~3500m elevation) combined with extremely low winter temperatures. This profile simulates sub-zero ambient temperatures (-17°C night lows) while offering high solar potential on South-facing vertical walls.
            </p>
          </div>
        </div>
      </div>

    </div>);
};
