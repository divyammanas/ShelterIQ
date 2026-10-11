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
      
      <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-sm flex flex-col gap-4 sm:gap-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
          <ListCollapse size={16} className="text-[var(--accent-primary)]"/> Search Combinatorics
        </h3>

        <div className="space-y-3 sm:space-y-4 text-xs font-medium text-[var(--text-secondary)]">
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <strong className="text-[var(--text-primary)]">Insulation Core:</strong>
            <p>EPS, XPS, Mineral Wool (5cm to 15cm thicknesses)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <strong className="text-[var(--text-primary)]">Structural Core:</strong>
            <p>Granite Stone, Rammed Earth, Lightweight Concrete (20cm to 30cm)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <strong className="text-[var(--text-primary)]">Azimuth Bearing:</strong>
            <p>160° to 200° (South-facing window optimization)</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <strong className="text-[var(--text-primary)]">Window Fraction:</strong>
            <p>10%, 15%, 20% south-facing envelope glazing area</p>
          </div>
          <div className="flex flex-col gap-1 pb-2">
            <strong className="text-[var(--text-primary)]">Ventilation Rate:</strong>
            <p>0.3 to 0.7 ACH (Tight envelope sealing profiles)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button onClick={runOptimizationMC} disabled={isOptimizing} className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-50 text-[var(--bg-app)] text-xs font-semibold px-4 py-2.5 sm:py-3 rounded-xl transition-all shadow-xs cursor-pointer">
            {isOptimizing ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
            <span>{isOptimizing ? 'Optimizing...' : 'Run Seeded Search'}</span>
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-xs font-semibold px-4 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer">
            <Import size={14} className="text-[var(--accent-primary)]"/>
            <span>Load CSV</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden"/>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Optimizer Progress Logs</label>
          <pre ref={logRef} className="w-full h-[150px] sm:h-[180px] bg-[var(--bg-app)] rounded-xl p-3 sm:p-4 text-[10px] text-[var(--text-secondary)] font-mono overflow-y-auto leading-relaxed border border-[var(--border-subtle)] select-all scrollbar-none whitespace-pre-wrap">
            {optLogs}
          </pre>
        </div>

      </div>

      <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-sm flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
            <Award size={16} className="text-[var(--accent-primary)]"/> Top 5 Optimized Picks
          </h3>
          {loadedPreset && (
            <span className="text-[10px] font-bold text-[var(--comfort)] bg-[var(--comfort)]/10 border border-[var(--comfort)]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check size={10} /> Preset #{Number(loadedPreset.id ?? 0) + 1}
            </span>
          )}
        </div>

        {loadedPreset && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)]/40 rounded-xl px-3 py-2 text-xs text-[var(--text-primary)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--comfort)] animate-pulse shrink-0" />
              <span>
                <strong>Preset #{Number(loadedPreset.id ?? 0) + 1}</strong> is active in your shelter design.
              </span>
            </div>
            <a href="#/design" className="font-extrabold text-[var(--accent-primary)] hover:underline flex items-center gap-1 text-[11px] shrink-0">
              View in Design →
            </a>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {normalizedResults.map((result, idx) => {
            const isLoaded = loadedPreset?.id !== undefined && loadedPreset?.id === (result.id ?? idx);
            return (
              <div
                key={result.id ?? idx}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
                  isLoaded
                    ? 'bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)] shadow-md'
                    : 'bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:shadow-xs'
                }`}
              >
                <div className="flex-1 flex flex-col gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-lg font-extrabold text-[10px] shrink-0 ${
                      isLoaded
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-app)]'
                        : 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                    }`}>
                      #{idx + 1}
                    </span>
                    <h4 className="font-extrabold text-xs text-[var(--text-primary)] leading-tight">
                      {getMaterialLabel(result.params.struct)} ({Math.round(Number(result.params.sthick) * 100)}cm) + {getMaterialLabel(result.params.ins)} ({Math.round(Number(result.params.thick) * 100)}cm)
                    </h4>
                    {isLoaded && (
                      <span className="text-[9px] font-bold text-[var(--comfort)] bg-[var(--comfort)]/10 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                        <Check size={9} /> Active
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[9px] font-extrabold uppercase text-[var(--text-muted)]">
                    <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">{formatDisplayNumber(result.params.orient)}° Azimuth</span>
                    <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">{(Number(result.params.win_f) * 100).toFixed(0)}% Glazing</span>
                    <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">{formatDisplayNumber(result.params.ach_val)} ACH</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] shrink-0">
                  <div className="flex sm:flex-col sm:items-end items-center gap-1.5 sm:gap-0">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Score</span>
                    <span className="text-base sm:text-lg font-extrabold text-[var(--accent-primary)] font-mono">{Number(result.score ?? 0).toFixed(1)}</span>
                  </div>

                  <button
                    onClick={() => handleApplyPreset(result.params, result.id ?? idx, result.score)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all cursor-pointer ${
                      isLoaded
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-app)] shadow-xs'
                        : 'border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-surface-raised)] text-[var(--text-primary)]'
                    }`}
                  >
                    <Check size={12}/> {isLoaded ? 'Loaded' : 'Load Preset'}
                  </button>
                </div>
              </div>
            );
          })}

          {normalizedResults.length === 0 && (<div className="flex flex-col items-center justify-center text-center text-[var(--text-muted)] py-16 gap-3">
              <Sparkles size={40} className="text-[var(--border-strong)]"/>
              <p className="text-xs font-semibold">
                Click "Run Seeded Search" on the left panel to execute random-search combined with local-refinement on the simulation engine.
              </p>
            </div>)}
        </div>
      </div>

    </div>);
};
