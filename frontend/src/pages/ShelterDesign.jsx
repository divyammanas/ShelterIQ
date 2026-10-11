import React, { useState } from 'react';
import { LayoutGrid, AppWindow, Cpu, Layers, Save, Sparkles, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LayerEditor } from '../components/LayerEditor';
import { DEFAULT_MATERIALS } from '../services/physicsEngine';
export const ShelterDesign = () => {
    const { shelter, setShelter, updateShelterOpenings, updateThermalMass, thermalMassType, thermalMassQty, runActiveSimulation, saveAssembly, savedAssemblies, optResults, loadDesignPreset, loadedPreset, setLoadedPreset } = useApp();
    const [assemblyName, setAssemblyName] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    const getMaterialLabel = (key) => {
        const safeKey = String(key ?? '');
        switch (safeKey) {
            case 'eps_insulation': return 'EPS';
            case 'xps_insulation': return 'XPS';
            case 'mineral_wool': return 'Mineral Wool';
            case 'stone_granite': return 'Granite';
            case 'rammed_earth': return 'Rammed Earth';
            case 'concrete_light': return 'Light Concrete';
            default: return safeKey ? safeKey.replace(/_/g, ' ') : 'Material';
        }
    };

    const normalizedPicks = (optResults ?? []).map((result, idx) => {
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

    const handleSliderChange = (key, value) => {
        setShelter(prev => ({
            ...prev,
            [key]: value
        }));
        if (loadedPreset && !loadedPreset.isModified) {
            setLoadedPreset(prev => prev ? { ...prev, isModified: true } : null);
        }
        setTimeout(() => runActiveSimulation(), 100);
    };
    const handleWindowChange = (updates) => {
        const win = shelter.openings.find(o => !o.is_door);
        const width = updates.width !== undefined ? updates.width : (win?.width || 1.6);
        const height = updates.height !== undefined ? updates.height : (win?.height || 1.2);
        const shgc = updates.shgc !== undefined ? updates.shgc : (win?.shgc || 0.55);
        const glazingKey = updates.glazing !== undefined ? updates.glazing : 'glass_double_lowE';
        updateShelterOpenings(width, height, shgc, glazingKey);
        if (loadedPreset && !loadedPreset.isModified) {
            setLoadedPreset(prev => prev ? { ...prev, isModified: true } : null);
        }
        setTimeout(() => runActiveSimulation(), 100);
    };
    const activeWindow = shelter.openings.find(o => !o.is_door) || {
        width: 1.6,
        height: 1.2,
        shgc: 0.55,
        glazing: { name: 'Double Glazing Low-E' }
    };
    const getMassLabel = () => {
        if (thermalMassType === 'water_drums')
            return 'Drums Quantity';
        if (thermalMassType === 'concrete_wall')
            return 'Wall Length';
        if (thermalMassType === 'pcm_panels')
            return 'Panels Area';
        return 'Quantity';
    };
    const getMassUnit = () => {
        if (thermalMassType === 'water_drums')
            return 'drums';
        if (thermalMassType === 'concrete_wall')
            return 'm';
        if (thermalMassType === 'pcm_panels')
            return 'm²';
        return '';
    };
    const handleSaveAssembly = () => {
        saveAssembly(assemblyName);
        setAssemblyName('');
        setSaveMessage('Assembly saved');
        window.setTimeout(() => setSaveMessage(''), 2500);
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* AutoOptimizer Presets quick loader */}
      <div className="lg:col-span-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              LOAD AUTOOPTIMIZER PRESETS
            </h3>
            {loadedPreset && (
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                loadedPreset.isModified
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                  : 'text-[var(--comfort)] bg-[var(--comfort)]/10 border border-[var(--comfort)]/30'
              }`}>
                <Check size={10} /> Preset #{Number(loadedPreset.id ?? 0) + 1} {loadedPreset.isModified ? '(Modified)' : 'Active'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Click any top-scoring preset to load its envelope materials, orientation & ventilation directly into this design
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
          {normalizedPicks.slice(0, 5).map((pick, idx) => {
            const isSelected = loadedPreset?.id !== undefined && loadedPreset?.id === (pick.id ?? idx);
            return (
              <button
                key={pick.id ?? idx}
                type="button"
                onClick={() => loadDesignPreset(pick.params, { id: pick.id ?? idx, score: pick.score })}
                className={`flex flex-col text-left p-2.5 rounded-[10px] border transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/40'
                    : 'bg-[var(--bg-surface-raised)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-[var(--accent-primary)] text-[var(--bg-app)]' : 'bg-[var(--border-strong)]/30 text-[var(--text-secondary)]'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {Number(pick.score ?? 0).toFixed(1)}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                  {getMaterialLabel(pick.params.struct)} + {getMaterialLabel(pick.params.ins)}
                </p>
                <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-1">
                  <span>{Math.round(Number(pick.params.orient))}° Azimuth</span>
                  <span>{Math.round(Number(pick.params.win_f) * 100)}% Win</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Save this material assembly</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Store the current design for comparison under active weather conditions.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input value={assemblyName} onChange={(e) => setAssemblyName(e.target.value)} placeholder={`Assembly ${savedAssemblies.length + 1}`} className="w-full sm:w-44 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]" />
          <button type="button" onClick={handleSaveAssembly} className="flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-[var(--bg-app)] hover:opacity-95 text-xs font-semibold px-3 py-2 rounded-[8px] transition-opacity cursor-pointer">
            <Save size={14} /> Save Assembly
          </button>
          {saveMessage && <span className="text-[10px] font-semibold text-[var(--comfort)] self-center">{saveMessage}</span>}
        </div>
      </div>
      
      <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
        
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
            <LayoutGrid size={16} style={{ color: 'var(--accent-primary)' }} /> ENVELOPE DIMENSIONS
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                <span>Length (Front Wall)</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{shelter.length.toFixed(1)} m</span>
              </label>
              <input type="range" min="2.0" max="12.0" step="0.1" value={shelter.length} onChange={(e) => handleSliderChange('length', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Width</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.width.toFixed(1)} m</span>
              </label>
              <input type="range" min="2.0" max="8.0" step="0.1" value={shelter.width} onChange={(e) => handleSliderChange('width', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Height</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.height.toFixed(1)} m</span>
              </label>
              <input type="range" min="2.0" max="4.0" step="0.1" value={shelter.height} onChange={(e) => handleSliderChange('height', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Roof Configuration</label>
              <select value={shelter.shape} onChange={(e) => handleSliderChange('shape', e.target.value)} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] text-[var(--text-primary)]">
                <option value="flat_roof_box" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Flat Roof</option>
                <option value="pitched_roof_box" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">Pitched Roof</option>
              </select>
            </div>

            {shelter.shape === 'pitched_roof_box' && (<div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Roof Pitch</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.roof_pitch_deg}°</span>
                </label>
                <input type="range" min="5" max="45" step="1" value={shelter.roof_pitch_deg} onChange={(e) => handleSliderChange('roof_pitch_deg', parseFloat(e.target.value))}/>
              </div>)}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Orientation (Azimuth)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.orientation_deg}°</span>
              </label>
              <input type="range" min="0" max="360" step="5" value={shelter.orientation_deg} onChange={(e) => handleSliderChange('orientation_deg', parseFloat(e.target.value))}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Infiltration / Ventilation</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.ach.toFixed(2)} ACH</span>
              </label>
              <input type="range" min="0.1" max="2.0" step="0.05" value={shelter.ach} onChange={(e) => handleSliderChange('ach', parseFloat(e.target.value))}/>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
            <AppWindow size={16} style={{ color: 'var(--accent-primary)' }} /> SOUTH WINDOW OPENINGS
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                <span>Window Width</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{activeWindow.width.toFixed(1)} m</span>
              </label>
              <input type="range" min="0.5" max="4.0" step="0.1" value={activeWindow.width} onChange={(e) => handleWindowChange({ width: parseFloat(e.target.value) })}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                <span>Window Height</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{activeWindow.height.toFixed(1)} m</span>
              </label>
              <input type="range" min="0.5" max="2.0" step="0.1" value={activeWindow.height} onChange={(e) => handleWindowChange({ height: parseFloat(e.target.value) })}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                <span>Solar Heat Coefficient (SHGC)</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{activeWindow.shgc.toFixed(2)}</span>
              </label>
              <input type="range" min="0.2" max="0.9" step="0.05" value={activeWindow.shgc} onChange={(e) => handleWindowChange({ shgc: parseFloat(e.target.value) })}/>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Glazing Type</label>
              <select value={activeWindow.glazing ? Object.keys(DEFAULT_MATERIALS).find(k => DEFAULT_MATERIALS[k].name === activeWindow.glazing?.name) || 'glass_double_lowE' : 'glass_double_lowE'} onChange={(e) => handleWindowChange({ glazing: e.target.value })} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs outline-none text-[var(--text-primary)]">
                <option value="glass_double_lowE">Double Glazing Low-E (Argon)</option>
                <option value="glass_double_air">Double Glazing (Air)</option>
                <option value="glass_single">Single Glazing (standard)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
            <Cpu size={16} style={{ color: 'var(--accent-primary)' }} /> INTERIOR THERMAL MASS
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Thermal Mass Type</label>
              <select value={thermalMassType} onChange={(e) => {
            updateThermalMass(e.target.value, e.target.value === 'water_drums' ? 2 : e.target.value === 'concrete_wall' ? 3.0 : e.target.value === 'pcm_panels' ? 20 : 1);
            setTimeout(() => runActiveSimulation(), 100);
        }} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs outline-none text-[var(--text-primary)]">
                <option value="water_drums">Water Drums (300L Cylinders)</option>
                <option value="concrete_wall">Concrete Partition Wall</option>
                <option value="pcm_panels">PCM RT21 Panels</option>
                <option value="none">No Additional Thermal Mass</option>
              </select>
            </div>

            {thermalMassType !== 'none' && (<div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex justify-between">
                  <span>{getMassLabel()}</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">
                    {thermalMassType === 'concrete_wall' ? thermalMassQty.toFixed(1) : thermalMassQty.toFixed(0)} {getMassUnit()}
                  </span>
                </label>
                <input type="range" min={thermalMassType === 'water_drums' ? '1' : thermalMassType === 'concrete_wall' ? '1.0' : '5'} max={thermalMassType === 'water_drums' ? '6' : thermalMassType === 'concrete_wall' ? '6.0' : '40'} step={thermalMassType === 'concrete_wall' ? '0.1' : '1'} value={thermalMassQty} onChange={(e) => {
                updateThermalMass(thermalMassType, parseFloat(e.target.value));
                setTimeout(() => runActiveSimulation(), 100);
            }}/>
              </div>)}
          </div>
        </div>

      </div>

      <div className="lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
          <Layers size={16} style={{ color: 'var(--accent-primary)' }} /> ENVELOPE LAYERS ASSEMBLY
        </h3>
        
        <LayerEditor />
      </div>

    </div>);
};
