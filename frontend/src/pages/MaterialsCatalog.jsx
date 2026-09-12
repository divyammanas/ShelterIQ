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
                return 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/50';
            case 'glazing':
            case 'air cavity':
                return 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30';
            case 'thermal storage':
            case 'water':
                return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
            case 'metal':
                return 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/50';
            case 'finish':
                return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
            case 'wood':
            case 'polymer':
            case 'timber':
            default:
                return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
        }
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <form onSubmit={handleAddMaterial} className="lg:col-span-4 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <Plus size={16} className="text-blue-500"/> Register Custom Material
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Material Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hempcrete / Straw Clay" className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Conductivity (k) [W/mK]</label>
          <input type="number" step="0.001" required value={k} onChange={(e) => setK(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Density (ρ) [kg/m³]</label>
          <input type="number" required value={rho} onChange={(e) => setRho(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Specific Heat Capacity (Cp) [J/kgK]</label>
          <input type="number" required value={cp} onChange={(e) => setCp(e.target.value)} className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl mt-2">
          <div>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Phase Change Material (PCM)</span>
            <p className="text-[10px] text-zinc-400 leading-normal">Enables temperature-dependent latent heat calculations</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input type="checkbox" checked={isPcm} onChange={(e) => setIsPcm(e.target.checked)} className="sr-only peer"/>
            <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {isPcm && (<div className="flex flex-col gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Melting Temp (T_melt) [°C]</label>
              <input type="number" step="0.5" value={tMelt} onChange={(e) => setTMelt(e.target.value)} className="w-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Latent Heat (L) [J/kg]</label>
              <input type="number" value={latent} onChange={(e) => setLatent(e.target.value)} className="w-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mushy Zone Band (+/- °C)</label>
              <input type="number" step="0.5" value={mushBand} onChange={(e) => setMushBand(e.target.value)} className="w-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-white font-mono"/>
            </div>
          </div>)}

        <button type="submit" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-3 rounded-xl transition-all shadow-sm mt-2">
          <Plus size={14}/> Register Material
        </button>
      </form>

      <div className="lg:col-span-8 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <Database size={16} className="text-blue-500"/> Standard Materials Library
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {mdb.list().map((key) => {
            const m = mdb.get(key);
            const type = getMaterialType(m);
            return (<div key={`${key}-${refreshKey}`} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex flex-col gap-3 hover:shadow-sm transition-all">
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
