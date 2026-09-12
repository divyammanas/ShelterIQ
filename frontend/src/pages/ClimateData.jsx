import React from 'react';
import { Info, Sun, Database, Sparkles, Thermometer, Wind, Droplets, Calendar, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ClimateData = () => {
  const {
    climateParams,
    updateClimateParams,
    runActiveSimulation,
    climateSource,
    selectedScenario,
    climateSummary,
    availableScenarios,
    selectRealClimateScenario,
    switchToSynthetic
  } = useApp();

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

  const activeScenarioMeta = availableScenarios.find(s => s.id === selectedScenario);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Main Climate Panel */}
      <div className="lg:col-span-12 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-6">
        
        {/* Header & Source Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Sun size={16} className="text-yellow-500" /> Site Climate Properties & Weather Data
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Configure real historical Leh weather (2021–2025) or synthetic diurnal model to drive all thermal simulations.
            </p>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleModeSwitch('real')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                climateSource === 'real'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Database size={13} />
              <span>Real Leh Dataset (5-Yr)</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('synthetic')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                climateSource === 'synthetic'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles size={13} />
              <span>Synthetic Model</span>
            </button>
          </div>
        </div>

        {/* Real Historical Weather Mode */}
        {climateSource === 'real' && (
          <div className="flex flex-col gap-6">
            
            {/* Scenario Selection Box */}
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Calendar size={14} /> Active Climate Scenario
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  {activeScenarioMeta ? activeScenarioMeta.description : "Historical hourly records from Leh weather station."}
                </p>
                {activeScenarioMeta && (
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Range: {activeScenarioMeta.start} → {activeScenarioMeta.end} ({activeScenarioMeta.duration_h} hours)
                  </span>
                )}
              </div>

              <div className="shrink-0">
                <select
                  value={selectedScenario}
                  onChange={(e) => handleScenarioChange(e.target.value)}
                  className="bg-white dark:bg-[#121622] border border-blue-200 dark:border-blue-900/60 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer shadow-xs"
                >
                  {availableScenarios.map((scen) => (
                    <option key={scen.id} value={scen.id}>
                      {scen.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5-Year Overall Statistics Summary Cards */}
            {climateSummary && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    5-Year Dataset Overview ({climateSummary.total_records.toLocaleString()} Verified Hourly Records)
                  </span>
                  <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {climateSummary.location}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Temp Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Thermometer size={14} className="text-red-500" /> Temperature</span>
                      <span className="font-mono text-[11px]">{climateSummary.temperature.mean}°C mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Record Low</span>
                        <p className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">{climateSummary.temperature.min}°C</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Summer High</span>
                        <p className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">{climateSummary.temperature.max}°C</p>
                      </div>
                    </div>
                  </div>

                  {/* Solar Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Sun size={14} className="text-amber-500" /> Solar Radiation (GHI)</span>
                      <span className="font-mono text-[11px]">{climateSummary.ghi.mean} W/m² mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Peak GHI</span>
                        <p className="text-lg font-extrabold font-mono text-amber-500">{climateSummary.ghi.max} W/m²</p>
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
                      <span className="font-mono text-[11px]">{climateSummary.wind.mean} m/s mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Peak Gust</span>
                        <p className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{climateSummary.wind.max} m/s</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Calm Low</span>
                        <p className="text-lg font-extrabold font-mono text-zinc-400">{climateSummary.wind.min} m/s</p>
                      </div>
                    </div>
                  </div>

                  {/* Humidity Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-zinc-500 text-xs">
                      <span className="font-semibold flex items-center gap-1.5"><Droplets size={14} className="text-blue-500" /> Relative Humidity</span>
                      <span className="font-mono text-[11px]">{climateSummary.humidity.mean}% mean</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400">Dry Min</span>
                        <p className="text-lg font-extrabold font-mono text-indigo-500">{climateSummary.humidity.min}%</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-zinc-400">Wet Max</span>
                        <p className="text-lg font-extrabold font-mono text-zinc-400">{climateSummary.humidity.max}%</p>
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
        )}

        {/* Informational Callout */}
        <div className="mt-2 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5"/>
          <div>
            <strong className="text-zinc-950 dark:text-white">High-Altitude Cold Desert Physics & Solar Radiation:</strong>
            <p className="mt-1">
              At 3,500m elevation, Leh experiences atmospheric pressure ~66 kPa and optical air mass with minimal vapor attenuation. This generates intense clear-sky GHI peaks (frequently surpassing 1,000 W/m²) alongside sub-zero winter temperatures reaching down to -39°C. The active weather scenario feeds directly into the building thermal model, conduction calculations, sol-air surface temperature transformations, and design optimizations.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

