import React, { useState } from 'react';
import { Database, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDisplayNumber } from '../services/physicsEngine';
export const MaterialsCatalog = () => {
    const { mdb, runActiveSimulation } = useApp();
    const [name, setName] = useState('');
    const [k, setK] = useState('0.12');
    const [rho, setRho] = useState('800');
    const [cp, setCp] = useState('1500');
    const [isPcm, setIsPcm] = useState(false);
    const [tMelt, setTMelt] = useState('21.0');
    const [latent, setLatent] = useState('160000');
    const [mushBand, setMushBand] = useState('2.0');
    const [refreshKey, setRefreshKey] = useState(0);
    const handleAddMaterial = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please provide a material name.');
            return;
        }
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const newMat = {
            name: name.trim(),
            k: parseFloat(k) || 0.12,
            rho: parseFloat(rho) || 800,
            cp: parseFloat(cp) || 1500,
            alpha: 0.6,
            epsilon: 0.9,
            is_pcm: isPcm,
        };
        if (isPcm) {
            newMat.pcm_props = {
                T_melt: parseFloat(tMelt) || 21.0,
                L: parseFloat(latent) || 160000,
                band: parseFloat(mushBand) || 2.0
            };
            newMat.alpha = 0.6;
            newMat.epsilon = 0.9;
        }
        mdb.add(key, newMat);
        setName('');
        setK('0.12');
        setRho('800');
        setCp('1500');
        setIsPcm(false);
        setTMelt('21.0');
        setLatent('160000');
        setMushBand('2.0');
        setRefreshKey(prev => prev + 1);
        setTimeout(() => runActiveSimulation(), 100);
    };
    const getMaterialType = (m) => {
        // Use category field from CSV-sourced materials when present
        if (m.category) return m.category.toLowerCase();
        // Fallback heuristic for legacy materials without a category field
        if (m.is_pcm) return 'pcm';
        if (m.k < 0.05) return 'insulation';
        if (m.rho > 1800) return 'structure';
        return 'timber';
    };
    const getBadgeStyle = (type) => {
        switch (type) {
            case 'pcm':
                return 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30';
            case 'insulation':
            case 'bio-based insulation':
                return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30';
            case 'structure':
            case 'structural':
            case 'masonry':
            case 'stone':
                return 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
            case 'glazing':
            case 'air cavity':
                return 'bg-[var(--cold)]/10 text-[var(--cold)] border-[var(--cold)]/30';
            case 'thermal storage':
            case 'water':
                return 'bg-[var(--thermal-mass)]/15 text-[var(--thermal-mass)] border-[var(--thermal-mass)]/30';
            case 'metal':
                return 'bg-[var(--border-strong)]/20 text-[var(--text-secondary)] border-[var(--border-subtle)]';
            case 'finish':
                return 'bg-[var(--heat-loss)]/15 text-[var(--heat-loss)] border-[var(--heat-loss)]/30';
            case 'wood':
            case 'polymer':
            case 'timber':
            default:
                return 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30';
        }
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      
      <form onSubmit={handleAddMaterial} className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-3.5 sm:gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
          <Plus size={16} style={{ color: 'var(--accent-primary)' }} /> REGISTER CUSTOM MATERIAL
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Material Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hempcrete / Straw Clay" className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Conductivity (k) [W/mK]</label>
          <input type="number" step="0.001" required value={k} onChange={(e) => setK(e.target.value)} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Density (ρ) [kg/m³]</label>
          <input type="number" required value={rho} onChange={(e) => setRho(e.target.value)} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Specific Heat Capacity (Cp) [J/kgK]</label>
          <input type="number" required value={cp} onChange={(e) => setCp(e.target.value)} className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
        </div>

        <div className="flex items-center justify-between p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[8px] mt-1">
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">Phase Change Material (PCM)</span>
            <p className="text-[10px] text-[var(--text-muted)] leading-normal">Enables temperature-dependent latent heat calculations</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input type="checkbox" checked={isPcm} onChange={(e) => setIsPcm(e.target.checked)} className="sr-only peer"/>
            <div className="w-9 h-5 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
          </label>
        </div>

        {isPcm && (<div className="flex flex-col gap-3.5 p-3.5 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[8px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Melting Temp (T_melt) [°C]</label>
              <input type="number" step="0.5" value={tMelt} onChange={(e) => setTMelt(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Latent Heat (L) [J/kg]</label>
              <input type="number" value={latent} onChange={(e) => setLatent(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Mushy Zone Band (+/- °C)</label>
              <input type="number" step="0.5" value={mushBand} onChange={(e) => setMushBand(e.target.value)} className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[8px] px-3.5 py-2 text-xs sm:text-sm outline-none text-[var(--text-primary)] font-mono"/>
            </div>
          </div>)}

        <button type="submit" className="flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-[var(--bg-app)] hover:opacity-95 text-xs font-semibold px-4 py-2.5 sm:py-3 rounded-[8px] transition-opacity shadow-sm mt-1 cursor-pointer">
          <Plus size={14}/> Register Material
        </button>
      </form>

      <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3 shrink-0">
          <Database size={16} style={{ color: 'var(--accent-primary)' }} /> STANDARD MATERIALS LIBRARY
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 max-h-[520px] overflow-y-auto pr-1">
          {mdb.list().map((key) => {
            const m = mdb.get(key);
            const type = getMaterialType(m);
            return (<div key={`${key}-${refreshKey}`} className="p-3.5 sm:p-4 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[10px] flex flex-col gap-3 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-extrabold text-xs text-zinc-900 dark:text-white truncate">{m.name}</span>
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${getBadgeStyle(type)}`}>
                    {type}
                  </span>
                </div>
                
                <div className="space-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <div className="flex justify-between">
                    <span>Conductivity (k)</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatDisplayNumber(m.k)} W/mK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Density (ρ)</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatDisplayNumber(m.rho)} kg/m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Specific Heat (Cp)</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatDisplayNumber(m.cp)} J/kgK</span>
                  </div>
                  
                  {m.is_pcm && m.pcm_props && (<div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 mt-1.5 space-y-1">
                      <div className="flex justify-between text-purple-600 dark:text-purple-400">
                        <span>Melting Temp (T_m)</span>
                        <span className="font-mono">{formatDisplayNumber(m.pcm_props.T_melt)}°C</span>
                      </div>
                      <div className="flex justify-between text-purple-600 dark:text-purple-400">
                        <span>Latent Heat (L)</span>
                        <span className="font-mono">{m.pcm_props.L.toLocaleString()} J/kg</span>
                      </div>
                    </div>)}
                  {m.source && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 mt-1.5">
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 italic leading-tight block">{m.source}</span>
                    </div>
                  )}
                </div>
              </div>);
        })}
        </div>
      </div>

    </div>);
};
