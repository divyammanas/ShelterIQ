import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchMaterialMeta,
  fetchMaterialRecommendation,
  fetchMaterialComparison
} from '../services/materialIntelligenceService';
import {
  Sparkles,
  Layers,
  Thermometer,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Scale,
  Sun,
  Flame,
  ArrowRight,
  Info,
  MapPin,
  Building2,
  TreeDeciduous,
  Clock,
  Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDisplayNumber } from '../services/physicsEngine';

export const MaterialIntelligence = () => {
  const { mdb, applyRecommendedAssembly } = useApp();

  // Recommendation parameters
  const [location, setLocation] = useState('ladakh_high_altitude');
  const [climateCondition, setClimateCondition] = useState('high_altitude_cold_desert');
  const [budgetLevel, setBudgetLevel] = useState('moderate_balanced');
  const [budgetTarget, setBudgetTarget] = useState(75);
  const [priorityThermal, setPriorityThermal] = useState(85);
  const [priorityAffordability, setPriorityAffordability] = useState(70);
  const [priorityDurability, setPriorityDurability] = useState(80);
  const [priorityAvailability, setPriorityAvailability] = useState(85);
  const [priorityEco, setPriorityEco] = useState(50);
  const [prefersMass, setPrefersMass] = useState(true);
  const [showAdvancedPriorities, setShowAdvancedPriorities] = useState(false);

  // Data & State
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendationReport, setRecommendationReport] = useState(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);
  const [appliedNotification, setAppliedNotification] = useState(null);

  // Compare Tool State
  const [compareMat1, setCompareMat1] = useState('granite');
  const [compareMat2, setCompareMat2] = useState('adobe_mud_brick');
  const [compareDetails, setCompareDetails] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Fetch metadata on mount
  useEffect(() => {
    let isMounted = true;
    const loadMeta = async () => {
      const data = await fetchMaterialMeta();
      if (isMounted && data) {
        setMeta(data);
      }
    };
    loadMeta();
    return () => { isMounted = false; };
  }, []);

  // Run recommendation query
  const runRecommendation = async () => {
    setLoading(true);
    try {
      const payload = {
        location,
        climate_condition: climateCondition,
        budget_level: budgetLevel,
        budget_target_usd_m2: Number(budgetTarget),
        priority_thermal_efficiency: priorityThermal / 100.0,
        priority_affordability: priorityAffordability / 100.0,
        priority_durability: priorityDurability / 100.0,
        priority_local_availability: priorityAvailability / 100.0,
        priority_eco_sustainability: priorityEco / 100.0,
        prefers_high_thermal_mass: prefersMass,
        prefers_prefabricated_speed: !prefersMass
      };
      const report = await fetchMaterialRecommendation(payload);
      if (report) {
        setRecommendationReport(report);
      }
    } catch (err) {
      console.error('Recommendation processing failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial recommendation on mount
  useEffect(() => {
    runRecommendation();
  }, []);

  // Update budget target slider when budget level changes
  const handleBudgetLevelChange = (lvl) => {
    setBudgetLevel(lvl);
    if (lvl === 'humanitarian_low') setBudgetTarget(35);
    else if (lvl === 'moderate_balanced') setBudgetTarget(75);
    else if (lvl === 'premium_high_perf') setBudgetTarget(150);
  };

  // Quick apply assembly to 3D ShelterIQ model
  const handleApplyAssembly = (assembly) => {
    if (!assembly) return;
    if (applyRecommendedAssembly) {
      const success = applyRecommendedAssembly(assembly);
      if (success) {
        setAppliedNotification(`Applied "${assembly.assembly_name}" to active shelter model! Wall, roof, floor, and glazing updated.`);
        setTimeout(() => setAppliedNotification(null), 5000);
      }
    }
  };

  // Run head-to-head comparison
  const runComparison = async (id1, id2) => {
    setCompareLoading(true);
    try {
      const materials = await fetchMaterialComparison([id1, id2]);
      if (materials) {
        setCompareDetails(materials);
      }
    } catch (err) {
      console.error('Comparison processing failed:', err);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (compareMat1 && compareMat2) {
      runComparison(compareMat1, compareMat2);
    }
  }, [compareMat1, compareMat2]);

  // Flattened table list based on selected role
  const displayedMaterials = useMemo(() => {
    if (!recommendationReport || !recommendationReport.role_rankings) return [];
    let items = [];
    if (selectedRoleTab === 'all') {
      const seen = new Set();
      Object.entries(recommendationReport.role_rankings).forEach(([role, mats]) => {
        mats.forEach(m => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            items.push({ ...m, roleContext: role });
          }
        });
      });
    } else {
      items = (recommendationReport.role_rankings[selectedRoleTab] || []).map(m => ({
        ...m,
        roleContext: selectedRoleTab
      }));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }

    return items;
  }, [recommendationReport, selectedRoleTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Notification Banner */}
      {appliedNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-[10px] flex items-center justify-between text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
          <button
            onClick={() => setAppliedNotification(null)}
            className="text-xs text-emerald-400/80 hover:text-emerald-300 font-medium ml-4 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: AI Material Intelligence System */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={14} /> AI Recommendation Engine
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)]">
              Material Intelligence & Envelope Optimizer
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
              Evaluates thermal conductivity, volumetric heat capacity, solar absorptivity, emissivity, estimated costs, durability, and local availability for extreme climate shelters.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={runRecommendation}
              disabled={loading}
              className="px-4 py-2.5 rounded-[8px] bg-[var(--accent-primary)] hover:opacity-90 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Analyzing Database...' : 'Recompute Recommendation'}
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Location Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <MapPin size={13} style={{ color: 'var(--accent-primary)' }} /> Shelter Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="ladakh_high_altitude">Leh, Ladakh (High Altitude Cold Arid, 3500m)</option>
              <option value="arctic_subzero">Siachen / Arctic (Sub-Zero Polar Tundra, -35°C)</option>
              <option value="hot_arid_desert">Thar / Arabian Desert (Hot Arid, +48°C)</option>
              <option value="tropical_humid">Coastal Mumbai (Tropical Humid, 85% RH)</option>
              <option value="temperate_alpine">Shimla Alpine (Mid-Himalayan Seasonal)</option>
              <option value="global_standard">Standard Continental (Temperate)</option>
            </select>
          </div>

          {/* Climate Condition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Compass size={13} style={{ color: 'var(--accent-primary)' }} /> Climate Regime
            </label>
            <select
              value={climateCondition}
              onChange={(e) => setClimateCondition(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="high_altitude_cold_desert">High Altitude Cold Desert</option>
              <option value="extreme_cold">Extreme Cold / Sub-Zero Winter</option>
              <option value="extreme_heat">Extreme Heat / Arid Desert</option>
              <option value="tropical_humid">Warm & Humid / Coastal</option>
              <option value="temperate">Moderate / Continental</option>
            </select>
          </div>

          {/* Budget Tier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <DollarSign size={13} style={{ color: 'var(--accent-primary)' }} /> Budget Level
            </label>
            <select
              value={budgetLevel}
              onChange={(e) => handleBudgetLevelChange(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="humanitarian_low">Humanitarian / Low Cost ($)</option>
              <option value="moderate_balanced">Moderate / Cost-Effective ($$)</option>
              <option value="premium_high_perf">High-Performance / Premium ($$$)</option>
            </select>
          </div>

          {/* Envelope Cost Ceiling Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Budget Cap: <span className="text-[var(--accent-primary)] font-bold">${budgetTarget}/m²</span>
              </label>
              <span className="text-[10px] text-[var(--text-muted)]">[ESTIMATED]</span>
            </div>
            <input
              type="range"
              min="15"
              max="200"
              step="5"
              value={budgetTarget}
              onChange={(e) => setBudgetTarget(Number(e.target.value))}
              className="w-full accent-[var(--accent-primary)] cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>$15/m²</span>
              <span>$100/m²</span>
              <span>$200/m²</span>
            </div>
          </div>
        </div>

        {/* Priority Tuning & Toggles Accordion */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setShowAdvancedPriorities(!showAdvancedPriorities)}
            className="flex items-center gap-2 text-xs font-medium text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            <Sliders size={14} />
            {showAdvancedPriorities ? 'Hide Detailed Scoring Weights' : 'Configure Multi-Criteria Scoring Weights & Physics Priorities'}
            {showAdvancedPriorities ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvancedPriorities && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4 pt-3 bg-[var(--bg-surface-raised)] p-4 rounded-[10px] border border-[var(--border-subtle)]">
              {/* Thermal Efficiency Weight */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Thermal Efficiency</span>
                  <span className="font-semibold text-[var(--text-primary)]">{priorityThermal}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={priorityThermal}
                  onChange={(e) => setPriorityThermal(Number(e.target.value))}
                  className="accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Affordability Weight */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Cost Affordability</span>
                  <span className="font-semibold text-[var(--text-primary)]">{priorityAffordability}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={priorityAffordability}
                  onChange={(e) => setPriorityAffordability(Number(e.target.value))}
                  className="accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Durability Weight */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Durability & Lifespan</span>
                  <span className="font-semibold text-[var(--text-primary)]">{priorityDurability}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={priorityDurability}
                  onChange={(e) => setPriorityDurability(Number(e.target.value))}
                  className="accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Local Availability */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Local Availability</span>
                  <span className="font-semibold text-[var(--text-primary)]">{priorityAvailability}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={priorityAvailability}
                  onChange={(e) => setPriorityAvailability(Number(e.target.value))}
                  className="accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Eco Priority */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-medium text-[var(--text-secondary)]">
                  <span>Low-Carbon / Bio</span>
                  <span className="font-semibold text-[var(--text-primary)]">{priorityEco}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priorityEco}
                  onChange={(e) => setPriorityEco(Number(e.target.value))}
                  className="accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Diurnal Thermal Mass Toggle */}
              <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="massToggle"
                    checked={prefersMass}
                    onChange={(e) => setPrefersMass(e.target.checked)}
                    className="accent-[var(--accent-primary)] h-4 w-4 rounded cursor-pointer"
                  />
                  <label htmlFor="massToggle" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                    Prioritize High Thermal Mass (Volumetric Heat Capacity $\rho \cdot c_p$) for Day-Night Temperature Damping
                  </label>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                  Recommended for Ladakh & Desert High-Altitude Diurnal Cycles
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assembly Recommendations Showcase (3 Cards) */}
      {recommendationReport && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-serif font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Layers size={17} style={{ color: 'var(--accent-primary)' }} />
              Recommended Passive Envelope Assemblies
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              Ranked from 48 verified materials
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Primary Optimal Assembly */}
            {recommendationReport.primary_assembly && (
              <div className="bg-[var(--bg-surface)] border-2 border-[var(--accent-primary)]/40 rounded-[12px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[var(--accent-primary)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-[8px] uppercase tracking-wider">
                  Top Recommended
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-1">
                    Primary Design
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {recommendationReport.primary_assembly.assembly_name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                    {recommendationReport.primary_assembly.description}
                  </p>

                  {/* Component Breakdown List */}
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Walls:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.primary_assembly.wall_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Insulation:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.primary_assembly.insulation_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Roofing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.primary_assembly.roof_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Flooring:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.primary_assembly.floor_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Glazing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.primary_assembly.glazing_material?.material?.name}
                      </span>
                    </div>
                  </div>

                  {/* Performance Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 p-2.5 rounded-[8px]">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">EST. ENVELOPE COST</div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        ${recommendationReport.primary_assembly.total_estimated_cost_m2} <span className="text-[10px] font-normal text-[var(--text-muted)]">/m²</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">R-VALUE (EST.)</div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        R-{recommendationReport.primary_assembly.estimated_envelope_r_value} <span className="text-[10px] font-normal text-[var(--text-muted)]">m²K/W</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">THERMAL MASS</div>
                      <div className="text-xs font-semibold text-[var(--accent-primary)]">
                        {recommendationReport.primary_assembly.estimated_thermal_mass_rating}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">DURABILITY</div>
                      <div className="text-xs font-semibold text-emerald-400">
                        {recommendationReport.primary_assembly.durability_rating_10} / 10
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyAssembly(recommendationReport.primary_assembly)}
                  className="mt-5 w-full py-2.5 rounded-[8px] bg-[var(--accent-primary)] hover:opacity-90 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <ArrowRight size={14} /> Apply to Active Shelter Model
                </button>
              </div>
            )}

            {/* Budget Alternative Assembly */}
            {recommendationReport.budget_alternative_assembly && (
              <div className="bg-[var(--bg-surface)] border border-emerald-500/30 rounded-[12px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-[8px] uppercase tracking-wider">
                  Saves {recommendationReport.ai_explanations?.cost_saving_pct}% Cost
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    Economic / Humanitarian Option
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {recommendationReport.budget_alternative_assembly.assembly_name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                    {recommendationReport.budget_alternative_assembly.description}
                  </p>

                  {/* Component Breakdown List */}
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Walls:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.budget_alternative_assembly.wall_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Insulation:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.budget_alternative_assembly.insulation_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Roofing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.budget_alternative_assembly.roof_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Flooring:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.budget_alternative_assembly.floor_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Glazing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.budget_alternative_assembly.glazing_material?.material?.name}
                      </span>
                    </div>
                  </div>

                  {/* Performance Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 p-2.5 rounded-[8px]">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">EST. ENVELOPE COST</div>
                      <div className="text-sm font-bold text-emerald-400">
                        ${recommendationReport.budget_alternative_assembly.total_estimated_cost_m2} <span className="text-[10px] font-normal text-[var(--text-muted)]">/m²</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">R-VALUE (EST.)</div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        R-{recommendationReport.budget_alternative_assembly.estimated_envelope_r_value} <span className="text-[10px] font-normal text-[var(--text-muted)]">m²K/W</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">SAVINGS / M²</div>
                      <div className="text-xs font-semibold text-emerald-400">
                        -${recommendationReport.ai_explanations?.estimated_cost_saving_usd_m2}/m²
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">DURABILITY</div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        {recommendationReport.budget_alternative_assembly.durability_rating_10} / 10
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyAssembly(recommendationReport.budget_alternative_assembly)}
                  className="mt-5 w-full py-2.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <ArrowRight size={14} /> Apply Budget Assembly
                </button>
              </div>
            )}

            {/* High Thermal Mass Assembly */}
            {recommendationReport.high_thermal_mass_assembly && (
              <div className="bg-[var(--bg-surface)] border border-purple-500/30 rounded-[12px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-[8px] uppercase tracking-wider">
                  Diurnal Thermal Battery
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
                    High Inertia Storage
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {recommendationReport.high_thermal_mass_assembly.assembly_name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                    {recommendationReport.high_thermal_mass_assembly.description}
                  </p>

                  {/* Component Breakdown List */}
                  <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Walls:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.high_thermal_mass_assembly.wall_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Insulation:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.high_thermal_mass_assembly.insulation_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Roofing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.high_thermal_mass_assembly.roof_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Flooring:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.high_thermal_mass_assembly.floor_material?.material?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-secondary)] font-medium">Glazing:</span>
                      <span className="font-semibold text-[var(--text-primary)] text-right">
                        {recommendationReport.high_thermal_mass_assembly.glazing_material?.material?.name}
                      </span>
                    </div>
                  </div>

                  {/* Performance Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 p-2.5 rounded-[8px]">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">EST. ENVELOPE COST</div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        ${recommendationReport.high_thermal_mass_assembly.total_estimated_cost_m2} <span className="text-[10px] font-normal text-[var(--text-muted)]">/m²</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">HEAT CAPACITY (ρ·cp)</div>
                      <div className="text-xs font-bold text-purple-400">
                        &gt;2.1 MJ/m³·K
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">PHASE SHIFT</div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        ~10-12 Hours
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">DURABILITY</div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        {recommendationReport.high_thermal_mass_assembly.durability_rating_10} / 10
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyAssembly(recommendationReport.high_thermal_mass_assembly)}
                  className="mt-5 w-full py-2.5 rounded-[8px] bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <ArrowRight size={14} /> Apply High-Mass Assembly
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Engineering Explanations & Budget Trade-Offs Hub */}
      {recommendationReport && recommendationReport.ai_explanations && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] pb-3">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <div>
              <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--text-primary)]">
                AI Engineering Rationale & Thermodynamic Analysis
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Physics-based justification citing Fourier conduction, volumetric heat capacity, and climate hazards
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Strategy Summary */}
            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-[10px] border border-[var(--border-subtle)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] mb-1.5 flex items-center gap-1.5">
                <Compass size={14} /> Strategic Passive Approach
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {recommendationReport.ai_explanations.climate_strategy_summary}
              </p>
              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                Location: <strong className="text-[var(--text-primary)]">{recommendationReport.request_summary?.location_label}</strong>
              </div>
            </div>

            {/* Envelope Synergy */}
            <div className="bg-[var(--bg-surface-raised)] p-4 rounded-[10px] border border-[var(--border-subtle)]">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1.5 flex items-center gap-1.5">
                <Layers size={14} /> Thermodynamic Layer Synergy
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {recommendationReport.ai_explanations.envelope_synergy_synthesis}
              </p>
            </div>
          </div>

          {/* Component Deep Dives */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-[8px] bg-[var(--bg-surface-raised)]/70 border border-[var(--border-subtle)] text-xs">
              <span className="font-bold text-[var(--text-primary)] block mb-1">Wall Rationale:</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {recommendationReport.ai_explanations.wall_justification}
              </p>
            </div>
            <div className="p-3.5 rounded-[8px] bg-[var(--bg-surface-raised)]/70 border border-[var(--border-subtle)] text-xs">
              <span className="font-bold text-[var(--text-primary)] block mb-1">Insulation Rationale:</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {recommendationReport.ai_explanations.insulation_justification}
              </p>
            </div>
            <div className="p-3.5 rounded-[8px] bg-[var(--bg-surface-raised)]/70 border border-[var(--border-subtle)] text-xs">
              <span className="font-bold text-[var(--text-primary)] block mb-1">Glazing Rationale:</span>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {recommendationReport.ai_explanations.glazing_justification}
              </p>
            </div>
          </div>

          {/* Budget Constraint & Alternatives Explanation */}
          <div className="p-4 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-[var(--text-secondary)] flex items-start gap-3">
            <DollarSign size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-400 block mb-1">Budget Constraint & Alternative Trade-Off Analysis:</strong>
              <p className="leading-relaxed">
                {recommendationReport.ai_explanations.budget_alternative_analysis}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Matrix & Technical Specifications Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Scale size={16} style={{ color: 'var(--accent-primary)' }} />
              Construction Materials Technical Specifications & Comparison
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Measured physical constants (ASHRAE/NIST) alongside labeled engineering estimates
            </p>
          </div>

          {/* Search box */}
          <input
            type="text"
            placeholder="Search material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none w-full sm:w-56"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-3">
          {[
            { id: 'all', label: 'All Ranked' },
            { id: 'walls', label: 'Walls' },
            { id: 'insulation', label: 'Insulation' },
            { id: 'roofs', label: 'Roofs' },
            { id: 'flooring', label: 'Flooring' },
            { id: 'glazing', label: 'Glazing' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleTab(tab.id)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                selectedRoleTab === tab.id
                  ? 'bg-[var(--accent-primary)] text-white font-semibold'
                  : 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Material Name & Category</th>
                <th className="py-2.5 px-2">Score</th>
                <th className="py-2.5 px-2">k (W/m·K)</th>
                <th className="py-2.5 px-2">Density (kg/m³)</th>
                <th className="py-2.5 px-2">cp (J/kg·K)</th>
                <th className="py-2.5 px-2">ρ·cp (MJ/m³)</th>
                <th className="py-2.5 px-2">α / ε</th>
                <th className="py-2.5 px-2 text-right">Est. Cost [EST]</th>
                <th className="py-2.5 px-2">Lifespan [EST]</th>
                <th className="py-2.5 px-2">Local Avail. [EST]</th>
                <th className="py-2.5 px-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {displayedMaterials.map((mat) => {
                const isExpanded = expandedMaterialId === mat.id;
                return (
                  <React.Fragment key={mat.id}>
                    <tr className="hover:bg-[var(--bg-surface-raised)]/60 transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          {mat.rank && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] font-bold">
                              #{mat.rank}
                            </span>
                          )}
                          <span>{mat.name}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] block">{mat.category}</span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-[var(--accent-primary)]">
                        {mat.total_score}
                      </td>
                      <td className="py-2.5 px-2 font-mono">{mat.k_W_mK}</td>
                      <td className="py-2.5 px-2 font-mono">{mat.density_kg_m3}</td>
                      <td className="py-2.5 px-2 font-mono">{mat.cp_J_kgK}</td>
                      <td className="py-2.5 px-2 font-mono">{mat.volumetric_heat_capacity_MJ_m3K}</td>
                      <td className="py-2.5 px-2 font-mono">{mat.solar_absorptivity} / {mat.emissivity}</td>
                      <td className="py-2.5 px-2 text-right font-medium">
                        ${mat.typical_cost_usd_m2}
                        <span className="text-[9px] text-[var(--text-muted)] ml-0.5">/m²</span>
                      </td>
                      <td className="py-2.5 px-2 text-[var(--text-secondary)]">
                        {mat.durability_years} yrs
                      </td>
                      <td className="py-2.5 px-2 text-[var(--text-secondary)]">
                        {mat.regional_availability_score}/10
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => setExpandedMaterialId(isExpanded ? null : mat.id)}
                          className="text-[var(--accent-primary)] hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          {isExpanded ? 'Hide' : 'Specs'}
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr className="bg-[var(--bg-surface-raised)]/80">
                        <td colSpan={11} className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <span className="font-bold text-xs text-emerald-400 block mb-1">Key Advantages:</span>
                              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-0.5">
                                {(mat.advantages || []).map((adv, idx) => (
                                  <li key={idx}>{adv}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-bold text-xs text-amber-400 block mb-1">Limitations / Hazards:</span>
                              <ul className="list-disc list-inside text-xs text-[var(--text-secondary)] space-y-0.5">
                                {(mat.disadvantages || []).map((dis, idx) => (
                                  <li key={idx}>{dis}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                              <div><strong>Fire Rating:</strong> {mat.fire_rating}</div>
                              <div><strong>Embodied Carbon:</strong> {mat.embodied_carbon}</div>
                              <div><strong>Data Provenance:</strong> {mat.source || 'ASHRAE / NIST'}</div>
                              <div className="text-[10px] text-[var(--text-muted)] pt-1">
                                [EST] indicates estimated value based on standard construction indices.
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Head-to-Head Custom Material Comparison Tool */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.3)] space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-3">
          <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Scale size={16} style={{ color: 'var(--accent-primary)' }} />
            Head-to-Head Material Trade-Off Analyzer
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Compare any two materials directly from the 48-item database to inspect thermodynamic trade-offs
          </p>
        </div>

        {/* Material Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Material A</label>
            <select
              value={compareMat1}
              onChange={(e) => setCompareMat1(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            >
              {Object.keys(mdb.db).map(k => (
                <option key={k} value={k}>{mdb.db[k].name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">Material B</label>
            <select
              value={compareMat2}
              onChange={(e) => setCompareMat2(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-strong)] rounded-[8px] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            >
              {Object.keys(mdb.db).map(k => (
                <option key={k} value={k}>{mdb.db[k].name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side Table */}
        {compareDetails && compareDetails.length === 2 && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] uppercase">
                  <th className="py-2 px-3">Property</th>
                  <th className="py-2 px-3 font-bold text-[var(--accent-primary)]">{compareDetails[0].name}</th>
                  <th className="py-2 px-3 font-bold text-emerald-400">{compareDetails[1].name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Category</td>
                  <td className="py-2 px-3">{compareDetails[0].category}</td>
                  <td className="py-2 px-3">{compareDetails[1].category}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Thermal Conductivity (k) [W/m·K]</td>
                  <td className="py-2 px-3 font-mono font-bold">{compareDetails[0].k_W_mK}</td>
                  <td className="py-2 px-3 font-mono font-bold">{compareDetails[1].k_W_mK}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Density (ρ) [kg/m³]</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[0].density_kg_m3}</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[1].density_kg_m3}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Specific Heat (cp) [J/kg·K]</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[0].cp_J_kgK}</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[1].cp_J_kgK}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Heat Capacity (ρ·cp) [MJ/m³·K]</td>
                  <td className="py-2 px-3 font-mono font-bold text-purple-400">
                    {(compareDetails[0].volumetric_heat_capacity_J_m3K / 1e6).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-purple-400">
                    {(compareDetails[1].volumetric_heat_capacity_J_m3K / 1e6).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Solar Absorptivity (α)</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[0].solar_absorptivity}</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[1].solar_absorptivity}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Emissivity (ε)</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[0].emissivity}</td>
                  <td className="py-2 px-3 font-mono">{compareDetails[1].emissivity}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Estimated Cost [EST]</td>
                  <td className="py-2 px-3 font-bold">${compareDetails[0].typical_cost_usd_m2}/m²</td>
                  <td className="py-2 px-3 font-bold">${compareDetails[1].typical_cost_usd_m2}/m²</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Durability Lifespan [EST]</td>
                  <td className="py-2 px-3">{compareDetails[0].durability_lifespan_years} Years</td>
                  <td className="py-2 px-3">{compareDetails[1].durability_lifespan_years} Years</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Fire Classification</td>
                  <td className="py-2 px-3">{compareDetails[0].fire_rating}</td>
                  <td className="py-2 px-3">{compareDetails[1].fire_rating}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">Embodied Carbon</td>
                  <td className="py-2 px-3">{compareDetails[0].embodied_carbon}</td>
                  <td className="py-2 px-3">{compareDetails[1].embodied_carbon}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provenance and Verification Tag */}
      <div className="p-3.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
        <Info size={14} className="shrink-0 text-[var(--accent-primary)]" />
        <span>
          <strong>Data Provenance Notice:</strong> Thermal conductivity, density, specific heat capacity, solar absorptivity, and emissivity are directly mapped from validated ASHRAE Chapter 26, NIST reference datasets, and peer-reviewed building material literature. Installed costs, lifespans, and logistics availability represent estimated regional benchmarks labeled with [EST] to assist preliminary engineering sizing.
        </span>
      </div>
    </div>
  );
};
