import React from 'react';
import { Sliders, Table, FileSpreadsheet, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SimulationSetup: React.FC = () => {
  const {
    simDuration,
    setSimDuration,
    simTimestep,
    setSimTimestep,
    internalGains,
    setInternalGains,
    heatingEnabled,
    setHeatingEnabled,
    heatingSetpoint,
    setHeatingSetpoint,
    T_air0,
    setT_air0,
    T_mass0,
    setT_mass0,
    simResult,
    runActiveSimulation
  } = useApp();

  const handleSliderChange = (setter: (val: number) => void, val: number) => {
    setter(val);
    setTimeout(() => runActiveSimulation(), 100);
  };

  const handleSelectChange = (setter: (val: number) => void, val: number) => {
    setter(val);
    setTimeout(() => runActiveSimulation(), 100);
  };

  const handleToggleChange = (val: boolean) => {
    setHeatingEnabled(val);
    setTimeout(() => runActiveSimulation(), 100);
  };

  const exportTimeseriesCSV = () => {
    if (!simResult) return;
    const headers = ["Hour", "T_out_C", "T_air_C", "T_mass_C", "solar_gain_W", "conduction_loss_W", "ventilation_loss_W", "net_heat_flow_W", "storage_rate_W", "comfort_status"];
    const csvRows = [headers.join(",")];
    
    const t = simResult.t_hours;
    for (let k = 0; k < t.length; k++) {
      const r = [
        t[k].toFixed(1),
        simResult.T_out[k].toFixed(2),
        simResult.T_air[k].toFixed(2),
        simResult.T_mass[k].toFixed(2),
        simResult.solar_gain_W[k].toFixed(1),
        simResult.conduction_loss_W[k].toFixed(1),
        simResult.ventilation_loss_W[k].toFixed(1),
        simResult.net_heat_flow_W[k].toFixed(1),
        (simResult.storage_rate_W ? simResult.storage_rate_W[k] : 0).toFixed(1),
        simResult.comfort_status[k]
      ];
      csvRows.push(r.join(","));
    }
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shelter_simulation_timeseries_${simDuration}h.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getComfortBadge = (status: string) => {
    switch (status) {
      case 'comfortable':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      case 'marginal':
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      default:
        return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30';
    }
  };

  // Sample every 4th step for preview readability
  const getSampledRows = () => {
    if (!simResult) return [];
    const rows = [];
    for (let k = 0; k < simResult.t_hours.length; k += 4) {
      rows.push({
        time: simResult.t_hours[k],
        T_out: simResult.T_out[k],
        T_air: simResult.T_air[k],
        T_mass: simResult.T_mass[k],
        solar: simResult.solar_gain_W[k],
        conduction: simResult.conduction_loss_W[k],
        status: simResult.comfort_status[k]
      });
    }
    return rows;
  };

  const sampledRows = getSampledRows();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Settings Grid */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <Sliders size={16} className="text-blue-500" /> Run Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Simulation Duration</label>
            <select
              value={simDuration}
              onChange={(e) => handleSelectChange(setSimDuration, parseInt(e.target.value))}
              className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 font-medium"
            >
              <option value="24">24 Hours (1 Day)</option>
              <option value="48">48 Hours (2 Days)</option>
              <option value="72">72 Hours (3 Days)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Simulation Timestep (dt)</label>
            <select
              value={simTimestep}
              onChange={(e) => handleSelectChange(setSimTimestep, parseFloat(e.target.value))}
              className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100 font-medium"
            >
              <option value="0.1">0.1 Hour (6 Mins)</option>
              <option value="0.5">0.5 Hour (30 Mins)</option>
              <option value="1.0">1.0 Hour (60 Mins)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Internal Heat Gains</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{internalGains} W</span>
            </label>
            <input
              type="range"
              min="0"
              max="800"
              step="10"
              value={internalGains}
              onChange={(e) => handleSliderChange(setInternalGains, parseInt(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Initial Air Temp (T_air0)</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{T_air0.toFixed(1)}°C</span>
            </label>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={T_air0}
              onChange={(e) => handleSliderChange(setT_air0, parseFloat(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
              <span>Initial Mass Temp (T_mass0)</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{T_mass0.toFixed(1)}°C</span>
            </label>
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={T_mass0}
              onChange={(e) => handleSliderChange(setT_mass0, parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Auxiliary Heating Setpoint */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-4 mt-2">
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
            <div className="flex items-start gap-2.5">
              <Flame size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Auxiliary Heating Setpoint</span>
                <p className="text-[10px] text-zinc-400 leading-normal">Clamps indoor temperature and computes supplemental heating demand (kWh)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={heatingEnabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {heatingEnabled && (
            <div className="flex flex-col gap-1.5 mt-4 max-w-sm animate-fade-in">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Heating Target Setpoint</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{heatingSetpoint.toFixed(1)}°C</span>
              </label>
              <input
                type="range"
                min="10"
                max="22"
                step="0.5"
                value={heatingSetpoint}
                onChange={(e) => handleSliderChange(setHeatingSetpoint, parseFloat(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Log Preview Table */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
            <Table size={16} className="text-blue-500" /> Transient Log Preview
          </h3>
          <button
            onClick={exportTimeseriesCSV}
            disabled={!simResult}
            className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" /> Export Full CSV
          </button>
        </div>

        {/* Scrollable Table body */}
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-10 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Outdoor Temp (°C)</th>
                <th className="px-6 py-3.5">Indoor Air Temp (°C)</th>
                <th className="px-6 py-3.5">Thermal Mass Temp (°C)</th>
                <th className="px-6 py-3.5">Solar Gain (W)</th>
                <th className="px-6 py-3.5">Conduction Loss (W)</th>
                <th className="px-6 py-3.5">Comfort Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40">
              {sampledRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-3.5 font-bold font-mono">Hour {row.time.toFixed(1)}</td>
                  <td className="px-6 py-3.5 font-mono">{row.T_out.toFixed(1)}°C</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-zinc-800 dark:text-zinc-100">{row.T_air.toFixed(1)}°C</td>
                  <td className="px-6 py-3.5 font-mono">{row.T_mass.toFixed(1)}°C</td>
                  <td className="px-6 py-3.5 font-mono text-yellow-600 dark:text-yellow-400">+{Math.round(row.solar)} W</td>
                  <td className="px-6 py-3.5 font-mono text-blue-500">{Math.round(row.conduction)} W</td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${getComfortBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sampledRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 font-semibold">
                    No simulation logs compiled. Click run simulation or update parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
