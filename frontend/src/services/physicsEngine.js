export function formatDisplayNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number))
        return String(value);
    return number.toFixed(5).replace(/\.?(0+)$/, '');
}

export function LCG(seed) {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    let state = seed;
    return function () {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
}
export function pseudoNormal(seed) {
    const rand = LCG(seed);
    let u1 = rand();
    const u2 = rand();
    if (u1 === 0)
        u1 = 0.0001;
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}
export function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0)
        return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        const values = [];
        let insideQuote = false;
        let currentVal = "";
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') {
                insideQuote = !insideQuote;
            }
            else if (char === ',' && !insideQuote) {
                values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
                currentVal = "";
            }
            else {
                currentVal += char;
            }
        }
        values.push(currentVal.trim().replace(/^["']|["']$/g, ""));
        const obj = {};
        headers.forEach((header, idx) => {
            const val = values[idx];
            if (val !== undefined) {
                const num = parseFloat(val);
                obj[header] = isNaN(num) ? val : num;
            }
        });
        result.push(obj);
    }
    return result;
}
export const DEFAULT_MATERIALS = {
    "concrete_dense": { name: "Dense Concrete", k: 1.75, rho: 2300, cp: 1000, alpha: 0.65, epsilon: 0.9, is_pcm: false },
    "concrete_light": { name: "Lightweight Concrete", k: 0.38, rho: 1000, cp: 1000, alpha: 0.6, epsilon: 0.9, is_pcm: false },
    "brick_common": { name: "Common Brick", k: 0.72, rho: 1700, cp: 840, alpha: 0.7, epsilon: 0.9, is_pcm: false },
    "stone_granite": { name: "Granite / Local Stone", k: 2.8, rho: 2600, cp: 790, alpha: 0.55, epsilon: 0.9, is_pcm: false },
    "rammed_earth": { name: "Rammed Earth", k: 0.6, rho: 1900, cp: 1170, alpha: 0.7, epsilon: 0.9, is_pcm: false },
    "mud_brick_adobe": { name: "Mud Brick (Adobe)", k: 0.46, rho: 1600, cp: 1000, alpha: 0.7, epsilon: 0.9, is_pcm: false },
    "timber_softwood": { name: "Softwood Timber", k: 0.13, rho: 500, cp: 1600, alpha: 0.6, epsilon: 0.9, is_pcm: false },
    "eps_insulation": { name: "EPS Insulation", k: 0.034, rho: 20, cp: 1450, alpha: 0.5, epsilon: 0.9, is_pcm: false },
    "xps_insulation": { name: "XPS Insulation", k: 0.029, rho: 35, cp: 1450, alpha: 0.5, epsilon: 0.9, is_pcm: false },
    "mineral_wool": { name: "Mineral Wool", k: 0.04, rho: 100, cp: 840, alpha: 0.5, epsilon: 0.9, is_pcm: false },
    "straw_bale": { name: "Straw Bale", k: 0.07, rho: 110, cp: 1500, alpha: 0.6, epsilon: 0.9, is_pcm: false },
    "water": { name: "Water (thermal mass)", k: 0.6, rho: 1000, cp: 4186, alpha: 0.9, epsilon: 0.9, is_pcm: false },
    "glass_single": { name: "Single Glazing", k: 1.0, rho: 2500, cp: 840, alpha: 0.05, epsilon: 0.84, is_pcm: false },
    "glass_double_air": { name: "Double Glazing (air gap)", k: 0.7, rho: 2500, cp: 840, alpha: 0.05, epsilon: 0.84, is_pcm: false },
    "glass_double_lowE": { name: "Double Glazing Low-E Argon", k: 0.5, rho: 2500, cp: 840, alpha: 0.05, epsilon: 0.2, is_pcm: false },
    "air_gap": { name: "Air Gap (unventilated)", k: 0.16, rho: 1.2, cp: 1005, alpha: 0.0, epsilon: 0.9, is_pcm: false },
    "pcm_rt21": {
        name: "PCM RT21 (paraffin)", k: 0.2, rho: 880, cp: 2000, alpha: 0.6, epsilon: 0.9,
        is_pcm: true, pcm_props: { T_melt: 21.0, L: 155000, band: 2.5 }
    },
    "pcm_salt_hydrate": {
        name: "PCM Salt Hydrate", k: 1.1, rho: 1560, cp: 2200, alpha: 0.6, epsilon: 0.9,
        is_pcm: true, pcm_props: { T_melt: 29.0, L: 190000, band: 2.0 }
    },

    // -----------------------------------------------------------------------
    // CSV-sourced materials: ShelterIQ_materials_filtered.csv
    // Keys are slugified material_name values (same algorithm as backend).
    // Existing keys above are NOT duplicated here — they remain authoritative.
    // category + source are stored here so the catalog can display them
    // without a separate API call.
    // -----------------------------------------------------------------------

    // Structural
    "normal_weight_concrete":    { name: "Normal-weight concrete",    k: 1.7,   rho: 2300,  cp: 880,  epsilon: 0.94, alpha: 0.6,  is_pcm: false, category: "Structural", source: "ASHRAE Ch.26 / NIST reference data" },
    "high_strength_concrete":    { name: "High-strength concrete",    k: 2.0,   rho: 2400,  cp: 840,  epsilon: 0.94, alpha: 0.6,  is_pcm: false, category: "Structural", source: "ASHRAE Ch.26 / engineering reference" },

    // Masonry
    "aerated_autoclaved_concrete_aac": { name: "Aerated autoclaved concrete (AAC)", k: 0.12,  rho: 550,   cp: 1000, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Masonry", source: "ASHRAE Ch.26 / engineering reference" },
    "dense_concrete_block":      { name: "Dense concrete block",      k: 1.1,   rho: 2100,  cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Masonry", source: "ASHRAE Ch.26 / NIST reference data" },
    "lightweight_concrete_block":{ name: "Lightweight concrete block",k: 0.3,   rho: 1000,  cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Masonry", source: "ASHRAE Ch.26 / NIST reference data" },
    "common_clay_brick":         { name: "Common clay brick",         k: 0.6,   rho: 1800,  cp: 840,  epsilon: 0.9,  alpha: 0.71, is_pcm: false, category: "Masonry", source: "ASHRAE Ch.26 / NIST reference data" },
    "engineering_brick":         { name: "Engineering brick",         k: 1.1,   rho: 2100,  cp: 840,  epsilon: 0.9,  alpha: 0.71, is_pcm: false, category: "Masonry", source: "ASHRAE Ch.26 / engineering reference" },
    "adobe_mud_brick":           { name: "Adobe / mud brick",         k: 0.7,   rho: 1600,  cp: 900,  epsilon: 0.9,  alpha: 0.65, is_pcm: false, category: "Masonry", source: "Building-material literature / engineering reference" },

    // Stone
    "granite":               { name: "Granite",                   k: 2.8,   rho: 2700,  cp: 790,  epsilon: 0.9,  alpha: 0.65, is_pcm: false, category: "Stone", source: "NIST/engineering reference" },
    "limestone":                 { name: "Limestone",                 k: 1.3,   rho: 2300,  cp: 900,  epsilon: 0.9,  alpha: 0.65, is_pcm: false, category: "Stone", source: "NIST/engineering reference" },
    "sandstone":                 { name: "Sandstone",                 k: 1.8,   rho: 2200,  cp: 800,  epsilon: 0.9,  alpha: 0.65, is_pcm: false, category: "Stone", source: "NIST/engineering reference" },
    "marble":                    { name: "Marble",                    k: 2.9,   rho: 2700,  cp: 880,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Stone", source: "Engineering reference" },
    "slate":                     { name: "Slate",                     k: 2.2,   rho: 2700,  cp: 800,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Stone", source: "Engineering reference" },

    // Finish
    "gypsum_plaster":            { name: "Gypsum plaster",            k: 0.35,  rho: 950,   cp: 840,  epsilon: 0.9,  alpha: 0.5,  is_pcm: false, category: "Finish", source: "NIST reference / building-material literature" },
    "gypsum_board":              { name: "Gypsum board",              k: 0.16,  rho: 800,   cp: 1090, epsilon: 0.9,  alpha: 0.5,  is_pcm: false, category: "Finish", source: "NIST / ASHRAE reference" },
    "cement_plaster":            { name: "Cement plaster",            k: 0.72,  rho: 1800,  cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Finish", source: "Engineering reference" },
    "lime_plaster":              { name: "Lime plaster",              k: 0.7,   rho: 1700,  cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Finish", source: "Building-material literature" },
    "ceramic_tile":              { name: "Ceramic tile",              k: 1.3,   rho: 2000,  cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Finish", source: "Engineering reference" },

    // Wood
    "hardwood_timber":           { name: "Hardwood timber",           k: 0.18,  rho: 700,   cp: 1600, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Wood", source: "ASHRAE / building-material literature" },
    "plywood":                   { name: "Plywood",                   k: 0.13,  rho: 550,   cp: 1200, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Wood", source: "ASHRAE / engineering reference" },
    "osb_board":                 { name: "OSB board",                 k: 0.13,  rho: 600,   cp: 1500, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Wood", source: "Engineering reference" },

    // Insulation
    "cork_board":                { name: "Cork board",                k: 0.043, rho: 120,   cp: 1800, epsilon: 0.9,  alpha: 0.7,  is_pcm: false, category: "Insulation", source: "NIST SRD 81 / building-material literature" },
    "expanded_perlite":          { name: "Expanded perlite",          k: 0.05,  rho: 150,   cp: 900,  epsilon: 0.9,  alpha: 0.55, is_pcm: false, category: "Insulation", source: "ASHRAE / NIST reference" },
    "vermiculite":               { name: "Vermiculite",               k: 0.065, rho: 120,   cp: 1000, epsilon: 0.9,  alpha: 0.55, is_pcm: false, category: "Insulation", source: "ASHRAE / NIST SRD 81" },
    "glass_fiber_batt":          { name: "Glass fiber batt",          k: 0.04,  rho: 20,    cp: 800,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "ASHRAE Ch.26 / NIST SRD 81" },
    "rock_wool_batt":            { name: "Rock wool batt",            k: 0.035, rho: 45,    cp: 800,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "ASHRAE Ch.26 / NIST SRD 81" },
    "cellular_glass":            { name: "Cellular glass",            k: 0.05,  rho: 120,   cp: 840,  epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "NIST SRD 81 / ASHRAE" },
    "polyurethane_foam":         { name: "Polyurethane foam",         k: 0.025, rho: 35,    cp: 1400, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "ASHRAE / NIST SRD 81" },
    "polyisocyanurate_foam":     { name: "Polyisocyanurate foam",     k: 0.023, rho: 35,    cp: 1400, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "ASHRAE / manufacturer-reference range" },
    "phenolic_foam":             { name: "Phenolic foam",             k: 0.02,  rho: 40,    cp: 1400, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Insulation", source: "Engineering/manufacturer reference" },

    // Bio-based insulation
    "hemp_lime_hempcrete":       { name: "Hemp-lime (hempcrete)",     k: 0.07,  rho: 300,   cp: 1500, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Bio-based insulation", source: "Building-material literature" },
    "sheep_wool_insulation":     { name: "Sheep wool insulation",     k: 0.04,  rho: 25,    cp: 1500, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Bio-based insulation", source: "Building-material literature" },
    "wood_fiber_insulation_board":{ name: "Wood fiber insulation board", k: 0.045, rho: 160, cp: 2100, epsilon: 0.9, alpha: 0.6,  is_pcm: false, category: "Bio-based insulation", source: "Building-material literature" },
    "cellulose_loose_fill":      { name: "Cellulose loose-fill",      k: 0.04,  rho: 50,    cp: 1800, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Bio-based insulation", source: "ASHRAE / building-material literature" },
    "coconut_coir_fiber":        { name: "Coconut coir fiber",        k: 0.045, rho: 100,   cp: 1500, epsilon: 0.9,  alpha: 0.6,  is_pcm: false, category: "Bio-based insulation", source: "Building-material literature" },

    // Polymer
    "polyethylene":              { name: "Polyethylene",              k: 0.4,   rho: 940,   cp: 1900, epsilon: 0.9,  alpha: 0.5,  is_pcm: false, category: "Polymer", source: "Engineering material reference" },
    "pvc":                       { name: "PVC",                       k: 0.17,  rho: 1400,  cp: 900,  epsilon: 0.9,  alpha: 0.5,  is_pcm: false, category: "Polymer", source: "ASHRAE / engineering reference" },
    "rubber":                    { name: "Rubber",                    k: 0.16,  rho: 1100,  cp: 1400, epsilon: 0.9,  alpha: 0.5,  is_pcm: false, category: "Polymer", source: "NIST SRD 81 / engineering reference" },

    // Glazing
    "glass":                 { name: "Glass",                     k: 1.0,   rho: 2500,  cp: 750,  epsilon: 0.95, alpha: 0.85, is_pcm: false, category: "Glazing", source: "ASHRAE Ch.26 / NIST reference" },
    "double_glazing_air_gap":    { name: "Double glazing, air gap",   k: 2.7,   rho: 2500,  cp: 750,  epsilon: 0.84, alpha: 0.7,  is_pcm: false, category: "Glazing", source: "ASHRAE / glazing reference" },
    "low_e_double_glazing":      { name: "Low-E double glazing",      k: 1.4,   rho: 2500,  cp: 750,  epsilon: 0.84, alpha: 0.5,  is_pcm: false, category: "Glazing", source: "ASHRAE / glazing reference" },

    // Air cavity
    "air_gap_still":             { name: "Air gap, still",            k: 0.026, rho: 1.2,   cp: 1007, epsilon: 0.9,  alpha: 0.1,  is_pcm: false, category: "Air cavity", source: "ASHRAE air-space reference" },

    // Thermal storage
    "water_csv":                 { name: "Water",                     k: 0.6,   rho: 1000,  cp: 4180, epsilon: 0.96, alpha: 0.1,  is_pcm: false, category: "Thermal storage", source: "Engineering thermophysical reference" },

    // PCM (no latent heat data in CSV — registered as plain thermal-mass materials)
    "paraffin_pcm":              { name: "Paraffin PCM",              k: 0.2,   rho: 900,   cp: 2000, epsilon: 0.9,  alpha: 0.7,  is_pcm: false, category: "PCM", source: "PCM literature / manufacturer-dependent" },
    "salt_hydrate_pcm_cacl2_6h2o":{ name: "Salt-hydrate PCM (CaCl2·6H2O)", k: 0.5, rho: 1710, cp: 1400, epsilon: 0.9, alpha: 0.7, is_pcm: false, category: "PCM", source: "PCM literature / manufacturer-dependent" },
    "eutectic_pcm_organic":      { name: "Eutectic PCM, organic",     k: 0.2,   rho: 850,   cp: 2000, epsilon: 0.9,  alpha: 0.7,  is_pcm: false, category: "PCM", source: "PCM literature / manufacturer-dependent" },

    // Metal
    "aluminum":                  { name: "Aluminum",                  k: 205.0, rho: 2700,  cp: 900,  epsilon: 0.2,  alpha: 0.3,  is_pcm: false, category: "Metal", source: "Engineering thermophysical reference" },
    "steel":                     { name: "Steel",                     k: 50.0,  rho: 7850,  cp: 490,  epsilon: 0.8,  alpha: 0.6,  is_pcm: false, category: "Metal", source: "Engineering thermophysical reference" }
};
export class MaterialDatabase {
    db;
    constructor() {
        this.db = JSON.parse(JSON.stringify(DEFAULT_MATERIALS));
    }
    get(key) {
        if (!this.db[key]) {
            throw new Error(`Unknown material: ${key}`);
        }
        return this.db[key];
    }
    add(key, material) {
        this.db[key] = material;
    }
    list() {
        return Object.keys(this.db);
    }
    effectiveCp(material, T) {
        if (!material.is_pcm || !material.pcm_props) {
            return material.cp;
        }
        const T_melt = material.pcm_props.T_melt;
        const L = material.pcm_props.L;
        const band = material.pcm_props.band || 2.0;
        if (Math.abs(T - T_melt) <= band) {
            const sigma = band / 2.5;
            const spike = (L / (sigma * Math.sqrt(2.0 * Math.PI))) * Math.exp(-0.5 * Math.pow((T - T_melt) / sigma, 2));
            return material.cp + spike;
        }
        return material.cp;
    }
}
export const RHO_AIR = 1.2;
export const CP_AIR = 1005.0;
export const H_MS_VAL = 9.1;
export const GROUND_TEMP_C = 6.0;
export function interpolate(x, xs, ys) {
    if (x <= xs[0])
        return ys[0];
    if (x >= xs[xs.length - 1])
        return ys[ys.length - 1];
    let low = 0, high = xs.length - 1;
    while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (xs[mid] <= x)
            low = mid;
        else
            high = mid;
    }
    const t = (x - xs[low]) / (xs[high] - xs[low]);
    return ys[low] + t * (ys[high] - ys[low]);
}
export function climateAt(climate, t_hour) {
    return {
        T_out: interpolate(t_hour, climate.t_hours, climate.T_out),
        ghi: interpolate(t_hour, climate.t_hours, climate.ghi),
        wind: interpolate(t_hour, climate.t_hours, climate.wind),
        rh: interpolate(t_hour, climate.t_hours, climate.rh),
        cloud: interpolate(t_hour, climate.t_hours, climate.cloud)
    };
}
export function syntheticLadakhWinter(duration_h = 72, dt_h = 0.5, T_mean = -8.0, T_amp = 9.0, ghi_peak = 650, wind_mean = 3.5, rh_mean = 35, cloud_mean = 15) {
    const t = [];
    for (let hour = 0; hour <= duration_h + 1e-9; hour += dt_h) {
        t.push(hour);
    }
    const T_out = [];
    const ghi = [];
    const wind = [];
    const rh = [];
    const cloud = [];
    for (let i = 0; i < t.length; i++) {
        const hod = t[i] % 24;
        const t_out = T_mean + T_amp * Math.sin(2.0 * Math.PI * (hod - 6) / 24 - Math.PI / 2.0);
        T_out.push(t_out);
        const daylight = Math.max(Math.sin(Math.PI * (hod - 6) / 12), 0.0);
        const g = ghi_peak * Math.pow(daylight, 1.3);
        ghi.push(g);
        const r_wind = pseudoNormal(42 + i) * 0.3;
        const w = wind_mean + 1.5 * Math.sin(2.0 * Math.PI * (hod - 15) / 24) + r_wind;
        wind.push(Math.max(w, 0.2));
        const r_rh = pseudoNormal(100 + i) * 2;
        const r = rh_mean - 8 * daylight + r_rh;
        rh.push(Math.max(Math.min(r, 100), 5));
        cloud.push(cloud_mean);
    }
    return { t_hours: t, T_out, ghi, wind, rh, cloud };
}
export function getRValue(layers, is_ground_contact = false, include_films = true) {
    let r = 0;
    for (const l of layers) {
        r += l.thickness / l.material.k;
    }
    if (include_films) {
        if (!is_ground_contact) {
            r += 0.04 + 0.13;
        }
        else {
            r += 0.13 + 1.8;
        }
    }
    return r;
}
export function getUValue(layers, is_ground_contact = false) {
    return 1.0 / getRValue(layers, is_ground_contact, true);
}
export function getArealHeatCapacity(layers) {
    let kappa = 0;
    let depth_used = 0;
    const max_depth = 0.10;
    for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        const remaining = max_depth - depth_used;
        if (remaining <= 0)
            break;
        const eff_thick = Math.min(l.thickness, remaining);
        kappa += l.material.rho * l.material.cp * eff_thick;
        depth_used += eff_thick;
    }
    return kappa;
}
export function getOpeningUValue(opening) {
    if (opening.u_value_override !== null && opening.u_value_override !== undefined) {
        return opening.u_value_override;
    }
    if (opening.glazing) {
        if (opening.glazing.is_pcm)
            return 1.0 / 1.4;
        const R = 0.006 / opening.glazing.k + 0.04 + 0.13;
        return opening.is_door ? 2.0 : 1.0 / R;
    }
    return 2.0;
}
export function surfaceIrradiance(ghi, hod, surface_orientation_deg, surface_tilt_deg, cloud_pct = 0.0, latitude_deg = 34.0) {
    if (ghi <= 0)
        return 0.0;
    const hour_angle_deg = 15.0 * (hod - 12.0);
    const declination_deg = -20.0;
    const lat = latitude_deg * Math.PI / 180.0;
    const decl = declination_deg * Math.PI / 180.0;
    const ha = hour_angle_deg * Math.PI / 180.0;
    let sin_alt = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
    sin_alt = Math.max(Math.min(sin_alt, 1.0), 0.001);
    const solar_altitude = Math.asin(sin_alt);
    let cos_az = (Math.sin(decl) - Math.sin(lat) * sin_alt) / (Math.cos(lat) * Math.cos(solar_altitude) + 1e-9);
    cos_az = Math.max(Math.min(cos_az, 1.0), -1.0);
    const solar_azimuth = ha !== 0 ? 180.0 + (Math.sign(ha) * Math.acos(cos_az)) * 180.0 / Math.PI : 180.0;
    const diffuse_frac = 0.15;
    const beam = ghi * (1.0 - diffuse_frac);
    const diffuse = ghi * diffuse_frac;
    const tilt = surface_tilt_deg * Math.PI / 180.0;
    const surf_az = surface_orientation_deg * Math.PI / 180.0;
    const sun_az = solar_azimuth * Math.PI / 180.0;
    let cos_incidence = Math.sin(solar_altitude) * Math.cos(tilt) +
        Math.cos(solar_altitude) * Math.sin(tilt) * Math.cos(sun_az - surf_az);
    cos_incidence = Math.max(Math.min(cos_incidence, 1.0), 0.0);
    const beam_on_surface = beam * cos_incidence;
    const diffuse_on_surface = diffuse * (1.0 + Math.cos(tilt)) / 2.0;
    const total = beam_on_surface + diffuse_on_surface;
    const cloud_derate = 1.0 - 0.75 * (cloud_pct / 100.0);
    return Math.max(total * cloud_derate, 0.0);
}
export const DEFAULT_COMFORT_BAND = {
    // Comfort band for Ladakh winter shelter with auxiliary heating.
    // Passive shelter never exceeds ~5°C (outdoor -8°C mean), so heating
    // is required to bring indoor temps into the comfort zone.
    // 16°C = WHO minimum for sedentary occupants (heated space).
    t_min: 16.0,
    t_max: 26.0,
    t_marginal_low: 8.0,   // below this: cold-stress risk even with some shelter
    t_marginal_high: 30.0
};
export function simulate(shelter, climate, dt_h = 0.5, added_masses = [], internal_gains_W = 100.0, comfort_band = DEFAULT_COMFORT_BAND, heating_setpoint_C = null, T_air0 = 5.0, T_mass0 = 5.0) {
    const active_comfort_band = (comfort_band && comfort_band.t_min != null) ? comfort_band : DEFAULT_COMFORT_BAND;
    const duration_h = Number(climate.t_hours[climate.t_hours.length - 1] || 0);
    const step = Math.max(Number(dt_h) || 0.5, 0.001);
    const t_axis = [];
    for (let hour = 0; hour <= duration_h + 1e-9; hour += step) {
        t_axis.push(Number(hour.toFixed(10)));
    }
    const n = t_axis.length;
    const windows = shelter.openings.filter(o => !o.is_door);
    const H_win_total = shelter.openings.reduce((sum, o) => sum + getOpeningUValue(o) * o.area, 0.0);
    let shelter_volume = shelter.length * shelter.width * shelter.height;
    if (shelter.shape === "pitched_roof_box") {
        const ridge_extra = shelter.width * Math.tan(shelter.roof_pitch_deg * Math.PI / 180.0) * shelter.length / 2.0;
        shelter_volume += ridge_extra;
    }
    const H_ve = 0.34 * shelter.ach * shelter_volume;
    const wall_gross_area = 2.0 * (shelter.length + shelter.width) * shelter.height;
    const wall_net_area = wall_gross_area - shelter.openings.reduce((sum, o) => sum + o.area, 0.0);
    const roof_area = shelter.shape === "flat_roof_box" ? shelter.length * shelter.width : (shelter.length * shelter.width) / Math.cos(shelter.roof_pitch_deg * Math.PI / 180.0);
    const H_ms = H_MS_VAL * (wall_net_area + roof_area);
    const C_air = RHO_AIR * CP_AIR * shelter_volume;
    const C_mass_walls = getArealHeatCapacity(shelter.walls.N) * (wall_net_area / 4.0);
    const C_mass_roof = getArealHeatCapacity(shelter.roof) * roof_area;
    const C_mass_floor = getArealHeatCapacity(shelter.floor) * (shelter.length * shelter.width);
    let C_mass = C_mass_walls * 4.0 + C_mass_roof + C_mass_floor;
    const mdb = new MaterialDatabase();
    for (const am of added_masses) {
        const cp_val = am.material.cp;
        C_mass += am.material.rho * cp_val * am.volume_m3;
    }
    const T_air = new Array(n);
    const T_mass = new Array(n);
    T_air[0] = T_air0;
    T_mass[0] = T_mass0;
    const solar_gain = new Array(n).fill(0);
    const conduction_loss = new Array(n).fill(0);
    const ventilation_loss = new Array(n).fill(0);
    const net_heat_flow = new Array(n).fill(0);
    const storage_rate = new Array(n).fill(0);
    const heating_power = new Array(n).fill(0);
    const comfort_status = new Array(n);
    comfort_status[0] = classifyComfort(T_air0, comfort_band);
    const elements = [
        { name: "Wall-N", layers: shelter.walls.N, area: wall_net_area / 4.0, orientation_deg: 0.0, tilt_deg: 90.0, is_ground_contact: false },
        { name: "Wall-E", layers: shelter.walls.E, area: wall_net_area / 4.0, orientation_deg: 90.0, tilt_deg: 90.0, is_ground_contact: false },
        { name: "Wall-S", layers: shelter.walls.S, area: wall_net_area / 4.0, orientation_deg: 180.0, tilt_deg: 90.0, is_ground_contact: false },
        { name: "Wall-W", layers: shelter.walls.W, area: wall_net_area / 4.0, orientation_deg: 270.0, tilt_deg: 90.0, is_ground_contact: false },
        { name: "Roof", layers: shelter.roof, area: roof_area, orientation_deg: shelter.orientation_deg, tilt_deg: shelter.shape === "flat_roof_box" ? 0.0 : shelter.roof_pitch_deg, is_ground_contact: false },
        { name: "Floor", layers: shelter.floor, area: shelter.length * shelter.width, orientation_deg: 0.0, tilt_deg: 180.0, is_ground_contact: true }
    ];
    for (let k = 1; k < n; k++) {
        const dt_h_step = t_axis[k] - t_axis[k - 1];
        const dt_sec = dt_h_step * 3600.0;
        const hod = t_axis[k] % 24.0;
        const cl = climateAt(climate, t_axis[k]);
        const T_out_k = cl.T_out;
        const h_out_dyn = 5.7 + 3.8 * Math.max(cl.wind, 0.0);
        let current_C_mass = C_mass_walls * 4.0 + C_mass_roof + C_mass_floor;
        for (const am of added_masses) {
            const cp_dynamic = am.material.is_pcm ?
                mdb.effectiveCp(am.material, T_mass[k - 1]) : am.material.cp;
            current_C_mass += am.material.rho * cp_dynamic * am.volume_m3;
        }
        let Hop_sum = 0.0;
        let Hop_Tsolair_sum = 0.0;
        let Q_opaque_solar = 0.0;
        let Hop_ground = 0.0;
        let Hop_nonground = 0.0;
        for (const el of elements) {
            const U = getUValue(el.layers, el.is_ground_contact);
            const A = el.area;
            let T_solair;
            if (el.is_ground_contact) {
                T_solair = GROUND_TEMP_C;
                Hop_ground += U * A;
            }
            else {
                Hop_nonground += U * A;
                const I_surf = surfaceIrradiance(cl.ghi, hod, el.orientation_deg, el.tilt_deg, cl.cloud);
                const alpha = el.layers.length > 0 ? el.layers[0].material.alpha : 0.6;
                const solar_dt = (cl.ghi > 0 && I_surf > 0) ? (alpha * I_surf / h_out_dyn) : 0.0;
                T_solair = T_out_k + solar_dt - (el.tilt_deg < 10 ? (I_surf === 0 ? 4.0 : 0.0) : 0.0);
                if (solar_dt > 0) {
                    Q_opaque_solar += U * A * solar_dt;
                }
            }
            Hop_sum += U * A;
            Hop_Tsolair_sum += U * A * T_solair;
        }
        let Q_win_solar = 0.0;
        if (cl.ghi > 0) {
            for (const w of windows) {
                const I_surf = surfaceIrradiance(cl.ghi, hod, w.orientation_deg, 90.0, cl.cloud);
                Q_win_solar += I_surf * w.shgc * w.area;
            }
        }
        const Q_solar_air = 0.7 * Q_win_solar + internal_gains_W;
        const Q_solar_mass = 0.3 * Q_win_solar;
        const a11 = C_air / dt_sec + H_ve + H_win_total + H_ms;
        const a12 = -H_ms;
        const a21 = -H_ms;
        const a22 = current_C_mass / dt_sec + Hop_sum + H_ms;
        const b1 = (C_air / dt_sec) * T_air[k - 1] + (H_ve + H_win_total) * T_out_k + Q_solar_air;
        const b2 = (current_C_mass / dt_sec) * T_mass[k - 1] + Hop_Tsolair_sum + Q_solar_mass;
        const det = a11 * a22 - a12 * a21;
        let Ta_new = (a22 * b1 - a12 * b2) / det;
        let Tm_new = (-a21 * b1 + a11 * b2) / det;
        let q_heat = 0.0;
        if (heating_setpoint_C !== null && heating_setpoint_C !== undefined && Ta_new < heating_setpoint_C) {
            Ta_new = heating_setpoint_C;
            Tm_new = (b2 + H_ms * Ta_new) / a22;
            q_heat = a11 * Ta_new - H_ms * Tm_new - b1;
            q_heat = Math.max(q_heat, 0.0);
        }
        T_air[k] = Ta_new;
        T_mass[k] = Tm_new;
        heating_power[k] = q_heat;
        comfort_status[k] = classifyComfort(Ta_new, active_comfort_band);
        solar_gain[k] = cl.ghi > 0 ? Math.max(0.0, Q_win_solar + Q_opaque_solar) : 0.0;
        const cond_opaque_loss = Hop_nonground * (Tm_new - T_out_k) + Hop_ground * (Tm_new - GROUND_TEMP_C);
        const cond_window_loss = H_win_total * (Ta_new - T_out_k);
        conduction_loss[k] = cond_opaque_loss + cond_window_loss;
        ventilation_loss[k] = H_ve * (Ta_new - T_out_k);
        net_heat_flow[k] = Q_solar_air + Q_solar_mass + q_heat - conduction_loss[k] - ventilation_loss[k];
        storage_rate[k] = (current_C_mass * (Tm_new - T_mass[k - 1]) + C_air * (Ta_new - T_air[k - 1])) / dt_sec;
    }
    const summary = { comfortable: 0.0, marginal: 0.0, uncomfortable: 0.0 };
    for (let k = 1; k < n; k++) {
        const dt_h_step = t_axis[k] - t_axis[k - 1];
        summary[comfort_status[k]] = (summary[comfort_status[k]] || 0) + dt_h_step;
    }
    let heating_energy_kWh = 0;
    for (let k = 1; k < n; k++) {
        const dt_h_step = t_axis[k] - t_axis[k - 1];
        heating_energy_kWh += 0.5 * (heating_power[k] + heating_power[k - 1]) * dt_h_step;
    }
    heating_energy_kWh /= 1000.0;
    const min_T_air = Math.min(...T_air);
    const max_T_air = Math.max(...T_air);
    const score = designScore({ comfort_summary_hours: summary, heating_energy_kWh, T_air }, t_axis[t_axis.length - 1]);
    return {
        t_hours: t_axis,
        T_out: t_axis.map((hour) => climateAt(climate, hour).T_out),
        T_air,
        T_mass,
        solar_gain_W: solar_gain,
        conduction_loss_W: conduction_loss,
        ventilation_loss_W: ventilation_loss,
        net_heat_flow_W: net_heat_flow,
        storage_rate_W: storage_rate,
        heating_power_W: heating_power,
        comfort_status,
        comfort_summary_hours: summary,
        heating_energy_kWh,
        min_T_air,
        max_T_air,
        design_score: score
    };
}
export function classifyComfort(T, band = DEFAULT_COMFORT_BAND) {
    const b = (band && band.t_min != null) ? band : DEFAULT_COMFORT_BAND;
    if (T >= b.t_min - 0.05 && T <= b.t_max + 0.05)
        return "comfortable";
    if ((T >= b.t_marginal_low - 0.05 && T < b.t_min - 0.05) || (T > b.t_max + 0.05 && T <= b.t_marginal_high + 0.05))
        return "marginal";
    return "uncomfortable";
}
export function normalizeDesignScore(res, comfort_band_hours_duration = 72.0) {
    const comfortHours = Number(res?.comfort_summary_hours?.comfortable ?? res?.comfortable_h ?? 0);
    const heatingEnergyKWh = Number(res?.heating_energy_kWh ?? res?.estimated_heating_kWh ?? 0);
    const tempSeries = Array.isArray(res?.T_air) ? res.T_air : [];
    const mean_T = tempSeries.length > 0 ? tempSeries.reduce((a, b) => a + b, 0) / tempSeries.length : 0;
    const variance = tempSeries.length > 0 ? tempSeries.reduce((a, b) => a + Math.pow(b - mean_T, 2), 0) / tempSeries.length : 0;
    const std = Math.sqrt(variance);
    const comfort_score = Math.min(comfortHours / comfort_band_hours_duration, 1.0);
    const heating_score = 1.0 - Math.min(heatingEnergyKWh / 150.0, 1.0);
    const stability_score = 1.0 - Math.min(std / 10.0, 1.0);
    const score = 100 * (0.4 * comfort_score + 0.35 * heating_score + 0.25 * stability_score);
    return Math.round(score * 10) / 10;
}

export function designScore(res, comfort_band_hours_duration = 72.0) {
    return normalizeDesignScore(res, comfort_band_hours_duration);
}
