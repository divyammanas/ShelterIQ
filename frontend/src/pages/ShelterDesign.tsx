import React from 'react';
import { LayoutGrid, AppWindow, Cpu, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LayerEditor } from '../components/LayerEditor';
import { DEFAULT_MATERIALS } from '../services/physicsEngine';

export const ShelterDesign: React.FC = () => {
  const {
    shelter,
    setShelter,
    updateShelterOpenings,
    updateThermalMass,
    thermalMassType,
    thermalMassQty,
    runActiveSimulation
  } = useApp();

  const handleSliderChange = (key: keyof typeof shelter, value: any) => {
    setShelter(prev => ({
      ...prev,
      [key]: value
    }));
    setTimeout(() => runActiveSimulation(), 100);
  };

  const handleWindowChange = (updates: { width?: number; height?: number; shgc?: number; glazing?: string }) => {
    const win = shelter.openings.find(o => !o.is_door);
    const width = updates.width !== undefined ? updates.width : (win?.width || 1.6);
    const height = updates.height !== undefined ? updates.height : (win?.height || 1.2);
    const shgc = updates.shgc !== undefined ? updates.shgc : (win?.shgc || 0.55);
    const glazingKey = updates.glazing !== undefined ? updates.glazing : 'glass_double_lowE';
    
    updateShelterOpenings(width, height, shgc, glazingKey);
    setTimeout(() => runActiveSimulation(), 100);
  };

  const activeWindow = shelter.openings.find(o => !o.is_door) || {
    width: 1.6,
    height: 1.2,
    shgc: 0.55,
    glazing: { name: 'Double Glazing Low-E' }
  };

  const getMassLabel = () => {
    if (thermalMassType === 'water_drums') return 'Drums Quantity';
    if (thermalMassType === 'concrete_wall') return 'Wall Length';
    if (thermalMassType === 'pcm_panels') return 'Panels Area';
    return 'Quantity';
  };

  const getMassUnit = () => {
    if (thermalMassType === 'water_drums') return 'drums';
    if (thermalMassType === 'concrete_wall') return 'm';
    if (thermalMassType === 'pcm_panels') return 'm²';
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left Column - Geometry and Dimensions */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* Envelope Dimensions Card */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
            <LayoutGrid size={16} className="text-blue-500" /> Envelope Dimensions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Length (Front Wall)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.length.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="2.0"
                max="12.0"
                step="0.1"
                value={shelter.length}
                onChange={(e) => handleSliderChange('length', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Width</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.width.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={shelter.width}
                onChange={(e) => handleSliderChange('width', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Height</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.height.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="2.0"
                max="4.0"
                step="0.1"
                value={shelter.height}
                onChange={(e) => handleSliderChange('height', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Roof Configuration</label>
              <select
                value={shelter.shape}
                onChange={(e) => handleSliderChange('shape', e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
              >
                <option value="flat_roof_box">Flat Roof</option>
                <option value="pitched_roof_box">Pitched Roof</option>
              </select>
            </div>

            {shelter.shape === 'pitched_roof_box' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Roof Pitch</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.roof_pitch_deg}°</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={shelter.roof_pitch_deg}
                  onChange={(e) => handleSliderChange('roof_pitch_deg', parseFloat(e.target.value))}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Orientation (Azimuth)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.orientation_deg}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={shelter.orientation_deg}
                onChange={(e) => handleSliderChange('orientation_deg', parseFloat(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Infiltration / Ventilation</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{shelter.ach.toFixed(2)} ACH</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={shelter.ach}
                onChange={(e) => handleSliderChange('ach', parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* South Window Openings Card */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
            <AppWindow size={16} className="text-blue-500" /> South Window Openings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Window Width</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{activeWindow.width.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={activeWindow.width}
                onChange={(e) => handleWindowChange({ width: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Window Height</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{activeWindow.height.toFixed(1)} m</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={activeWindow.height}
                onChange={(e) => handleWindowChange({ height: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                <span>Solar Heat Coefficient (SHGC)</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{activeWindow.shgc.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={activeWindow.shgc}
                onChange={(e) => handleWindowChange({ shgc: parseFloat(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Glazing Type</label>
              <select
                value={activeWindow.glazing ? Object.keys(DEFAULT_MATERIALS).find(k => DEFAULT_MATERIALS[k].name === activeWindow.glazing?.name) || 'glass_double_lowE' : 'glass_double_lowE'}
                onChange={(e) => handleWindowChange({ glazing: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
              >
                <option value="glass_double_lowE">Double Glazing Low-E (Argon)</option>
                <option value="glass_double_air">Double Glazing (Air)</option>
                <option value="glass_single">Single Glazing (standard)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interior Thermal Mass Card */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
            <Cpu size={16} className="text-blue-500" /> Interior Thermal Mass
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Thermal Mass Type</label>
              <select
                value={thermalMassType}
                onChange={(e) => {
                  updateThermalMass(e.target.value, e.target.value === 'water_drums' ? 2 : e.target.value === 'concrete_wall' ? 3.0 : e.target.value === 'pcm_panels' ? 20 : 1);
                  setTimeout(() => runActiveSimulation(), 100);
                }}
                className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/50 text-zinc-950 dark:text-zinc-100"
              >
                <option value="water_drums">Water Drums (300L Cylinders)</option>
                <option value="concrete_wall">Concrete Partition Wall</option>
                <option value="pcm_panels">PCM RT21 Panels</option>
                <option value="none">No Additional Thermal Mass</option>
              </select>
            </div>

            {thermalMassType !== 'none' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>{getMassLabel()}</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                    {thermalMassType === 'concrete_wall' ? thermalMassQty.toFixed(1) : thermalMassQty.toFixed(0)} {getMassUnit()}
                  </span>
                </label>
                <input
                  type="range"
                  min={thermalMassType === 'water_drums' ? '1' : thermalMassType === 'concrete_wall' ? '1.0' : '5'}
                  max={thermalMassType === 'water_drums' ? '6' : thermalMassType === 'concrete_wall' ? '6.0' : '40'}
                  step={thermalMassType === 'concrete_wall' ? '0.1' : '1'}
                  value={thermalMassQty}
                  onChange={(e) => {
                    updateThermalMass(thermalMassType, parseFloat(e.target.value));
                    setTimeout(() => runActiveSimulation(), 100);
                  }}
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Column - Envelope Layers Assembly */}
      <div className="lg:col-span-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
          <Layers size={16} className="text-blue-500" /> Envelope Layers Assembly
        </h3>
        
        {/* Render LayerEditor Component */}
        <LayerEditor />
      </div>

    </div>
  );
};
