import React, { useRef } from 'react';
import { Import, Star, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseCSV } from '../services/physicsEngine';

export const PortfolioCompare: React.FC = () => {
  const { savedDesigns, setSavedDesigns } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length > 0) {
          const parsed = rows.map(r => ({
            name: String(r.design ?? r.name ?? "Unnamed Design"),
            score: parseFloat(String(r.design_score ?? r.score ?? 0.0)),
            min_T: parseFloat(String(r.min_T_air_C ?? r.min_T ?? 0.0)),
            max_T: parseFloat(String(r.max_T_air_C ?? r.max_T ?? 0.0)),
            comfort_h: parseFloat(String(r.comfortable_h ?? r.comfort_h ?? 0.0)),
            heating_energy: parseFloat(String(r.estimated_heating_kWh ?? r.heating_energy ?? 0.0)),
            conduction_loss: parseFloat(String(r.total_heat_loss_kWh ?? 0.0))
          }));
          setSavedDesigns(parsed);
          console.log("Imported portfolio data containing " + parsed.length + " designs.");
        }
      } catch (err) {
        alert("Invalid CSV format. Please ensure correct headers exist.");
      }
    };
    reader.readAsText(file);
  };

  const getRankStars = (score: number) => {
    const active = Math.min(Math.max(Math.ceil((score - 50) / 10), 1), 5);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          size={14} 
          className={i <= active ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"} 
        />
      );
    }
    return stars;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
    return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Comparative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {savedDesigns.map((design, idx) => (
          <div 
            key={idx}
            className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Rank badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase">Rank #{idx + 1}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Design Case</span>
              <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white truncate">{design.name}</h4>
            </div>

            {/* Score metric split */}
            <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Composite Score</span>
                <span className="text-xl font-extrabold text-zinc-950 dark:text-white font-mono">{design.score.toFixed(1)}</span>
              </div>
              <div className="flex gap-0.5 ml-auto">
                {getRankStars(design.score)}
              </div>
            </div>

            {/* Parameter grid */}
            <div className="grid grid-cols-3 gap-3 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Comfort Hours</span>
                <span className="font-mono text-zinc-950 dark:text-white font-bold">{design.comfort_h.toFixed(1)} h</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Heating req</span>
                <span className="font-mono text-zinc-950 dark:text-white font-bold">{design.heating_energy.toFixed(1)} kWh</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 uppercase text-[8px] font-bold">Temp Min/Max</span>
                <span className="font-mono text-zinc-950 dark:text-white font-bold">{design.min_T}°/ {design.max_T}°</span>
              </div>
            </div>
          </div>
        ))}

        {savedDesigns.length === 0 && (
          <div className="col-span-full bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm text-center text-zinc-400 font-semibold">
            No design cases loaded. Run baseline simulations and click "Save Portfolio" to add items here.
          </div>
        )}
      </div>

      {/* Portfolio Performance Matrix Table */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
            <Award size={16} className="text-blue-500" /> Portfolio Performance Matrix
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 shadow-sm"
            >
              <Import size={14} className="text-blue-500" /> Import comparison_table.csv
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImportCSV}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>

        {/* Scrollable Table body */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-bold uppercase text-[9px] text-zinc-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Design Identifier</th>
                <th className="px-6 py-4">Composite Score (0-100)</th>
                <th className="px-6 py-4">Min/Max Indoor Temp</th>
                <th className="px-6 py-4">Comfortable Hours</th>
                <th className="px-6 py-4">Heating Requirement</th>
                <th className="px-6 py-4">Rank Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/40 font-medium">
              {savedDesigns.map((design, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-100">{design.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getScoreBadgeColor(design.score)}`}>
                      {design.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono">{design.min_T.toFixed(1)}°C / {design.max_T.toFixed(1)}°C</td>
                  <td className="px-6 py-4 font-mono">{design.comfort_h.toFixed(1)} h</td>
                  <td className="px-6 py-4 font-mono">{design.heating_energy.toFixed(2)} kWh</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-0.5">
                      {getRankStars(design.score)}
                    </div>
                  </td>
                </tr>
              ))}
              {savedDesigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-semibold">
                    No portfolio cases loaded.
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
