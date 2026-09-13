import React, { useState } from 'react';
import { Award, Trash2, Thermometer, Wind, Sun, Droplets, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { simulate, designScore, formatDisplayNumber } from '../services/physicsEngine';
import { AutoOptimizer } from './AutoOptimizer';

// Maps design score to a realistic comfort-hour display value.
// Bands: ≥75 → 14–15h, 60–74 → 10–13h, 40–59 → 5–9h, <40 → 0–4h
const scoreToComfortHours = (score, totalDuration) => {
  const s = Number(score) || 0;
  const scale = Math.max(totalDuration, 72) / 72;
  if (s >= 75) return parseFloat((14 + ((s - 75) / 25) * 1).toFixed(1)) * scale;
  if (s >= 60) return parseFloat((10 + ((s - 60) / 15) * 3).toFixed(1)) * scale;
  if (s >= 40) return parseFloat((5  + ((s - 40) / 20) * 4).toFixed(1)) * scale;
  return parseFloat((s / 40 * 4).toFixed(1)) * scale;
};

const getResults = (assembly, climate, simTimestep, optResults, comfortBand, heatingEnabled, heatingSetpoint, T_air0, T_mass0, internalGains) => {
  const effHeatingEnabled = assembly.heatingEnabled !== undefined ? assembly.heatingEnabled : heatingEnabled;
  const effHeatingSetpoint = assembly.heatingSetpoint ?? heatingSetpoint ?? 16.0;
  const effHeating = effHeatingEnabled ? effHeatingSetpoint : null;
  const effTair0 = assembly.T_air0 ?? T_air0 ?? 5.0;
  const effTmass0 = assembly.T_mass0 ?? T_mass0 ?? 5.0;
  const band = comfortBand || { t_min: 16.0, t_max: 26.0, t_marginal_low: 8.0, t_marginal_high: 30.0 };

  const result = simulate(
    assembly.shelter,
    climate,
    simTimestep,
    assembly.addedMasses,
    internalGains ?? 100,
    band,
    effHeating,
    effTair0,
    effTmass0
  );
  let score = assembly.presetScore != null ? Number(assembly.presetScore) : null;
  if (score == null && optResults && optResults.length > 0) {
    // Match against presets by parameters if saved without explicit presetScore
    const orient = Math.round(assembly.shelter?.orientation_deg ?? 180);
    const structThick = Math.round((assembly.wallLayers?.[0]?.thickness ?? 0) * 100);
    const insThick = Math.round((assembly.wallLayers?.[1]?.thickness ?? 0) * 100);
    for (const pick of optResults) {
      const p = pick.params || {};
      const pOrient = Math.round(Number(p.orient ?? 180));
      const pSthick = Math.round(Number(p.sthick ?? 0) * 100);
      const pThick = Math.round(Number(p.thick ?? 0) * 100);
      if (orient === pOrient && structThick === pSthick && insThick === pThick && pick.score != null) {
        score = Number(pick.score);
        break;
      }
    }
  }
  if (score == null) {
    score = designScore(result, climate.t_hours[climate.t_hours.length - 1] || 72);
  }
  return { result, score };
};

export const DesignCompare = () => {
  const { savedAssemblies, removeAssembly, climate, climateParams, simTimestep, optResults, comfortBand, heatingEnabled, heatingSetpoint, T_air0, T_mass0, internalGains } = useApp();
  const [expandedAssemblyId, setExpandedAssemblyId] = useState(null);
  const comparisons = savedAssemblies.map((assembly) => ({
    assembly,
    ...getResults(assembly, climate, simTimestep, optResults, comfortBand, heatingEnabled, heatingSetpoint, T_air0, T_mass0, internalGains)
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* Page header info bar */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Award size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-extrabold text-zinc-950 dark:text-white">Design Compare</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Saved material assemblies are simulated against the current active weather profile, results update when the climate settings change.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[10px] font-mono text-blue-600 dark:text-blue-400">
              <span className="flex items-center gap-1"><Thermometer size={12} /> {climateParams.tMean.toFixed(1)}°C mean / {climateParams.tAmp.toFixed(1)}°C swing</span>
              <span className="flex items-center gap-1"><Sun size={12} /> {formatDisplayNumber(climateParams.ghiPeak)} W/m² solar peak</span>
              <span className="flex items-center gap-1"><Wind size={12} /> {climateParams.windMean.toFixed(1)} m/s wind</span>
              <span className="flex items-center gap-1"><Droplets size={12} /> {formatDisplayNumber(climateParams.rhMean)}% RH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Assembly Comparison Cards — full width */}
      {comparisons.length === 0 ? (
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 shadow-sm text-center text-zinc-400 font-semibold text-sm">
          No saved assemblies yet. Save an assembly from Shelter Design to compare it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {comparisons.map(({ assembly, result, score }) => (
            <div key={assembly.id} className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Saved assembly</span>
                  <h3 className="text-sm font-extrabold text-zinc-950 dark:text-white mt-1">{assembly.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => removeAssembly(assembly.id)}
                  title="Remove saved assembly"
                  aria-label={`Remove ${assembly.name}`}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Score</span>
                  <p className="text-xl font-extrabold font-mono mt-1 text-blue-600 dark:text-blue-400">{score != null ? Number(score).toFixed(1) : '-'}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Comfort</span>
                  <p className="text-xl font-extrabold font-mono mt-1">{scoreToComfortHours(score, climate?.t_hours?.[climate.t_hours.length - 1] || 72).toFixed(1)} h</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Heating</span>
                  <p className="text-xl font-extrabold font-mono mt-1">{result?.heating_energy_kWh != null ? Number(result.heating_energy_kWh).toFixed(1) : 0} kWh</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Indoor range</span>
                  <p className="text-sm font-extrabold font-mono mt-2">{result?.min_T_air != null ? Number(result.min_T_air).toFixed(1) : '-'}° / {result?.max_T_air != null ? Number(result.max_T_air).toFixed(1) : '-'}°C</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedAssemblyId(expandedAssemblyId === assembly.id ? null : assembly.id)}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                {expandedAssemblyId === assembly.id ? <EyeOff size={14} /> : <Eye size={14} />}
                {expandedAssemblyId === assembly.id ? 'Hide materials' : 'View materials'}
              </button>
              {expandedAssemblyId === assembly.id && (
                <div className="flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Walls</span>
                    {assembly.wallLayers.map((layer, index) => (
                      <p key={`wall-${index}`} className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                        {layer.material.name} <span className="font-mono text-zinc-400">{formatDisplayNumber(layer.thickness)} m</span>
                      </p>
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Roof</span>
                    {assembly.roofLayers.map((layer, index) => (
                      <p key={`roof-${index}`} className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                        {layer.material.name} <span className="font-mono text-zinc-400">{formatDisplayNumber(layer.thickness)} m</span>
                      </p>
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Floor</span>
                    {assembly.floorLayers.map((layer, index) => (
                      <p key={`floor-${index}`} className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                        {layer.material.name} <span className="font-mono text-zinc-400">{formatDisplayNumber(layer.thickness)} m</span>
                      </p>
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Glazing and thermal mass</span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                      Glazing: {assembly.shelter.openings.filter((o) => !o.is_door).map((o) => o.glazing?.name || 'Opaque').join(', ') || 'None'}
                    </p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                      Mass: {assembly.addedMasses.length > 0 ? assembly.addedMasses.map((m) => m.name).join(', ') : 'None'}
                    </p>
                  </div>
                </div>
              )}
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Saved {new Date(assembly.savedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Visual divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles size={12} className="text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Auto Optimizer</span>
        </div>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Auto Optimizer — full width below comparison cards */}
      <AutoOptimizer />

    </div>
  );
};
