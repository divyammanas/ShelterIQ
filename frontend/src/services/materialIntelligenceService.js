import materialData from './materialIntelligenceData.json';
import axios from 'axios';

const { regions: REGIONS, climate_types: CLIMATE_TYPES, budget_tiers: BUDGET_TIERS, materials: MATERIALS_DICT } = materialData;

export const FALLBACK_META = {
  regions: REGIONS,
  climate_types: CLIMATE_TYPES,
  budget_tiers: BUDGET_TIERS,
  total_materials_indexed: Object.keys(MATERIALS_DICT).length
};

export function computeClientComparison(materialIds) {
  const materials = [];
  for (const id of materialIds) {
    const mat = MATERIALS_DICT[id];
    if (mat) {
      materials.push({
        id: mat.id,
        name: mat.name,
        category: mat.category,
        k_W_mK: mat.k_W_mK,
        density_kg_m3: mat.density_kg_m3,
        cp_J_kgK: mat.cp_J_kgK,
        volumetric_heat_capacity_MJ_m3K: Number((mat.volumetric_heat_capacity_J_m3K / 1e6).toFixed(2)),
        thermal_effusivity: Number(mat.thermal_effusivity.toFixed(1)),
        solar_absorptivity: mat.solar_absorptivity,
        emissivity: mat.emissivity,
        typical_cost_usd_m2: mat.typical_cost_usd_m2,
        cost_range_usd_m2: mat.cost_range_usd_m2,
        cost_tier: mat.cost_tier,
        durability_years: mat.durability_lifespan_years,
        durability_score: mat.durability_score,
        fire_rating: mat.fire_rating,
        embodied_carbon: mat.embodied_carbon,
        regional_availability: mat.regional_availability,
        advantages: mat.advantages,
        disadvantages: mat.disadvantages,
        source: mat.source
      });
    }
  }
  return { materials };
}

function scoreMaterialForRole(mat, role, req) {
  if (role !== 'all' && (!mat.envelope_roles || !mat.envelope_roles.includes(role))) {
    if (!(role === 'walls' && (mat.category.includes('Masonry') || mat.category.includes('Structural') || mat.category.includes('Stone') || mat.category.includes('Wood')))) {
      return null;
    }
  }

  const climate = req.climate_condition || 'high_altitude_cold_desert';
  const regionKey = REGIONS[req.location] ? req.location : 'ladakh_high_altitude';

  // 1. Thermal Performance Score (0 - 100)
  let thermalScore = 50.0;
  const thermalNotes = [];

  if (role === 'insulation') {
    thermalScore = Math.max(10.0, Math.min(100.0, 100.0 - (mat.k_W_mK - 0.020) * 1400.0));
    thermalNotes.push(`Low conductivity k=${mat.k_W_mK.toFixed(3)} W/m·K provides R-${(0.10 / mat.k_W_mK).toFixed(2)} per 100mm.`);
    if (mat.k_W_mK <= 0.035) thermalScore += 5.0;
  } else if (role === 'walls') {
    const vCap = mat.volumetric_heat_capacity_J_m3K;
    if (['high_altitude_cold_desert', 'extreme_heat', 'extreme_cold'].includes(climate)) {
      if (req.prefers_high_thermal_mass !== false) {
        const massScore = Math.min(100.0, (vCap / 2.2e6) * 90.0);
        thermalScore = massScore;
        thermalNotes.push(`High thermal mass (ρ·cp = ${(vCap / 1e6).toFixed(2)} MJ/m³·K) stabilizes day-night temperature.`);
      } else {
        const insulScore = Math.max(15.0, 100.0 - (mat.k_W_mK * 40.0));
        thermalScore = insulScore;
        thermalNotes.push(`Integrated insulation k=${mat.k_W_mK.toFixed(2)} W/m·K.`);
      }
    } else if (climate === 'tropical_humid') {
      thermalScore = Math.max(30.0, 95.0 - (vCap / 2.5e6) * 50.0);
      thermalNotes.push('Lightweight thermal inertia prevents nocturnal heat entrapment in humid climate.');
    } else {
      thermalScore = 65.0 + Math.min(30.0, (vCap / 2.0e6) * 30.0);
    }

    if (['high_altitude_cold_desert', 'extreme_cold'].includes(climate) && mat.solar_absorptivity >= 0.65) {
      thermalScore = Math.min(100.0, thermalScore + 5.0);
      thermalNotes.push(`High solar absorptivity α=${mat.solar_absorptivity.toFixed(2)} enhances daytime passive solar harvesting.`);
    }
  } else if (role === 'roofs') {
    if (['extreme_heat', 'tropical_humid'].includes(climate)) {
      const coolRoofScore = (1.0 - mat.solar_absorptivity) * 60.0 + mat.emissivity * 40.0;
      thermalScore = Math.min(100.0, Math.max(20.0, coolRoofScore));
      thermalNotes.push(`Solar reflectance (1-α = ${(1.0 - mat.solar_absorptivity).toFixed(2)}) limits attic heat gain.`);
    } else {
      if (mat.k_W_mK <= 0.05) {
        thermalScore = 95.0;
        thermalNotes.push('Superior roof insulation value.');
      } else if (mat.category.includes('Metal') || mat.name.includes('Slate')) {
        thermalScore = 80.0;
        thermalNotes.push('Snow-shedding surface angle compatible.');
      } else {
        thermalScore = 65.0;
      }
    }
  } else if (role === 'flooring') {
    if (['high_altitude_cold_desert', 'extreme_cold'].includes(climate)) {
      if (mat.thermal_effusivity < 900.0) {
        thermalScore = 90.0;
        thermalNotes.push('Warm barefoot contact comfort (low effusivity b < 900 J/m²·K·s⁰·⁵).');
      } else if (mat.volumetric_heat_capacity_J_m3K > 1.8e6) {
        thermalScore = 82.0;
        thermalNotes.push('Direct-gain solar storage floor slab.');
      } else {
        thermalScore = 65.0;
      }
    } else {
      thermalScore = Math.min(100.0, (mat.thermal_effusivity / 1800.0) * 85.0 + 15.0);
      thermalNotes.push('Cool radiant surface contact.');
    }
  } else if (role === 'glazing') {
    if (mat.name.includes('Low-E')) {
      thermalScore = 96.0;
      thermalNotes.push('Low-E coating reflects radiant heat back inside; optimal U-value.');
    } else if (mat.name.includes('Double')) {
      thermalScore = 82.0;
      thermalNotes.push('Double pane insulating air cavity reduces conductive loss.');
    } else if (mat.name.includes('Glass')) {
      thermalScore = 35.0;
      thermalNotes.push('Single pane has high conductive loss (k=1.0 W/m·K); excessive night cooling.');
    } else {
      thermalScore = 50.0;
    }
  }

  // 2. Affordability Score (0 - 100)
  const budgetTierInfo = BUDGET_TIERS[req.budget_level] || BUDGET_TIERS['moderate_balanced'];
  const budgetCap = req.budget_target_usd_m2 || budgetTierInfo.max_envelope_cost_m2;
  const cost = mat.typical_cost_usd_m2;
  let affordabilityScore = 100.0;
  if (cost <= budgetCap * 0.4) {
    affordabilityScore = 100.0;
  } else if (cost <= budgetCap) {
    affordabilityScore = 100.0 - ((cost - budgetCap * 0.4) / (budgetCap * 0.6)) * 40.0;
  } else {
    const overageRatio = (cost - budgetCap) / budgetCap;
    affordabilityScore = Math.max(5.0, 60.0 - overageRatio * 70.0);
  }

  // 3. Durability Score
  let durabilityScore = mat.durability_score * 10.0;
  if (['high_altitude_cold_desert', 'extreme_cold'].includes(climate)) {
    if (mat.category.includes('Stone') || mat.name.includes('Granite')) {
      durabilityScore = Math.min(100.0, durabilityScore + 4.0);
    } else if (mat.name.toLowerCase().includes('mud') || mat.name.toLowerCase().includes('adobe')) {
      durabilityScore = Math.max(20.0, durabilityScore - 10.0);
    }
  } else if (climate === 'tropical_humid') {
    if (mat.category.includes('Wood') || mat.category.includes('Bio-based')) {
      durabilityScore = Math.max(30.0, durabilityScore - 8.0);
    }
  }

  // 4. Regional Availability Score
  const availRating = (mat.regional_availability && mat.regional_availability[regionKey]) ?? 7.0;
  let availabilityScore = availRating * 10.0;
  if (regionKey === 'ladakh_high_altitude') {
    if (mat.density_kg_m3 > 2000.0 && !mat.name.includes('Granite') && !mat.name.toLowerCase().includes('mud') && !mat.name.toLowerCase().includes('adobe')) {
      availabilityScore = Math.max(20.0, availabilityScore - 8.0);
    }
  }

  // 5. Climate Suitability Score
  let climateSuitabilityScore = 70.0;
  if (climate === 'high_altitude_cold_desert') {
    if (role === 'insulation' && mat.k_W_mK <= 0.038) {
      climateSuitabilityScore = 95.0;
    } else if (role === 'walls' && (mat.volumetric_heat_capacity_J_m3K >= 1.5e6 || mat.k_W_mK <= 0.15)) {
      climateSuitabilityScore = 92.0;
    } else if (role === 'glazing' && mat.name.includes('Double')) {
      climateSuitabilityScore = 94.0;
    }
  } else if (climate === 'extreme_cold') {
    if (mat.k_W_mK <= 0.035) climateSuitabilityScore = 96.0;
    else if (mat.category.includes('Stone') || mat.category.includes('Concrete')) climateSuitabilityScore = 80.0;
  } else if (climate === 'extreme_heat') {
    if (mat.volumetric_heat_capacity_J_m3K >= 1.6e6 || (role === 'roofs' && mat.solar_absorptivity <= 0.4)) climateSuitabilityScore = 92.0;
  } else if (climate === 'tropical_humid') {
    if (mat.category.includes('Bio-based') || mat.name.toLowerCase().includes('coir')) climateSuitabilityScore = 85.0;
  }

  // 6. Weighted Composite Calculation
  const wTherm = Math.max(0.1, req.priority_thermal_efficiency ?? 0.85);
  const wCost = Math.max(0.1, req.priority_affordability ?? 0.70);
  const wDur = Math.max(0.1, req.priority_durability ?? 0.80);
  const wAvail = Math.max(0.1, req.priority_local_availability ?? 0.85);
  const wClim = 0.8;

  let ecoBonus = 0.0;
  if ((req.priority_eco_sustainability ?? 0.5) > 0.6) {
    if (['Very Low', 'Very Low (Carbon negative)', 'Low'].includes(mat.embodied_carbon)) ecoBonus = 6.0;
    else if (mat.embodied_carbon === 'High') ecoBonus = -4.0;
  }

  const totalWeight = wTherm + wCost + wDur + wAvail + wClim;
  let composite = (
    wTherm * thermalScore +
    wCost * affordabilityScore +
    wDur * durabilityScore +
    wAvail * availabilityScore +
    wClim * climateSuitabilityScore
  ) / totalWeight + ecoBonus;

  composite = Math.max(0.0, Math.min(100.0, composite));

  return {
    material: mat,
    total_score: Number(composite.toFixed(1)),
    thermal_score: Number(thermalScore.toFixed(1)),
    affordability_score: Number(affordabilityScore.toFixed(1)),
    durability_score: Number(durabilityScore.toFixed(1)),
    availability_score: Number(availabilityScore.toFixed(1)),
    climate_suitability_score: Number(climateSuitabilityScore.toFixed(1)),
    score_breakdown_notes: thermalNotes
  };
}

export function computeClientRecommendation(req) {
  const roles = ['walls', 'roofs', 'insulation', 'flooring', 'glazing'];
  const rankings = {};

  for (const r of roles) {
    const scoredList = [];
    for (const mat of Object.values(MATERIALS_DICT)) {
      const scored = scoreMaterialForRole(mat, r, req);
      if (scored) scoredList.push(scored);
    }
    scoredList.sort((a, b) => b.total_score - a.total_score);
    rankings[r] = scoredList.slice(0, 8).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  // 1. Primary Assembly
  const wallTop = rankings['walls'][0] || null;
  const roofTop = rankings['roofs'][0] || null;
  const insulTop = rankings['insulation'][0] || null;
  const floorTop = rankings['flooring'][0] || null;
  const glazeTop = rankings['glazing'][0] || null;

  const totalCost = (
    (wallTop?.material.typical_cost_usd_m2 || 30) +
    (roofTop?.material.typical_cost_usd_m2 || 25) +
    (insulTop?.material.typical_cost_usd_m2 || 18) +
    (floorTop?.material.typical_cost_usd_m2 || 20) +
    (glazeTop?.material.typical_cost_usd_m2 || 45) * 0.25
  );

  const rVal = (
    (0.25 / Math.max(0.01, wallTop?.material.k_W_mK || 0.6)) +
    (0.10 / Math.max(0.005, insulTop?.material.k_W_mK || 0.035))
  );

  const regionInfo = REGIONS[req.location] || { name: req.location || 'Leh, Ladakh' };
  const climateName = CLIMATE_TYPES[req.climate_condition] || 'Cold Desert';

  const primaryAssembly = {
    assembly_name: `Optimal High-Performance ${climateName} Envelope`,
    description: `Synergistic composite tailored for ${regionInfo.name}.`,
    wall_material: { material: wallTop?.material, total_score: wallTop?.total_score },
    roof_material: { material: roofTop?.material, total_score: roofTop?.total_score },
    insulation_material: { material: insulTop?.material, total_score: insulTop?.total_score },
    floor_material: { material: floorTop?.material, total_score: floorTop?.total_score },
    glazing_material: { material: glazeTop?.material, total_score: glazeTop?.total_score },
    total_estimated_cost_m2: Number(totalCost.toFixed(2)),
    estimated_envelope_r_value: Number(rVal.toFixed(2)),
    estimated_thermal_mass_rating: (wallTop?.material.volumetric_heat_capacity_J_m3K || 0) > 1.8e6 ? 'Very High' : 'Moderate',
    durability_rating_10: Number((((wallTop?.material.durability_score || 8) + (roofTop?.material.durability_score || 8) + (insulTop?.material.durability_score || 8)) / 3.0).toFixed(1))
  };

  // 2. Budget Alternative Assembly
  const budgetWall = rankings['walls'].find(m => ['Low', 'Moderate'].includes(m.material.cost_tier)) || wallTop;
  const budgetRoof = rankings['roofs'].find(m => ['Low', 'Moderate'].includes(m.material.cost_tier)) || roofTop;
  const budgetInsul = rankings['insulation'].find(m => ['Low', 'Moderate'].includes(m.material.cost_tier)) || insulTop;
  const budgetFloor = rankings['flooring'].find(m => ['Low', 'Moderate'].includes(m.material.cost_tier)) || floorTop;
  const budgetGlaze = rankings['glazing'].find(m => m.material.name.includes('Double') && !m.material.name.includes('Low-E')) || glazeTop;

  const bCost = (
    budgetWall.material.typical_cost_usd_m2 +
    budgetRoof.material.typical_cost_usd_m2 +
    budgetInsul.material.typical_cost_usd_m2 +
    budgetFloor.material.typical_cost_usd_m2 +
    budgetGlaze.material.typical_cost_usd_m2 * 0.25
  );

  const bRVal = (0.25 / Math.max(0.01, budgetWall.material.k_W_mK)) + (0.10 / Math.max(0.005, budgetInsul.material.k_W_mK));

  const budgetAssembly = {
    assembly_name: 'Cost-Optimized / Humanitarian Alternative',
    description: 'Maximizes thermal comfort per dollar spent, leveraging local building methods and economic insulation.',
    wall_material: { material: budgetWall.material, total_score: budgetWall.total_score },
    roof_material: { material: budgetRoof.material, total_score: budgetRoof.total_score },
    insulation_material: { material: budgetInsul.material, total_score: budgetInsul.total_score },
    floor_material: { material: budgetFloor.material, total_score: budgetFloor.total_score },
    glazing_material: { material: budgetGlaze.material, total_score: budgetGlaze.total_score },
    total_estimated_cost_m2: Number(bCost.toFixed(2)),
    estimated_envelope_r_value: Number(bRVal.toFixed(2)),
    estimated_thermal_mass_rating: 'High',
    durability_rating_10: Number((((budgetWall.material.durability_score) + (budgetRoof.material.durability_score) + (budgetInsul.material.durability_score)) / 3.0).toFixed(1))
  };

  // 3. High Thermal Mass Assembly
  const massWall = rankings['walls'].find(m => m.material.volumetric_heat_capacity_J_m3K >= 1.8e6) || wallTop;
  const massFloor = rankings['flooring'].find(m => m.material.volumetric_heat_capacity_J_m3K >= 1.8e6) || floorTop;

  const massAssembly = {
    assembly_name: 'High-Inertia Diurnal Trombe System',
    description: 'Focuses on heavy structural storage to capture daytime winter solar irradiance and discharge heat all night.',
    wall_material: { material: massWall.material, total_score: massWall.total_score },
    roof_material: { material: roofTop.material, total_score: roofTop.total_score },
    insulation_material: { material: insulTop.material, total_score: insulTop.total_score },
    floor_material: { material: massFloor.material, total_score: massFloor.total_score },
    glazing_material: { material: glazeTop.material, total_score: glazeTop.total_score },
    total_estimated_cost_m2: Number((totalCost * 1.05).toFixed(2)),
    estimated_envelope_r_value: Number(rVal.toFixed(2)),
    estimated_thermal_mass_rating: 'Extreme (>2.0 MJ/m³·K)',
    durability_rating_10: Number(massWall.material.durability_score.toFixed(1))
  };

  // 4. Formatted Serialized Rankings for Table
  const serializedRankings = {};
  for (const [r, items] of Object.entries(rankings)) {
    serializedRankings[r] = items.map(item => ({
      rank: item.rank,
      id: item.material.id,
      name: item.material.name,
      category: item.material.category,
      total_score: item.total_score,
      thermal_score: item.thermal_score,
      affordability_score: item.affordability_score,
      durability_score: item.durability_score,
      availability_score: item.availability_score,
      climate_suitability_score: item.climate_suitability_score,
      k_W_mK: item.material.k_W_mK,
      density_kg_m3: item.material.density_kg_m3,
      cp_J_kgK: item.material.cp_J_kgK,
      volumetric_heat_capacity_MJ_m3K: Number((item.material.volumetric_heat_capacity_J_m3K / 1e6).toFixed(2)),
      solar_absorptivity: item.material.solar_absorptivity,
      emissivity: item.material.emissivity,
      typical_cost_usd_m2: item.material.typical_cost_usd_m2,
      cost_tier: item.material.cost_tier,
      durability_years: item.material.durability_lifespan_years,
      regional_availability_score: item.material.regional_availability?.[req.location] ?? 7.0,
      fire_rating: item.material.fire_rating,
      embodied_carbon: item.material.embodied_carbon,
      advantages: item.material.advantages,
      disadvantages: item.material.disadvantages,
      notes: item.score_breakdown_notes,
      source: item.material.source
    }));
  }

  // 5. Physics AI Explanations
  const wallM = primaryAssembly.wall_material.material;
  const insulM = primaryAssembly.insulation_material.material;
  const glazeM = primaryAssembly.glazing_material.material;
  const roofM = primaryAssembly.roof_material.material;
  const costSavings = Math.max(0, primaryAssembly.total_estimated_cost_m2 - budgetAssembly.total_estimated_cost_m2);
  const costSavingsPct = Math.round((costSavings / primaryAssembly.total_estimated_cost_m2) * 100);

  const aiExplanations = {
    climate_strategy_summary: `Thermal optimization for ${regionInfo.name} prioritizes exterior continuous insulation to curb severe nighttime conduction losses alongside high-density thermal inertia to store solar gains.`,
    envelope_synergy_synthesis: `The proposed composite pairs ${wallM.name} for thermal damping with continuous ${insulM.name} on the exterior. This prevents thermal bridging and ensures a composite envelope R-value of ${primaryAssembly.estimated_envelope_r_value} m²·K/W.`,
    wall_justification: `Selected ${wallM.name} for the envelope core. With volumetric heat capacity of ${(wallM.volumetric_heat_capacity_J_m3K / 1e6).toFixed(2)} MJ/m³·K and density of ${wallM.density_kg_m3} kg/m³, it damps day-night temperature swings effectively.`,
    insulation_justification: `Recommended ${insulM.name} with low conductivity k = ${insulM.k_W_mK.toFixed(3)} W/m·K. A 100mm layer yields R-${(0.10 / insulM.k_W_mK).toFixed(2)} m²·K/W, cutting Fourier conductive heat flux by over 75% during freezing nights.`,
    glazing_justification: `Recommended ${glazeM.name}. The selective coating admits high shortwave solar radiation during clear days while reflecting internal longwave infrared back into the shelter.`,
    roof_justification: `Selected ${roofM.name} for structural snow load resistance and high rafter insulation support, sealing off top-down convective heat escape.`,
    budget_alternative_analysis: `The budget alternative replaces premium insulation with ${budgetAssembly.insulation_material.material.name} and local wall methods, lowering envelope costs from $${primaryAssembly.total_estimated_cost_m2}/m² down to $${budgetAssembly.total_estimated_cost_m2}/m² (saving ${costSavingsPct}%).`,
    cost_saving_pct: costSavingsPct,
    estimated_cost_saving_usd_m2: Number(costSavings.toFixed(2))
  };

  return {
    request_summary: {
      location: req.location,
      location_label: regionInfo.name,
      climate_condition: req.climate_condition,
      climate_label: climateName,
      budget_level: req.budget_level,
      budget_label: BUDGET_TIERS[req.budget_level]?.label || req.budget_level,
      budget_cap_usd_m2: req.budget_target_usd_m2 || 75.0
    },
    primary_assembly: primaryAssembly,
    budget_alternative_assembly: budgetAssembly,
    high_thermal_mass_assembly: massAssembly,
    role_rankings: serializedRankings,
    ai_explanations: aiExplanations,
    disclaimer: 'Physical thermophysical properties (k, rho, cp, alpha, emissivity) are verified from ASHRAE / NIST reference literature. Financial costs, lifespans, and regional logistics ratings are estimated engineering benchmarks.'
  };
}

export async function fetchMaterialMeta() {
  try {
    const res = await axios.get('/api/materials/intelligence/meta');
    if (res.data && res.data.regions) {
      return res.data;
    }
  } catch {
    // Backend offline / 404 (e.g. Vercel static deployment)
  }
  return FALLBACK_META;
}

export async function fetchMaterialRecommendation(payload) {
  try {
    const res = await axios.post('/api/materials/intelligence/recommend', payload);
    if (res.data && res.data.primary_assembly) {
      return res.data;
    }
  } catch (err) {
    console.info('Backend recommendation API offline (404/network). Using client-side physics recommendation engine.');
  }
  return computeClientRecommendation(payload);
}

export async function fetchMaterialComparison(ids) {
  try {
    const res = await axios.post('/api/materials/intelligence/compare', { material_ids: ids });
    if (res.data && res.data.materials) {
      return res.data.materials;
    }
  } catch {
    console.info('Backend comparison API offline. Using client-side material comparison.');
  }
  return computeClientComparison(ids).materials;
}
