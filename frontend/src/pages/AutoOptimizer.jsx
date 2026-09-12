import React, { useRef } from 'react';
import { Sparkles, Play, Import, ListCollapse, Award, Loader2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDisplayNumber, parseCSV } from '../services/physicsEngine';
export const AutoOptimizer = () => {
    const { optResults, setOptResults, optLogs, setOptLogs, isOptimizing, runOptimizationMC, loadDesignPreset, loadedPreset } = useApp();
    const fileInputRef = useRef(null);
    const logRef = useRef(null);
    React.useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [optLogs]);
    const handleImportCSV = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                const rows = parseCSV(text);
                if (rows.length > 0) {
                    const parsed = rows.map(r => {
                        const designStr = String(r.design ?? "");
                        const params = {
                            struct: "stone_granite",
                            sthick: 0.3,
                            ins: "xps_insulation",
                            thick: 0.1,
                            orient: 180,
                            win_f: 0.15,
                            ach_val: 0.5
                        };
                        const matMatch = designStr.match(/^([a-zA-Z_]+)\((\d+)cm\)\+([a-zA-Z_]+)\((\d+)cm\)/);
                        if (matMatch) {
                            params.struct = matMatch[1];
                            params.sthick = parseFloat(matMatch[2]) / 100.0;
                            params.ins = matMatch[3];
                            params.thick = parseFloat(matMatch[4]) / 100.0;
                        }
                        const orientMatch = designStr.match(/orient=(\d+)/);
                        if (orientMatch)
                            params.orient = parseFloat(orientMatch[1]);
                        const winMatch = designStr.match(/win=(\d+)%/);
                        if (winMatch)
                            params.win_f = parseFloat(winMatch[1]) / 100.0;
                        const achMatch = designStr.match(/ACH=([\d\.]+)/);
                        if (achMatch)
                            params.ach_val = parseFloat(achMatch[1]);
                        return {
                            score: parseFloat(String(r.score ?? r.design_score ?? 0.0)),
                            params
                        };
                    });
                    setOptResults(parsed);
                    setOptLogs(prev => prev + "\nImported " + parsed.length + " optimization results from CSV.\n");
                }
            }
            catch (err) {
                alert("Invalid CSV format. Please ensure correct headers exist.");
            }
        };
        reader.readAsText(file);
    };
    const handleApplyPreset = (params, id, score) => {
        loadDesignPreset(params, { id, score });
    };
    const getMaterialLabel = (key) => {
        const safeKey = String(key ?? '');
        switch (safeKey) {
            case 'eps_insulation': return 'EPS';
            case 'xps_insulation': return 'XPS';
            case 'mineral_wool': return 'Mineral Wool';
            case 'stone_granite': return 'Granite';
            case 'rammed_earth': return 'Rammed Earth';
            case 'concrete_light': return 'Light Concrete';
            default: return safeKey ? safeKey.replace(/_/g, ' ') : 'Unknown material';
        }
    };

    const normalizedResults = (optResults ?? []).map((result, idx) => {
        const params = result?.params ?? {};
        return {
            ...result,
            id: result?.id ?? idx,
            params: {
                struct: params.struct ?? params.structure ?? 'stone_granite',
                sthick: Number(params.sthick ?? params.structure_thickness_m ?? 0.30),
                ins: params.ins ?? params.insulation ?? 'xps_insulation',
                thick: Number(params.thick ?? params.insulation_thickness_m ?? 0.10),
                orient: Number(params.orient ?? params.orientation_deg ?? 180),
                win_f: Number(params.win_f ?? params.window_fraction ?? 0.15),
                ach_val: Number(params.ach_val ?? params.ach ?? 0.5),
            }
        };
    });

    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <div className="lg:col-span-5 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <ListCollapse size={16} className="text-blue-500"/> Search Combinatorics
        </h3>

        <div className="space-y-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <div className="flex flex-col gap-1 border-b border-zinc-50 dark:border-zinc-900 pb-2">
            <strong className="text-zinc-800 dark:text-zinc-200">Insulation Core:</strong>
            <p>EPS, XPS, Mineral Wool (5cm to 15cm thicknesses)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-zinc-50 dark:border-zinc-900 pb-2">
            <strong className="text-zinc-800 dark:text-zinc-200">Structural Core:</strong>
            <p>Granite Stone, Rammed Earth, Lightweight Concrete (20cm to 30cm)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-zinc-50 dark:border-zinc-900 pb-2">
            <strong className="text-zinc-800 dark:text-zinc-200">Azimuth Bearing:</strong>
            <p>160° to 200° (South-facing window optimization)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-zinc-50 dark:border-zinc-900 pb-2">
            <strong className="text-zinc-800 dark:text-zinc-200">Window Fraction:</strong>
            <p>10%, 15%, 20% south-facing envelope glazing area</p>
          </div>
          <div className="flex flex-col gap-1 pb-2">
            <strong className="text-zinc-800 dark:text-zinc-200">Ventilation Rate:</strong>
            <p>0.3 to 0.7 ACH (Tight envelope sealing profiles)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={runOptimizationMC} disabled={isOptimizing} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all shadow-sm">
            {isOptimizing ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
            <span>{isOptimizing ? 'Optimizing...' : 'Run Seeded Search'}</span>
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-4 py-3 rounded-xl transition-all">
            <Import size={14} className="text-blue-500"/>
            <span>Load CSV</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden"/>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Optimizer Progress Logs</label>
          <pre ref={logRef} className="w-full h-[180px] bg-zinc-950 dark:bg-black rounded-xl p-4 text-[10px] text-zinc-300 font-mono overflow-y-auto leading-relaxed border border-zinc-800 select-all scrollbar-none whitespace-pre-wrap">
            {optLogs}
          </pre>
        </div>

      </div>

      <div className="lg:col-span-7 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
            <Award size={16} className="text-blue-500"/> Top 5 Optimized Passive Shelter Picks
          </h3>
          {loadedPreset && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} /> Preset #{Number(loadedPreset.id ?? 0) + 1} Loaded
            </span>
          )}
        </div>

        {loadedPreset && (
          <div className="flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl px-3.5 py-2.5 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>Preset #{Number(loadedPreset.id ?? 0) + 1}</strong> is currently loaded into your active Shelter Design and simulation.
              </span>
            </div>
            <a href="#/design" className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px] shrink-0 ml-3">
              View in Shelter Design →
            </a>
          </div>
        )}

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {normalizedResults.map((result, idx) => {
            const isLoaded = loadedPreset?.id !== undefined && loadedPreset?.id === (result.id ?? idx);
            return (
              <div
                key={result.id ?? idx}
                className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  isLoaded
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:shadow-sm'
                }`}
              >
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-lg font-extrabold text-[10px] ${
                      isLoaded
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      #{idx + 1}
                    </span>
                    <h4 className="font-extrabold text-xs text-zinc-900 dark:text-white">
                      {getMaterialLabel(result.params.struct)} ({Math.round(Number(result.params.sthick) * 100)}cm) + {getMaterialLabel(result.params.ins)} ({Math.round(Number(result.params.thick) * 100)}cm)
                    </h4>
                    {isLoaded && (
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={9} /> Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-extrabold uppercase text-zinc-400">
                    <span className="bg-zinc-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/20">{formatDisplayNumber(result.params.orient)}° Azimuth</span>
                    <span className="bg-zinc-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/20">{(Number(result.params.win_f) * 100).toFixed(0)}% Glazing</span>
                    <span className="bg-zinc-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/20">{formatDisplayNumber(result.params.ach_val)} ACH</span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col items-end gap-3 justify-between shrink-0">
                  <div className="flex flex-col sm:items-end">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Score</span>
                    <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono">{Number(result.score ?? 0).toFixed(1)}</span>
                  </div>

                  <button
                    onClick={() => handleApplyPreset(result.params, result.id ?? idx, result.score)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-3.5 py-2 rounded-lg transition-all ${
                      isLoaded
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'border border-blue-600 hover:bg-blue-600/5 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <Check size={12}/> {isLoaded ? 'Loaded' : 'Load Preset'}
                  </button>
                </div>
              </div>
            );
          })}

          {normalizedResults.length === 0 && (<div className="flex flex-col items-center justify-center text-center text-zinc-400 py-16 gap-3">
              <Sparkles size={40} className="text-zinc-200 dark:text-zinc-800"/>
              <p className="text-xs font-semibold">
                Click "Run Seeded Search" on the left panel to execute random-search combined with local-refinement on the simulation engine.
              </p>
            </div>)}
        </div>
      </div>

    </div>);
};
