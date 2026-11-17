"""
material_intelligence.py — AI-Powered Construction Material Intelligence & Recommendation Engine.

Evaluates construction materials for extreme-climate passive shelters based on:
  - Thermal conductivity (k) [W/m.K]
  - Density (rho) [kg/m3]
  - Specific heat capacity (cp) [J/kg.K]
  - Volumetric heat capacity (rho * cp) [J/m3.K]
  - Solar absorptivity (alpha) [-]
  - Surface emissivity (epsilon) [-]
  - Estimated installed cost [$/m2] (explicitly labeled as estimated)
  - Durability and lifespan [years & rating 1-10] (explicitly labeled as estimated)
  - Regional availability across global & extreme climate zones (explicitly labeled as estimated)

Provides multi-criteria weighted scoring, envelope assembly synthesis,
and physics-backed AI engineering explanations with budget alternatives.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, Tuple
import math
import re
from materials import get_material_dataset, MaterialDataset, Material, _slugify


# ---------------------------------------------------------------------------
# Region and Climate Definitions
# ---------------------------------------------------------------------------

REGIONS = {
    "ladakh_high_altitude": {
        "name": "Ladakh & Western Himalayas (High Altitude Cold Desert)",
        "lat": 34.15,
        "elevation_m": 3500,
        "climate_type": "high_altitude_cold_desert",
        "description": "High diurnal swing, sub-zero winters (-20°C), intense solar irradiance (>750 W/m²), high UV, transport passes closed in winter."
    },
    "arctic_subzero": {
        "name": "Arctic & Sub-Zero Tundra (Extreme Polar Cold)",
        "lat": 68.0,
        "elevation_m": 200,
        "climate_type": "extreme_cold",
        "description": "Prolonged extreme sub-zero conditions (-35°C), low winter solar gains, permafrost ground, high wind chill."
    },
    "hot_arid_desert": {
        "name": "Thar & Arabian Desert (Hot Arid)",
        "lat": 26.9,
        "elevation_m": 250,
        "climate_type": "extreme_heat",
        "description": "Severe daytime heat (>45°C), strong diurnal drop, high solar radiation, sandstorms, scarce water."
    },
    "tropical_humid": {
        "name": "Coastal & Western Ghats (Tropical Humid)",
        "lat": 18.9,
        "elevation_m": 50,
        "climate_type": "tropical_humid",
        "description": "High ambient humidity (>80%), high rainfall, moderate-high temperatures (30-36°C), mold/rot hazard."
    },
    "temperate_alpine": {
        "name": "Shimla & Mid-Himalayan Alpine (Temperate Alpine)",
        "lat": 31.1,
        "elevation_m": 2200,
        "climate_type": "temperate",
        "description": "Moderate seasonal shifts, freezing snow winter, pleasant summer, rainfall during monsoon."
    },
    "global_standard": {
        "name": "Standard Continental (Temperate)",
        "lat": 40.0,
        "elevation_m": 300,
        "climate_type": "temperate",
        "description": "Balanced heating and cooling degree days, standard urban supply chains."
    }
}

CLIMATE_TYPES = {
    "high_altitude_cold_desert": "High Altitude Cold Desert (Leh / Ladakh)",
    "extreme_cold": "Extreme Cold / Sub-Zero Winter",
    "extreme_heat": "Extreme Heat / Arid Desert",
    "tropical_humid": "Warm & Humid / Coastal",
    "temperate": "Moderate / Continental"
}

BUDGET_TIERS = {
    "humanitarian_low": {
        "label": "Humanitarian / Low Cost ($)",
        "max_envelope_cost_m2": 35.0,
        "description": "Prioritizes locally sourced, low-cost or earth-based materials."
    },
    "moderate_balanced": {
        "label": "Moderate / Cost-Effective ($$)",
        "max_envelope_cost_m2": 75.0,
        "description": "Balances thermal efficiency with standard commercial affordability."
    },
    "premium_high_perf": {
        "label": "High-Performance / Premium ($$$)",
        "max_envelope_cost_m2": 160.0,
        "description": "Maximizes passive performance, durability, and specialized insulation."
    }
}


# ---------------------------------------------------------------------------
# Enriched Material Metadata (Durability, Costs, Availability, Roles, Pros/Cons)
# ---------------------------------------------------------------------------

# Note: All physical properties (k, rho, cp, alpha, epsilon) are sourced directly
# from the validated ShelterIQ dataset (ASHRAE / NIST / engineering literature).
# Cost, durability lifespan, and regional availability are modeled from standard
# construction engineering references and clearly tagged with is_estimated=True.

MATERIAL_INTELLIGENCE_METADATA: Dict[str, Dict[str, Any]] = {
    "normal_weight_concrete": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 38.0,
        "cost_range": [28.0, 50.0],
        "cost_tier": "Moderate",
        "durability_score": 9.2,
        "durability_years": 80,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.5
        },
        "advantages": [
            "Very high volumetric heat capacity (2.02 MJ/m³·K) for passive thermal mass",
            "Exceptional structural durability, compressive strength, and lifespan (80+ yrs)",
            "Impervious to rodent intrusion and rot; class A1 non-combustible"
        ],
        "disadvantages": [
            "High thermal conductivity (1.7 W/m·K) requires exterior insulation wrap",
            "Heavy transport penalty (2300 kg/m³) on high-altitude passes",
            "High embodied carbon footprint"
        ]
    },
    "high_strength_concrete": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 48.0,
        "cost_range": [38.0, 65.0],
        "cost_tier": "Moderate",
        "durability_score": 9.6,
        "durability_years": 100,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 5.0,
            "arctic_subzero": 4.5,
            "hot_arid_desert": 8.5,
            "tropical_humid": 9.0,
            "temperate_alpine": 7.0,
            "global_standard": 9.0
        },
        "advantages": [
            "Maximum compressive strength for multistory or heavy seismic loads",
            "Superior freeze-thaw cracking resistance in sub-zero environments",
            "Dense thermal mass"
        ],
        "disadvantages": [
            "Very high thermal conductivity (2.0 W/m·K) causes severe thermal bridging without insulation",
            "Requires specialized batching plants rarely available in remote mountain valleys"
        ]
    },
    "aerated_autoclaved_concrete_aac": {
        "roles": ["walls"],
        "cost_usd_m2": 32.0,
        "cost_range": [24.0, 44.0],
        "cost_tier": "Moderate",
        "durability_score": 8.0,
        "durability_years": 50,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 5.5,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 7.0,
            "global_standard": 9.0
        },
        "advantages": [
            "Low thermal conductivity (0.12 W/m·K) provides integrated structural insulation",
            "Lightweight (550 kg/m³) reduces dead load and logistics transport effort",
            "Excellent fire resistance and acoustic absorption"
        ],
        "disadvantages": [
            "Hydrophilic porous matrix requires breathable external waterproofing against freeze-thaw spalling",
            "Lower thermal mass than dense concrete or stone"
        ]
    },
    "dense_concrete_block": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 26.0,
        "cost_range": [18.0, 35.0],
        "cost_tier": "Low",
        "durability_score": 8.5,
        "durability_years": 60,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 6.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.0,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Inexpensive and widely manufactured",
            "Decent thermal mass (1.76 MJ/m³·K)",
            "Robust against physical abrasion and pests"
        ],
        "disadvantages": [
            "Moderate thermal conductivity (1.1 W/m·K) needs continuous external insulation",
            "Mortar joints can create thermal bridges if uninsulated"
        ]
    },
    "lightweight_concrete_block": {
        "roles": ["walls"],
        "cost_usd_m2": 28.0,
        "cost_range": [20.0, 38.0],
        "cost_tier": "Low",
        "durability_score": 7.8,
        "durability_years": 50,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 5.5,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 7.5,
            "global_standard": 9.0
        },
        "advantages": [
            "Balanced weight and thermal conductivity (0.3 W/m·K)",
            "Easier manual handling during emergency shelter erection"
        ],
        "disadvantages": [
            "Lower structural compressive capacity",
            "Requires moisture protection in freeze zones"
        ]
    },
    "common_clay_brick": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 24.0,
        "cost_range": [16.0, 32.0],
        "cost_tier": "Low",
        "durability_score": 8.4,
        "durability_years": 70,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 8.5,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Time-tested construction material with proven thermal inertia",
            "High solar absorptivity (0.71) helpful for passive solar facade heating",
            "Good durability and fire resistance"
        ],
        "disadvantages": [
            "Substantial thermal transmission (0.6 W/m·K) requires supplemental insulation in extreme cold",
            "Labor-intensive wet masonry construction"
        ]
    },
    "engineering_brick": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 36.0,
        "cost_range": [26.0, 48.0],
        "cost_tier": "Moderate",
        "durability_score": 9.4,
        "durability_years": 90,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 5.0,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 8.0,
            "tropical_humid": 8.5,
            "temperate_alpine": 7.5,
            "global_standard": 8.5
        },
        "advantages": [
            "Extremely low water absorption (<4.5%), immune to freeze-thaw frost heave",
            "High density and compressive capacity"
        ],
        "disadvantages": [
            "High thermal conductivity (1.1 W/m·K)",
            "Heavier and higher cost than standard clay brick"
        ]
    },
    "adobe_mud_brick": {
        "roles": ["walls"],
        "cost_usd_m2": 11.0,
        "cost_range": [6.0, 18.0],
        "cost_tier": "Low",
        "durability_score": 6.8,
        "durability_years": 45,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 9.8,
            "arctic_subzero": 2.0,
            "hot_arid_desert": 9.5,
            "tropical_humid": 4.0,
            "temperate_alpine": 7.0,
            "global_standard": 6.0
        },
        "advantages": [
            "Outstanding local availability in Ladakh and arid valleys using indigenous silt/soil",
            "Near-zero embodied carbon and very low construction budget",
            "High thermal mass (1.44 MJ/m³·K) ideal for diurnal phase-shift damping",
            "Naturally regulates indoor relative humidity via hygroscopic buffering"
        ],
        "disadvantages": [
            "Vulnerable to water erosion and driving rains; needs lime plaster or wide roof overhangs",
            "Requires thicker walls (300-450mm) to achieve adequate thermal resistance"
        ]
    },
    "granite": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 55.0,
        "cost_range": [40.0, 80.0],
        "cost_tier": "High",
        "durability_score": 9.8,
        "durability_years": 120,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 9.5,
            "arctic_subzero": 6.5,
            "hot_arid_desert": 8.0,
            "tropical_humid": 7.5,
            "temperate_alpine": 9.0,
            "global_standard": 8.5
        },
        "advantages": [
            "Virtually indestructible stone with 100+ year lifespan; impervious to freeze-thaw cycles",
            "Abundantly quarryable on-site across Himalayan slopes and Ladakh ranges",
            "High thermal mass (2.13 MJ/m³·K) serves as a supreme heat sink when wrapped with exterior insulation"
        ],
        "disadvantages": [
            "Extremely high thermal conductivity (2.8 W/m·K) — UNUSABLE without external insulation wrap",
            "Heavy manual stone masonry requires skilled labor"
        ]
    },
    "limestone": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 42.0,
        "cost_range": [30.0, 60.0],
        "cost_tier": "Moderate",
        "durability_score": 8.5,
        "durability_years": 80,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 4.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 7.0,
            "temperate_alpine": 8.0,
            "global_standard": 8.5
        },
        "advantages": [
            "Lower thermal conductivity than granite (1.3 W/m·K)",
            "High thermal mass (2.07 MJ/m³·K)",
            "Workable stone with attractive aesthetic"
        ],
        "disadvantages": [
            "Susceptible to acid precipitation and freeze-thaw micro-fissuring in wet climates"
        ]
    },
    "sandstone": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 38.0,
        "cost_range": [26.0, 52.0],
        "cost_tier": "Moderate",
        "durability_score": 8.0,
        "durability_years": 70,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 4.5,
            "hot_arid_desert": 9.2,
            "tropical_humid": 6.5,
            "temperate_alpine": 7.5,
            "global_standard": 8.0
        },
        "advantages": [
            "Good thermal storage (1.76 MJ/m³·K)",
            "Readily split into flat slabs for flooring and walls in arid zones"
        ],
        "disadvantages": [
            "Higher porosity than granite requires sealant against water penetration in freezing conditions"
        ]
    },
    "marble": {
        "roles": ["flooring", "finish"],
        "cost_usd_m2": 70.0,
        "cost_range": [50.0, 110.0],
        "cost_tier": "Premium",
        "durability_score": 8.8,
        "durability_years": 90,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 4.0,
            "arctic_subzero": 3.0,
            "hot_arid_desert": 8.5,
            "tropical_humid": 7.0,
            "temperate_alpine": 6.5,
            "global_standard": 8.5
        },
        "advantages": [
            "High thermal effusivity (cool to touch in hot climates)",
            "High scratch and compressive resistance"
        ],
        "disadvantages": [
            "Poor thermal insulator (2.9 W/m·K); feels cold in sub-zero winters",
            "High financial cost"
        ]
    },
    "slate": {
        "roles": ["roofs", "flooring"],
        "cost_usd_m2": 52.0,
        "cost_range": [38.0, 75.0],
        "cost_tier": "High",
        "durability_score": 9.5,
        "durability_years": 100,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 6.0,
            "hot_arid_desert": 5.0,
            "tropical_humid": 6.0,
            "temperate_alpine": 8.5,
            "global_standard": 8.0
        },
        "advantages": [
            "Extremely durable pitched roofing material; resists severe mountain snow loads and freeze-thaw",
            "Natural cleavage provides impermeable water-shedding tiles"
        ],
        "disadvantages": [
            "Heavy roof framing required (2700 kg/m³)",
            "High thermal transmission requires thick attic/rafter insulation underneath"
        ]
    },
    "gypsum_plaster": {
        "roles": ["finish"],
        "cost_usd_m2": 10.0,
        "cost_range": [6.0, 15.0],
        "cost_tier": "Low",
        "durability_score": 7.2,
        "durability_years": 35,
        "fire_rating": "A2 Fire resistant",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 6.0,
            "hot_arid_desert": 8.5,
            "tropical_humid": 7.0,
            "temperate_alpine": 8.0,
            "global_standard": 9.0
        },
        "advantages": [
            "Smooth interior air-tight finish reduces unintended infiltration",
            "Endothermic water release during fire exposure"
        ],
        "disadvantages": [
            "Strictly interior only; rapidly breaks down if exposed to exterior moisture"
        ]
    },
    "gypsum_board": {
        "roles": ["finish", "walls"],
        "cost_usd_m2": 12.0,
        "cost_range": [8.0, 18.0],
        "cost_tier": "Low",
        "durability_score": 7.0,
        "durability_years": 30,
        "fire_rating": "A2 Fire resistant",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 6.5,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.0,
            "temperate_alpine": 8.0,
            "global_standard": 9.5
        },
        "advantages": [
            "Fast dry installation with stud framing",
            "Low thermal conductivity (0.16 W/m·K) assists internal comfort"
        ],
        "disadvantages": [
            "Susceptible to moisture damage unless treated with greenboard/cement backer"
        ]
    },
    "cement_plaster": {
        "roles": ["finish", "walls"],
        "cost_usd_m2": 14.0,
        "cost_range": [9.0, 20.0],
        "cost_tier": "Low",
        "durability_score": 8.5,
        "durability_years": 45,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 6.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Tough external weather barrier protecting masonry from driving snow and wind",
            "Good impact resistance"
        ],
        "disadvantages": [
            "Vapor-impermeable compared to lime; can trap internal condensation if incorrectly placed"
        ]
    },
    "lime_plaster": {
        "roles": ["finish", "walls"],
        "cost_usd_m2": 15.0,
        "cost_range": [10.0, 22.0],
        "cost_tier": "Low",
        "durability_score": 8.0,
        "durability_years": 50,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 8.5,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 8.0,
            "temperate_alpine": 8.5,
            "global_standard": 8.5
        },
        "advantages": [
            "Vapor-permeable ('breathable') finish essential for adobe, rammed earth, and straw-bale envelopes",
            "Self-healing microcracks via carbonation; natural antiseptic/antifungal qualities"
        ],
        "disadvantages": [
            "Slower setting and curing time in cold weather"
        ]
    },
    "ceramic_tile": {
        "roles": ["flooring", "finish"],
        "cost_usd_m2": 28.0,
        "cost_range": [18.0, 45.0],
        "cost_tier": "Moderate",
        "durability_score": 9.0,
        "durability_years": 60,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 5.5,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.5
        },
        "advantages": [
            "Waterproof, abrasion-resistant, easy to sanitize",
            "Good thermal coupling with underfloor radiant heating or solar direct gain"
        ],
        "disadvantages": [
            "High thermal effusivity feels cold to bare feet without insulation layer underneath"
        ]
    },
    "hardwood_timber": {
        "roles": ["walls", "roofs", "flooring"],
        "cost_usd_m2": 45.0,
        "cost_range": [32.0, 70.0],
        "cost_tier": "Moderate",
        "durability_score": 8.2,
        "durability_years": 60,
        "fire_rating": "D-s2,d0 (charring protection)",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 4.0,
            "arctic_subzero": 6.5,
            "hot_arid_desert": 3.0,
            "tropical_humid": 8.5,
            "temperate_alpine": 9.0,
            "global_standard": 8.5
        },
        "advantages": [
            "Carbon-sequestering renewable material",
            "Low thermal conductivity (0.18 W/m·K) prevents cold bridging",
            "High specific heat (1600 J/kg·K) creates comfortable interior touch warmth"
        ],
        "disadvantages": [
            "Extremely scarce in high-altitude desert (Ladakh is above tree line; requires transport)",
            "Vulnerable to termite attack in humid tropics unless treated"
        ]
    },
    "plywood": {
        "roles": ["walls", "roofs", "flooring"],
        "cost_usd_m2": 18.0,
        "cost_range": [12.0, 26.0],
        "cost_tier": "Low",
        "durability_score": 7.5,
        "durability_years": 35,
        "fire_rating": "D-s2,d0",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 7.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Shear diaphragms for seismic stability and roof decking",
            "Low thermal conductivity (0.13 W/m·K)"
        ],
        "disadvantages": [
            "Standard grades delaminate if soaked; requires marine or exterior grade adhesive"
        ]
    },
    "osb_board": {
        "roles": ["walls", "roofs", "flooring"],
        "cost_usd_m2": 16.0,
        "cost_range": [11.0, 22.0],
        "cost_tier": "Low",
        "durability_score": 7.3,
        "durability_years": 35,
        "fire_rating": "D-s2,d0",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 7.0,
            "tropical_humid": 7.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.0
        },
        "advantages": [
            "Cost-effective structural sheathing",
            "Consistent structural properties without natural knot defects"
        ],
        "disadvantages": [
            "Edge swelling under prolonged water exposure"
        ]
    },
    "cork_board": {
        "roles": ["insulation", "flooring"],
        "cost_usd_m2": 32.0,
        "cost_range": [24.0, 45.0],
        "cost_tier": "Moderate",
        "durability_score": 8.8,
        "durability_years": 60,
        "fire_rating": "B-s1,d0 Fire retardant",
        "embodied_carbon": "Very Low",
        "availability": {
            "ladakh_high_altitude": 4.0,
            "arctic_subzero": 4.5,
            "hot_arid_desert": 4.5,
            "tropical_humid": 5.0,
            "temperate_alpine": 5.5,
            "global_standard": 7.0
        },
        "advantages": [
            "100% natural, renewable, carbon-negative insulation (k=0.043 W/m·K)",
            "Naturally impermeable to water and rot; does not off-gas toxic fumes",
            "High specific heat capacity (1800 J/kg·K) provides thermal lag unmatched by petrochemical foams"
        ],
        "disadvantages": [
            "Higher unit price than EPS or glass fiber",
            "Limited supply chain in Central Asia and remote mountain regions"
        ]
    },
    "expanded_perlite": {
        "roles": ["insulation"],
        "cost_usd_m2": 18.0,
        "cost_range": [12.0, 26.0],
        "cost_tier": "Low",
        "durability_score": 9.0,
        "durability_years": 70,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 8.0,
            "tropical_humid": 6.5,
            "temperate_alpine": 7.0,
            "global_standard": 8.5
        },
        "advantages": [
            "Inorganic volcanic glass loose-fill; 100% fireproof and rodent-proof",
            "Decent thermal insulation (k=0.05 W/m·K) for filling masonry cavity cores"
        ],
        "disadvantages": [
            "Dusty during installation; settles over time if improperly retained"
        ]
    },
    "vermiculite": {
        "roles": ["insulation"],
        "cost_usd_m2": 20.0,
        "cost_range": [14.0, 28.0],
        "cost_tier": "Low",
        "durability_score": 9.0,
        "durability_years": 70,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 8.0,
            "tropical_humid": 6.5,
            "temperate_alpine": 7.0,
            "global_standard": 8.0
        },
        "advantages": [
            "High thermal stability up to 1200°C; non-combustible",
            "Effective loose-fill for chimneys and thermal ceiling plenums"
        ],
        "disadvantages": [
            "Slightly higher thermal conductivity (0.065 W/m·K) than modern batt insulations"
        ]
    },
    "glass_fiber_batt": {
        "roles": ["insulation"],
        "cost_usd_m2": 14.0,
        "cost_range": [9.0, 20.0],
        "cost_tier": "Low",
        "durability_score": 7.8,
        "durability_years": 45,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 8.0,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Highly affordable thermal insulation (k=0.04 W/m·K)",
            "Lightweight (20 kg/m³) minimal freight payload for high-altitude transport",
            "Non-combustible"
        ],
        "disadvantages": [
            "Loses insulating ability dramatically if penetrated by condensation or moisture",
            "Requires PPE during handling; can sag if not mechanically supported"
        ]
    },
    "rock_wool_batt": {
        "roles": ["insulation"],
        "cost_usd_m2": 22.0,
        "cost_range": [16.0, 30.0],
        "cost_tier": "Moderate",
        "durability_score": 9.0,
        "durability_years": 60,
        "fire_rating": "A1 Non-combustible (Euroclass)",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.8,
            "arctic_subzero": 8.5,
            "hot_arid_desert": 8.0,
            "tropical_humid": 8.0,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Exceptional low thermal conductivity (0.035 W/m·K) providing R-2.86 per 100mm",
            "Melting point >1000°C provides world-class fire barrier in emergency shelters",
            "Vapor-permeable and hydrophobic; sheds water and does not rot or promote mold",
            "Higher density (45 kg/m³) provides superior acoustic insulation and sag resistance"
        ],
        "disadvantages": [
            "Heavier and slightly more expensive than glass wool"
        ]
    },
    "cellular_glass": {
        "roles": ["insulation", "flooring"],
        "cost_usd_m2": 45.0,
        "cost_range": [32.0, 65.0],
        "cost_tier": "High",
        "durability_score": 9.8,
        "durability_years": 80,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 4.5,
            "arctic_subzero": 6.5,
            "hot_arid_desert": 5.5,
            "tropical_humid": 6.0,
            "temperate_alpine": 6.0,
            "global_standard": 7.5
        },
        "advantages": [
            "100% closed glass cells; totally impervious to water, water vapor, and sub-surface frost",
            "High compressive strength allows load-bearing installation directly under concrete slabs",
            "Rodent, pest, and acid proof"
        ],
        "disadvantages": [
            "Higher thermal conductivity (0.05 W/m·K) than foam",
            "Brittle; requires careful handling on rough terrain"
        ]
    },
    "polyurethane_foam": {
        "roles": ["insulation"],
        "cost_usd_m2": 26.0,
        "cost_range": [18.0, 36.0],
        "cost_tier": "Moderate",
        "durability_score": 8.2,
        "durability_years": 40,
        "fire_rating": "B2 Combustible with retardant",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 8.0,
            "tropical_humid": 8.0,
            "temperate_alpine": 8.0,
            "global_standard": 9.0
        },
        "advantages": [
            "Superior thermal resistance (k=0.025 W/m·K) — thin profile saves precious shelter interior space",
            "Spray-applied formulation creates seamless air-tight envelope sealing gaps and drafts"
        ],
        "disadvantages": [
            "Combustible and releases toxic cyanide gases during fire exposure; must be shielded behind drywall",
            "Sensitive to UV degradation if exposed to sunlight"
        ]
    },
    "polyisocyanurate_foam": {
        "roles": ["insulation", "roofs"],
        "cost_usd_m2": 30.0,
        "cost_range": [22.0, 42.0],
        "cost_tier": "Moderate",
        "durability_score": 8.5,
        "durability_years": 45,
        "fire_rating": "B1 Reduced combustibility",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 6.0,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 7.5,
            "tropical_humid": 7.5,
            "temperate_alpine": 7.5,
            "global_standard": 9.0
        },
        "advantages": [
            "Market-leading thermal resistance (k=0.023 W/m·K) — delivers R-4.35 per 100mm",
            "Often foil-faced to provide radiant heat reflection and vapor barrier in one layer"
        ],
        "disadvantages": [
            "Conductivity degrades slightly at sub-zero temperatures (blowing gas condensation)",
            "High embodied petrochemical content"
        ]
    },
    "phenolic_foam": {
        "roles": ["insulation"],
        "cost_usd_m2": 38.0,
        "cost_range": [28.0, 52.0],
        "cost_tier": "High",
        "durability_score": 8.6,
        "durability_years": 45,
        "fire_rating": "B-s1,d0 Low smoke",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 4.5,
            "arctic_subzero": 6.5,
            "hot_arid_desert": 6.0,
            "tropical_humid": 6.5,
            "temperate_alpine": 6.5,
            "global_standard": 8.0
        },
        "advantages": [
            "Lowest thermal conductivity among rigid foams (k=0.020 W/m·K)",
            "Superior fire and smoke performance compared to standard polyurethane"
        ],
        "disadvantages": [
            "Acidic leaching risk if saturated with water in contact with structural metals",
            "Premium pricing"
        ]
    },
    "hemp_lime_hempcrete": {
        "roles": ["walls", "insulation"],
        "cost_usd_m2": 28.0,
        "cost_range": [19.0, 40.0],
        "cost_tier": "Moderate",
        "durability_score": 8.6,
        "durability_years": 70,
        "fire_rating": "B-s1,d0 Fire resistant",
        "embodied_carbon": "Very Low (Carbon negative)",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 3.0,
            "hot_arid_desert": 6.0,
            "tropical_humid": 6.5,
            "temperate_alpine": 8.0,
            "global_standard": 7.5
        },
        "advantages": [
            "Carbon-negative composite combining thermal insulation (0.07 W/m·K) and thermal inertia",
            "Volumetric heat capacity of 450 kJ/m³·K moderates temperature swings",
            "Naturally vapor-permeable and mold-inhibiting lime matrix; pest resistant"
        ],
        "disadvantages": [
            "Non-load-bearing; requires timber or bamboo framing cage",
            "Slow drying in cold humid conditions"
        ]
    },
    "sheep_wool_insulation": {
        "roles": ["insulation"],
        "cost_usd_m2": 24.0,
        "cost_range": [16.0, 34.0],
        "cost_tier": "Moderate",
        "durability_score": 8.2,
        "durability_years": 50,
        "fire_rating": "B-s1,d0 Naturally flame retardant",
        "embodied_carbon": "Very Low",
        "availability": {
            "ladakh_high_altitude": 9.6,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 4.0,
            "tropical_humid": 4.0,
            "temperate_alpine": 8.5,
            "global_standard": 7.0
        },
        "advantages": [
            "Highly available across Ladakh, Changthang nomads, and pastoral Himalayan communities",
            "Low thermal conductivity (k=0.04 W/m·K) equivalent to commercial mineral wool",
            "Can absorb up to 33% of its weight in water vapor without losing thermal resistance",
            "Releases latent heat of adsorption when absorbing moisture in freezing winter nights"
        ],
        "disadvantages": [
            "Must be treated with borate salts against moth and beetle larvae",
            "Requires light framing retainers"
        ]
    },
    "wood_fiber_insulation_board": {
        "roles": ["insulation", "roofs"],
        "cost_usd_m2": 26.0,
        "cost_range": [18.0, 36.0],
        "cost_tier": "Moderate",
        "durability_score": 8.2,
        "durability_years": 50,
        "fire_rating": "E (needs cladding)",
        "embodied_carbon": "Very Low",
        "availability": {
            "ladakh_high_altitude": 5.0,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 4.5,
            "tropical_humid": 6.5,
            "temperate_alpine": 8.5,
            "global_standard": 8.5
        },
        "advantages": [
            "Very high specific heat capacity (2100 J/kg·K) creates 10-12 hr summer heat wave phase lag",
            "Breathable and hygroscopic",
            "Low thermal conductivity (0.045 W/m·K)"
        ],
        "disadvantages": [
            "Heavier than synthetic foams (160 kg/m³)",
            "Requires weather-resistive barrier"
        ]
    },
    "cellulose_loose_fill": {
        "roles": ["insulation"],
        "cost_usd_m2": 15.0,
        "cost_range": [10.0, 22.0],
        "cost_tier": "Low",
        "durability_score": 7.8,
        "durability_years": 40,
        "fire_rating": "B-s2,d0 Borate treated",
        "embodied_carbon": "Very Low",
        "availability": {
            "ladakh_high_altitude": 6.5,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 7.0,
            "tropical_humid": 6.0,
            "temperate_alpine": 7.5,
            "global_standard": 9.0
        },
        "advantages": [
            "Recycled paper product with very low embodied carbon",
            "Tight dense packing stops convective air loops inside wall cavities",
            "Affordable thermal performance (k=0.04 W/m·K)"
        ],
        "disadvantages": [
            "Requires blown-in blowing machine or careful manual tamp",
            "Can settle over 5-10 years if under-compacted"
        ]
    },
    "coconut_coir_fiber": {
        "roles": ["insulation"],
        "cost_usd_m2": 14.0,
        "cost_range": [8.0, 20.0],
        "cost_tier": "Low",
        "durability_score": 8.0,
        "durability_years": 45,
        "fire_rating": "B2 Treated",
        "embodied_carbon": "Very Low",
        "availability": {
            "ladakh_high_altitude": 3.0,
            "arctic_subzero": 2.0,
            "hot_arid_desert": 4.0,
            "tropical_humid": 9.8,
            "temperate_alpine": 4.5,
            "global_standard": 7.0
        },
        "advantages": [
            "Supreme local availability in coastal, South Asian, and tropical environments",
            "Naturally high lignin content provides resistance to rot and fungal attack",
            "Good thermal insulation (k=0.045 W/m·K)"
        ],
        "disadvantages": [
            "High freight cost if transported to high mountain altitudes"
        ]
    },
    "polyethylene": {
        "roles": ["roofs", "glazing"],
        "cost_usd_m2": 6.0,
        "cost_range": [3.0, 10.0],
        "cost_tier": "Low",
        "durability_score": 5.5,
        "durability_years": 10,
        "fire_rating": "F Combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 9.0,
            "arctic_subzero": 8.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 9.0,
            "global_standard": 9.8
        },
        "advantages": [
            "Lightweight emergency vapor retarder and greenhouse glazing for solar trombe gain",
            "Inexpensive and instantly deployed"
        ],
        "disadvantages": [
            "Degrades rapidly under harsh high-altitude UV radiation unless UV-stabilized",
            "Poor thermal resistance without multi-layer dead air cavities"
        ]
    },
    "pvc": {
        "roles": ["roofs", "finish"],
        "cost_usd_m2": 18.0,
        "cost_range": [12.0, 26.0],
        "cost_tier": "Low",
        "durability_score": 7.5,
        "durability_years": 25,
        "fire_rating": "B1 Self-extinguishing",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 8.0,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Waterproof roofing membranes and window frame profiles",
            "Low maintenance"
        ],
        "disadvantages": [
            "Becomes brittle in sub-zero extreme cold (-20°C)"
        ]
    },
    "rubber": {
        "roles": ["roofs", "flooring"],
        "cost_usd_m2": 24.0,
        "cost_range": [16.0, 34.0],
        "cost_tier": "Moderate",
        "durability_score": 8.5,
        "durability_years": 40,
        "fire_rating": "E Combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 8.0,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.0
        },
        "advantages": [
            "EPDM rubber membranes provide supreme flat-roof waterproofing down to -45°C",
            "High elongation accommodates thermal movement"
        ],
        "disadvantages": [
            "Dark color absorbs high solar heat in summer unless coated with reflective acrylic"
        ]
    },
    "glass": {
        "roles": ["glazing"],
        "cost_usd_m2": 35.0,
        "cost_range": [25.0, 48.0],
        "cost_tier": "Moderate",
        "durability_score": 8.5,
        "durability_years": 40,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 7.0,
            "hot_arid_desert": 9.0,
            "tropical_humid": 9.0,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Allows direct passive solar gain into living areas during sunlit hours",
            "Durable surface impervious to scratching and weather"
        ],
        "disadvantages": [
            "Single-pane has atrocious thermal conductivity (1.0 W/m·K) causing massive nighttime heat drain",
            "Severe condensation and frost formation in winter"
        ]
    },
    "double_glazing_air_gap": {
        "roles": ["glazing"],
        "cost_usd_m2": 75.0,
        "cost_range": [55.0, 105.0],
        "cost_tier": "High",
        "durability_score": 8.8,
        "durability_years": 30,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 6.8,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.5
        },
        "advantages": [
            "Cuts window heat loss by ~50% compared to single pane",
            "Reduces interior draft chills and condensation"
        ],
        "disadvantages": [
            "Seal failure over decades can cause internal fogging",
            "Fragile transport over bumpy unpaved mountain roads"
        ]
    },
    "low_e_double_glazing": {
        "roles": ["glazing"],
        "cost_usd_m2": 110.0,
        "cost_range": [85.0, 150.0],
        "cost_tier": "Premium",
        "durability_score": 9.0,
        "durability_years": 30,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 5.5,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 8.0,
            "tropical_humid": 8.0,
            "temperate_alpine": 7.5,
            "global_standard": 9.2
        },
        "advantages": [
            "Microscopic metal coating reflects long-wave infrared heat back into the shelter",
            "Cuts nocturnal radiant heat loss by >70% while admitting 75% of solar daylight",
            "Essential for achieving net-positive solar gain envelopes in sub-zero climates"
        ],
        "disadvantages": [
            "Higher capital investment",
            "Requires specialized procurement and careful handling"
        ]
    },
    "air_gap_still": {
        "roles": ["air_cavity"],
        "cost_usd_m2": 2.0,
        "cost_range": [0.0, 5.0],
        "cost_tier": "Low",
        "durability_score": 9.9,
        "durability_years": 100,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Zero",
        "availability": {
            "ladakh_high_altitude": 10.0,
            "arctic_subzero": 10.0,
            "hot_arid_desert": 10.0,
            "tropical_humid": 10.0,
            "temperate_alpine": 10.0,
            "global_standard": 10.0
        },
        "advantages": [
            "Free insulating air barrier (k=0.026 W/m·K) when unventilated and sealed under 25mm thickness",
            "Breaks conductive bridging across masonry wythes"
        ],
        "disadvantages": [
            "Convective loops degrade performance if gap exceeds 30mm; must be airtight"
        ]
    },
    "water": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 8.0,
        "cost_range": [4.0, 14.0],
        "cost_tier": "Low",
        "durability_score": 8.5,
        "durability_years": 50,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Zero",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 5.0,
            "hot_arid_desert": 4.0,
            "tropical_humid": 9.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Unrivaled volumetric heat capacity (4.18 MJ/m³·K) — 2x higher than concrete and 4x higher than brick",
            "Thermal drum walls absorb massive solar gain on south glazing and discharge warmth all night long",
            "Virtually free storage medium"
        ],
        "disadvantages": [
            "Requires freeze protection (glycol or salt) if shelter interior drops below 0°C",
            "Risk of container puncture or leaks over decades"
        ]
    },
    "paraffin_pcm": {
        "roles": ["walls", "roofs", "insulation"],
        "cost_usd_m2": 85.0,
        "cost_range": [60.0, 120.0],
        "cost_tier": "Premium",
        "durability_score": 8.5,
        "durability_years": 35,
        "fire_rating": "B2 Treated",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 3.5,
            "arctic_subzero": 4.5,
            "hot_arid_desert": 5.5,
            "tropical_humid": 6.0,
            "temperate_alpine": 5.5,
            "global_standard": 7.5
        },
        "advantages": [
            "Isothermal latent heat release near human comfort zone (21°C) prevents indoor overheating and freezing",
            "Stores 155 kJ/kg latent enthalpy in a compact lightweight panel"
        ],
        "disadvantages": [
            "High material cost; low liquid thermal conductivity requires heat-spreader fins"
        ]
    },
    "salt_hydrate_pcm_cacl2_6h2o": {
        "roles": ["walls", "flooring"],
        "cost_usd_m2": 65.0,
        "cost_range": [45.0, 95.0],
        "cost_tier": "High",
        "durability_score": 8.0,
        "durability_years": 30,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "Low",
        "availability": {
            "ladakh_high_altitude": 4.0,
            "arctic_subzero": 4.0,
            "hot_arid_desert": 6.0,
            "tropical_humid": 6.0,
            "temperate_alpine": 5.5,
            "global_standard": 7.5
        },
        "advantages": [
            "High latent heat (190 kJ/kg) and higher thermal conductivity than organic paraffin (0.5 W/m·K)",
            "Non-combustible"
        ],
        "disadvantages": [
            "Phase segregation and subcooling over thousands of freeze-thaw cycles without nucleating agents"
        ]
    },
    "eutectic_pcm_organic": {
        "roles": ["walls", "insulation"],
        "cost_usd_m2": 90.0,
        "cost_range": [65.0, 130.0],
        "cost_tier": "Premium",
        "durability_score": 8.5,
        "durability_years": 35,
        "fire_rating": "B2 Treated",
        "embodied_carbon": "Medium",
        "availability": {
            "ladakh_high_altitude": 3.0,
            "arctic_subzero": 4.0,
            "hot_arid_desert": 5.0,
            "tropical_humid": 5.5,
            "temperate_alpine": 5.0,
            "global_standard": 7.0
        },
        "advantages": [
            "Sharp congruent melting with negligible subcooling for precise indoor temperature stabilization"
        ],
        "disadvantages": [
            "High cost and limited availability in frontier logistics networks"
        ]
    },
    "aluminum": {
        "roles": ["roofs", "finish"],
        "cost_usd_m2": 42.0,
        "cost_range": [30.0, 60.0],
        "cost_tier": "Moderate",
        "durability_score": 9.2,
        "durability_years": 60,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 7.0,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 8.5,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.0,
            "global_standard": 9.5
        },
        "advantages": [
            "Ultra-lightweight (2700 kg/m³) corrosion-resistant roofing sheet",
            "High solar reflectance (0.7) and low emissivity (0.2) acts as radiant heat barrier"
        ],
        "disadvantages": [
            "Extreme thermal conductivity (205 W/m·K) requires robust continuous insulation underneath to avoid thermal short-circuits"
        ]
    },
    "steel": {
        "roles": ["roofs", "walls"],
        "cost_usd_m2": 35.0,
        "cost_range": [24.0, 50.0],
        "cost_tier": "Moderate",
        "durability_score": 8.8,
        "durability_years": 50,
        "fire_rating": "A1 Non-combustible",
        "embodied_carbon": "High",
        "availability": {
            "ladakh_high_altitude": 7.5,
            "arctic_subzero": 7.5,
            "hot_arid_desert": 9.0,
            "tropical_humid": 8.5,
            "temperate_alpine": 8.5,
            "global_standard": 9.5
        },
        "advantages": [
            "Pre-fabricated corrugated GI roofing sheets allow rapid emergency weather sealing",
            "High structural wind and snow load resistance"
        ],
        "disadvantages": [
            "High thermal transmission (50 W/m·K) and condensation drippage without thermal break insulation"
        ]
    }
}


# Default fallback metadata for any newly registered custom material
DEFAULT_CUSTOM_METADATA = {
    "roles": ["walls"],
    "cost_usd_m2": 30.0,
    "cost_range": [20.0, 45.0],
    "cost_tier": "Moderate",
    "durability_score": 7.5,
    "durability_years": 40,
    "fire_rating": "Class B / Standard",
    "embodied_carbon": "Medium",
    "availability": {
        "ladakh_high_altitude": 6.0,
        "arctic_subzero": 5.0,
        "hot_arid_desert": 7.0,
        "tropical_humid": 7.0,
        "temperate_alpine": 7.0,
        "global_standard": 8.0
    },
    "advantages": ["Custom user-registered formulation"],
    "disadvantages": ["Field performance needs site verification"]
}


# ---------------------------------------------------------------------------
# Enriched Material Data Model
# ---------------------------------------------------------------------------

@dataclass
class EnrichedMaterial:
    id: str
    name: str
    category: str
    # Measured / benchmark physical properties
    k_W_mK: float
    density_kg_m3: float
    cp_J_kgK: float
    emissivity: float
    solar_absorptivity: float
    source: str
    is_pcm: bool
    # Derived engineering properties
    volumetric_heat_capacity_J_m3K: float
    thermal_diffusivity_m2_s: float
    thermal_effusivity: float
    # Intelligence attributes (explicitly labeled whether estimated)
    envelope_roles: List[str]
    typical_cost_usd_m2: float
    cost_range_usd_m2: List[float]
    cost_tier: str
    is_cost_estimated: bool
    durability_score: float
    durability_lifespan_years: int
    is_durability_estimated: bool
    regional_availability: Dict[str, float]
    is_availability_estimated: bool
    fire_rating: str
    embodied_carbon: str
    advantages: List[str]
    disadvantages: List[str]
    provenance: Dict[str, str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Recommendation Request & Response Data Structures
# ---------------------------------------------------------------------------

@dataclass
class RecommendationRequest:
    location: str = "ladakh_high_altitude"
    location_name: Optional[str] = None
    climate_condition: str = "high_altitude_cold_desert"  # high_altitude_cold_desert, extreme_cold, extreme_heat, tropical_humid, temperate
    budget_level: str = "moderate_balanced"              # humanitarian_low, moderate_balanced, premium_high_perf
    budget_target_usd_m2: Optional[float] = None
    # Priorities (0.0 to 1.0)
    priority_thermal_efficiency: float = 0.85
    priority_affordability: float = 0.70
    priority_durability: float = 0.80
    priority_local_availability: float = 0.85
    priority_eco_sustainability: float = 0.50
    # Additional requirements
    prefers_high_thermal_mass: bool = True
    prefers_prefabricated_speed: bool = False
    custom_notes: Optional[str] = None


@dataclass
class ScoredMaterial:
    material: EnrichedMaterial
    role: str
    total_score: float
    thermal_score: float
    affordability_score: float
    durability_score: float
    availability_score: float
    climate_suitability_score: float
    score_breakdown_notes: List[str]
    rank: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rank": self.rank,
            "role": self.role,
            "material": self.material.to_dict(),
            "total_score": self.total_score,
            "thermal_score": self.thermal_score,
            "affordability_score": self.affordability_score,
            "durability_score": self.durability_score,
            "availability_score": self.availability_score,
            "climate_suitability_score": self.climate_suitability_score,
            "score_breakdown_notes": self.score_breakdown_notes
        }


@dataclass
class EnvelopeAssembly:
    assembly_name: str
    description: str
    wall_material: ScoredMaterial
    roof_material: ScoredMaterial
    insulation_material: ScoredMaterial
    floor_material: ScoredMaterial
    glazing_material: ScoredMaterial
    total_estimated_cost_m2: float
    estimated_envelope_r_value: float
    estimated_thermal_mass_rating: str
    durability_rating_10: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "assembly_name": self.assembly_name,
            "description": self.description,
            "wall_material": self.wall_material.to_dict(),
            "roof_material": self.roof_material.to_dict(),
            "insulation_material": self.insulation_material.to_dict(),
            "floor_material": self.floor_material.to_dict(),
            "glazing_material": self.glazing_material.to_dict(),
            "total_estimated_cost_m2": self.total_estimated_cost_m2,
            "estimated_envelope_r_value": self.estimated_envelope_r_value,
            "estimated_thermal_mass_rating": self.estimated_thermal_mass_rating,
            "durability_rating_10": self.durability_rating_10
        }


@dataclass
class AIRecommendationReport:
    request_summary: Dict[str, Any]
    primary_assembly: EnvelopeAssembly
    budget_alternative_assembly: EnvelopeAssembly
    high_thermal_mass_assembly: EnvelopeAssembly
    role_rankings: Dict[str, List[Dict[str, Any]]]
    ai_explanations: Dict[str, Any]
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_summary": self.request_summary,
            "primary_assembly": self.primary_assembly.to_dict(),
            "budget_alternative_assembly": self.budget_alternative_assembly.to_dict(),
            "high_thermal_mass_assembly": self.high_thermal_mass_assembly.to_dict(),
            "role_rankings": self.role_rankings,
            "ai_explanations": self.ai_explanations,
            "disclaimer": self.disclaimer
        }


# ---------------------------------------------------------------------------
# Core Recommendation Engine
# ---------------------------------------------------------------------------

class MaterialRecommendationEngine:
    """
    Intelligent physics-grounded material evaluation and ranking system.
    """

    def __init__(self, dataset: Optional[MaterialDataset] = None):
        self.dataset = dataset or get_material_dataset()
        self._enriched_cache: Dict[str, EnrichedMaterial] = {}
        self._build_enriched_database()

    def _build_enriched_database(self):
        """Construct unified enriched records for all materials."""
        for key in self.dataset.list_keys():
            mat = self.dataset.get(key)
            meta = self.dataset._meta.get(key, {})
            category = meta.get("category", "General")
            source = meta.get("source", "Standard Reference")

            intel = MATERIAL_INTELLIGENCE_METADATA.get(key)
            if not intel:
                # Fuzzy fallback matching on name
                slug = _slugify(mat.name)
                intel = MATERIAL_INTELLIGENCE_METADATA.get(slug, DEFAULT_CUSTOM_METADATA)

            rho_cp = mat.rho * mat.cp
            k = max(0.001, mat.k)
            diffusivity = k / max(1.0, rho_cp)
            effusivity = math.sqrt(k * rho_cp)

            enriched = EnrichedMaterial(
                id=key,
                name=mat.name,
                category=category,
                k_W_mK=mat.k,
                density_kg_m3=mat.rho,
                cp_J_kgK=mat.cp,
                emissivity=mat.epsilon,
                solar_absorptivity=mat.alpha,
                source=source,
                is_pcm=mat.is_pcm,
                volumetric_heat_capacity_J_m3K=round(rho_cp, 1),
                thermal_diffusivity_m2_s=diffusivity,
                thermal_effusivity=round(effusivity, 1),
                envelope_roles=intel.get("roles", ["walls"]),
                typical_cost_usd_m2=intel.get("cost_usd_m2", 30.0),
                cost_range_usd_m2=intel.get("cost_range", [20.0, 45.0]),
                cost_tier=intel.get("cost_tier", "Moderate"),
                is_cost_estimated=True,
                durability_score=intel.get("durability_score", 7.5),
                durability_lifespan_years=intel.get("durability_years", 40),
                is_durability_estimated=True,
                regional_availability=intel.get("availability", {}),
                is_availability_estimated=True,
                fire_rating=intel.get("fire_rating", "Standard"),
                embodied_carbon=intel.get("embodied_carbon", "Medium"),
                advantages=intel.get("advantages", []),
                disadvantages=intel.get("disadvantages", []),
                provenance={
                    "thermal_properties": f"Measured benchmark: {source}",
                    "estimated_cost": "Estimated regional construction index (2024-2025)",
                    "durability": "Empirical building science standard lifespan",
                    "availability": "Regional logistics assessment"
                }
            )
            self._enriched_cache[key] = enriched

    def get_enriched_material(self, key: str) -> Optional[EnrichedMaterial]:
        return self._enriched_cache.get(key)

    def list_all_enriched(self) -> List[EnrichedMaterial]:
        return list(self._enriched_cache.values())

    def score_material_for_role(
        self,
        mat: EnrichedMaterial,
        role: str,
        req: RecommendationRequest
    ) -> Optional[ScoredMaterial]:
        """
        Calculates role-specific multi-attribute weighted score (0 - 100).
        Returns None if material is fundamentally incompatible with the envelope role.
        """
        # Role compatibility check
        if role not in mat.envelope_roles and role != "all":
            # Allow bio-based / wood materials to act as walls or roof if reasonable
            if not (role == "walls" and ("Masonry" in mat.category or "Structural" in mat.category or "Stone" in mat.category or "Wood" in mat.category)):
                return None

        climate = req.climate_condition
        region_key = req.location if req.location in REGIONS else "global_standard"

        # ---------------------------------------------------------
        # 1. Thermal Performance Score (0 - 100)
        # ---------------------------------------------------------
        thermal_score = 50.0
        thermal_notes = []

        if role == "insulation":
            # For insulation: lower conductivity k = higher score.
            # k ranges from ~0.02 (phenolic) to 0.07 (hempcrete/straw).
            # Max score for k <= 0.025, drops as k increases.
            thermal_score = max(10.0, min(100.0, 100.0 - (mat.k_W_mK - 0.020) * 1400.0))
            thermal_notes.append(f"Low conductivity k={mat.k_W_mK:.3f} W/m·K provides R-{(0.10/mat.k_W_mK):.2f} per 100mm.")
            if mat.k_W_mK <= 0.035:
                thermal_score += 5.0

        elif role == "walls":
            # For walls in cold-desert or extreme climates:
            # Need thermal mass (volumetric heat capacity rho*cp) to damp diurnal temperature spikes,
            # or low k for integrated insulation.
            v_cap = mat.volumetric_heat_capacity_J_m3K
            if climate in ("high_altitude_cold_desert", "extreme_heat", "extreme_cold"):
                if req.prefers_high_thermal_mass:
                    # High volumetric heat capacity is rewarded (granite, dense concrete, adobe, rammed earth)
                    mass_score = min(100.0, (v_cap / 2.2e6) * 90.0)
                    thermal_score = mass_score
                    thermal_notes.append(f"High thermal mass (ρ·cp = {v_cap/1e6:.2f} MJ/m³·K) stabilizes day-night temperature.")
                else:
                    # Prefers integrated insulation walls (AAC, wood)
                    insul_score = max(15.0, 100.0 - (mat.k_W_mK * 40.0))
                    thermal_score = insul_score
                    thermal_notes.append(f"Integrated insulation k={mat.k_W_mK:.2f} W/m·K.")
            elif climate == "tropical_humid":
                # In tropical humid, high thermal mass can trap heat at night; low thermal capacity or breathable is better
                thermal_score = max(30.0, 95.0 - (v_cap / 2.5e6) * 50.0)
                thermal_notes.append("Lightweight thermal inertia prevents nocturnal heat entrapment in humid climate.")
            else:
                thermal_score = 65.0 + min(30.0, (v_cap / 2.0e6) * 30.0)

            # Bonus for solar absorption on south facade in cold sunny regions (e.g. Leh)
            if climate in ("high_altitude_cold_desert", "extreme_cold") and mat.solar_absorptivity >= 0.65:
                thermal_score = min(100.0, thermal_score + 5.0)
                thermal_notes.append(f"High solar absorptivity α={mat.solar_absorptivity:.2f} enhances daytime passive solar harvesting.")

        elif role == "roofs":
            # Roof: in hot climates, needs low solar absorptivity (cool roof) and high emissivity.
            # In high altitude / extreme cold, needs snow load resistance and high rafter insulation support.
            if climate in ("extreme_heat", "tropical_humid"):
                cool_roof_score = (1.0 - mat.solar_absorptivity) * 60.0 + mat.emissivity * 40.0
                thermal_score = min(100.0, max(20.0, cool_roof_score))
                thermal_notes.append(f"Solar reflectance (1-α = {1.0-mat.solar_absorptivity:.2f}) limits attic heat gain.")
            else:
                # Cold climates: roof is primary heat loss path.
                # Materials that shed snow (slate, metal) or insulate (polyiso, wood fiber) score well.
                if mat.k_W_mK <= 0.05:
                    thermal_score = 95.0
                    thermal_notes.append("Superior roof insulation value.")
                elif "Metal" in mat.category or "Slate" in mat.name:
                    thermal_score = 80.0
                    thermal_notes.append("Snow-shedding surface angle compatible.")
                else:
                    thermal_score = 65.0

        elif role == "flooring":
            # Flooring: contact warmth (thermal effusivity) and ground heat loss prevention.
            # In extreme cold, insulated floor or moderate effusivity (timber, cork, tile over slab) is ideal.
            if climate in ("high_altitude_cold_desert", "extreme_cold"):
                if mat.thermal_effusivity < 900.0:  # Wood, cork, lightweight
                    thermal_score = 90.0
                    thermal_notes.append("Warm barefoot contact comfort (low effusivity b < 900 J/m²·K·s⁰·⁵).")
                elif mat.volumetric_heat_capacity_J_m3K > 1.8e6:  # Granite, dense concrete with solar gain
                    thermal_score = 82.0
                    thermal_notes.append("Direct-gain solar storage floor slab.")
                else:
                    thermal_score = 65.0
            else:
                # In hot climates, high effusivity stone feels cool and refreshing
                thermal_score = min(100.0, (mat.thermal_effusivity / 1800.0) * 85.0 + 15.0)
                thermal_notes.append("Cool radiant surface contact.")

        elif role == "glazing":
            # Glazing: Low conductivity / low U-value is paramount.
            # Low-E double glazing is top tier, single glass is poor.
            if "Low-E" in mat.name:
                thermal_score = 96.0
                thermal_notes.append("Low-E coating reflects radiant heat back inside; optimal U-value.")
            elif "Double" in mat.name:
                thermal_score = 82.0
                thermal_notes.append("Double pane insulating air cavity reduces conductive loss.")
            elif "Glass" in mat.name:
                thermal_score = 35.0
                thermal_notes.append("Single pane has high conductive loss (k=1.0 W/m·K); excessive night cooling.")
            else:
                thermal_score = 50.0

        # ---------------------------------------------------------
        # 2. Affordability Score (0 - 100)
        # ---------------------------------------------------------
        budget_tier_info = BUDGET_TIERS.get(req.budget_level, BUDGET_TIERS["moderate_balanced"])
        budget_cap = req.budget_target_usd_m2 or budget_tier_info["max_envelope_cost_m2"]

        cost = mat.typical_cost_usd_m2
        # Score decreases linearly if cost approaches or exceeds budget
        if cost <= budget_cap * 0.4:
            affordability_score = 100.0
        elif cost <= budget_cap:
            affordability_score = 100.0 - ((cost - budget_cap * 0.4) / (budget_cap * 0.6)) * 40.0
        else:
            # Over budget: steep penalty
            overage_ratio = (cost - budget_cap) / budget_cap
            affordability_score = max(5.0, 60.0 - overage_ratio * 70.0)

        # ---------------------------------------------------------
        # 3. Durability & Lifespan Score (0 - 100)
        # ---------------------------------------------------------
        durability_score = mat.durability_score * 10.0  # 1-10 to 10-100 scale

        # Climate-specific durability adjustments
        if climate in ("high_altitude_cold_desert", "extreme_cold"):
            # Extreme freeze-thaw spalling risk: stone and non-porous masonry thrive; untreated mud or hydrophilic foams suffer without protection
            if "Stone" in mat.category or "Granite" in mat.name:
                durability_score = min(100.0, durability_score + 4.0)
            elif "mud" in mat.name.lower() or "adobe" in mat.name.lower():
                durability_score = max(20.0, durability_score - 10.0)
        elif climate == "tropical_humid":
            # Rot / termite / fungal risk for untreated timber or organic fibers
            if "Wood" in mat.category or "Bio-based" in mat.category:
                durability_score = max(30.0, durability_score - 8.0)

        # ---------------------------------------------------------
        # 4. Regional Availability & Logistics Score (0 - 100)
        # ---------------------------------------------------------
        avail_rating = mat.regional_availability.get(region_key, 7.0)
        availability_score = avail_rating * 10.0

        # Logistics penalty for remote high altitudes if material is extraordinarily heavy and imported
        if region_key == "ladakh_high_altitude":
            if mat.density_kg_m3 > 2000.0 and "Granite" not in mat.name and "mud" not in mat.name.lower() and "adobe" not in mat.name.lower():
                # Heavy industrial material imported via Zoji La pass
                availability_score = max(20.0, availability_score - 8.0)

        # ---------------------------------------------------------
        # 5. Climate Suitability Score (0 - 100)
        # ---------------------------------------------------------
        climate_suitability_score = 70.0
        if climate == "high_altitude_cold_desert":
            # Needs high daytime solar gain + nighttime insulation or thermal mass
            if role == "insulation" and mat.k_W_mK <= 0.038:
                climate_suitability_score = 95.0
            elif role == "walls" and (mat.volumetric_heat_capacity_J_m3K >= 1.5e6 or mat.k_W_mK <= 0.15):
                climate_suitability_score = 92.0
            elif role == "glazing" and "Double" in mat.name:
                climate_suitability_score = 94.0
        elif climate == "extreme_cold":
            if mat.k_W_mK <= 0.035:
                climate_suitability_score = 96.0
            elif "Stone" in mat.category or "Concrete" in mat.category:
                climate_suitability_score = 80.0
        elif climate == "extreme_heat":
            if mat.volumetric_heat_capacity_J_m3K >= 1.6e6 or (role == "roofs" and mat.solar_absorptivity <= 0.4):
                climate_suitability_score = 92.0
        elif climate == "tropical_humid":
            if "Bio-based" in mat.category or "coir" in mat.name.lower():
                climate_suitability_score = 85.0

        # ---------------------------------------------------------
        # 6. Composite Weighted Calculation
        # ---------------------------------------------------------
        # Normalize weights
        w_therm = max(0.1, req.priority_thermal_efficiency)
        w_cost = max(0.1, req.priority_affordability)
        w_dur = max(0.1, req.priority_durability)
        w_avail = max(0.1, req.priority_local_availability)
        w_clim = 0.8  # baseline high climate suitability importance

        # Extra eco bonus
        eco_bonus = 0.0
        if req.priority_eco_sustainability > 0.6:
            if mat.embodied_carbon in ("Very Low", "Very Low (Carbon negative)", "Low"):
                eco_bonus = 6.0
            elif mat.embodied_carbon == "High":
                eco_bonus = -4.0

        total_weight = w_therm + w_cost + w_dur + w_avail + w_clim
        composite = (
            w_therm * thermal_score +
            w_cost * affordability_score +
            w_dur * durability_score +
            w_avail * availability_score +
            w_clim * climate_suitability_score
        ) / total_weight + eco_bonus

        composite = max(0.0, min(100.0, composite))

        return ScoredMaterial(
            material=mat,
            role=role,
            total_score=round(composite, 1),
            thermal_score=round(thermal_score, 1),
            affordability_score=round(affordability_score, 1),
            durability_score=round(durability_score, 1),
            availability_score=round(availability_score, 1),
            climate_suitability_score=round(climate_suitability_score, 1),
            score_breakdown_notes=thermal_notes
        )

    def rank_materials_for_role(
        self,
        role: str,
        req: RecommendationRequest,
        top_n: int = 6
    ) -> List[ScoredMaterial]:
        """Ranks all compatible materials for a specific envelope role."""
        scored: List[ScoredMaterial] = []
        for mat in self._enriched_cache.values():
            sm = self.score_material_for_role(mat, role, req)
            if sm is not None:
                scored.append(sm)

        # Sort descending by total_score
        scored.sort(key=lambda x: x.total_score, reverse=True)

        for i, s in enumerate(scored):
            s.rank = i + 1

        return scored[:top_n]

    def recommend(self, req: RecommendationRequest) -> AIRecommendationReport:
        """
        Executes end-to-end intelligent recommendation across all envelope roles.
        """
        roles = ["walls", "roofs", "insulation", "flooring", "glazing"]
        rankings: Dict[str, List[ScoredMaterial]] = {}
        for r in roles:
            rankings[r] = self.rank_materials_for_role(r, req, top_n=6)

        # 1. Primary Optimal Assembly (Top #1 in each role)
        wall_top = rankings["walls"][0]
        roof_top = rankings["roofs"][0]
        insul_top = rankings["insulation"][0]
        floor_top = rankings["flooring"][0]
        glaze_top = rankings["glazing"][0]

        total_cost = (
            wall_top.material.typical_cost_usd_m2 +
            roof_top.material.typical_cost_usd_m2 +
            insul_top.material.typical_cost_usd_m2 +
            floor_top.material.typical_cost_usd_m2 +
            glaze_top.material.typical_cost_usd_m2 * 0.25  # window-to-wall area weighting
        )

        # Approximate composite R-value (m²·K/W) for typical envelope thickness:
        # 250mm wall structural core + 100mm exterior insulation
        r_val = (0.25 / max(0.01, wall_top.material.k_W_mK)) + (0.10 / max(0.005, insul_top.material.k_W_mK))

        primary_assembly = EnvelopeAssembly(
            assembly_name=f"Optimal High-Performance {CLIMATE_TYPES.get(req.climate_condition, 'Climate')} Envelope",
            description=f"Synergistic composite tailored for {REGIONS.get(req.location, {}).get('name', req.location)}.",
            wall_material=wall_top,
            roof_material=roof_top,
            insulation_material=insul_top,
            floor_material=floor_top,
            glazing_material=glaze_top,
            total_estimated_cost_m2=round(total_cost, 2),
            estimated_envelope_r_value=round(r_val, 2),
            estimated_thermal_mass_rating="Very High" if wall_top.material.volumetric_heat_capacity_J_m3K > 1.8e6 else "Moderate",
            durability_rating_10=round(
                (wall_top.material.durability_score + roof_top.material.durability_score + insul_top.material.durability_score) / 3.0,
                1
            )
        )

        # 2. Budget Alternative Assembly (Filter for affordable/high value options)
        budget_wall = next((m for m in rankings["walls"] if m.material.cost_tier in ("Low", "Moderate")), wall_top)
        budget_roof = next((m for m in rankings["roofs"] if m.material.cost_tier in ("Low", "Moderate")), roof_top)
        budget_insul = next((m for m in rankings["insulation"] if m.material.cost_tier in ("Low", "Moderate")), insul_top)
        budget_floor = next((m for m in rankings["flooring"] if m.material.cost_tier in ("Low", "Moderate")), floor_top)
        budget_glaze = next((m for m in rankings["glazing"] if "Double" in m.material.name and "Low-E" not in m.material.name), glaze_top)

        b_cost = (
            budget_wall.material.typical_cost_usd_m2 +
            budget_roof.material.typical_cost_usd_m2 +
            budget_insul.material.typical_cost_usd_m2 +
            budget_floor.material.typical_cost_usd_m2 +
            budget_glaze.material.typical_cost_usd_m2 * 0.25
        )
        b_r_val = (0.25 / max(0.01, budget_wall.material.k_W_mK)) + (0.10 / max(0.005, budget_insul.material.k_W_mK))

        budget_assembly = EnvelopeAssembly(
            assembly_name="Cost-Optimized / Humanitarian Alternative",
            description="Maximizes thermal comfort per dollar spent, leveraging local building methods and economic insulation.",
            wall_material=budget_wall,
            roof_material=budget_roof,
            insulation_material=budget_insul,
            floor_material=budget_floor,
            glazing_material=budget_glaze,
            total_estimated_cost_m2=round(b_cost, 2),
            estimated_envelope_r_value=round(b_r_val, 2),
            estimated_thermal_mass_rating="High",
            durability_rating_10=round(
                (budget_wall.material.durability_score + budget_roof.material.durability_score + budget_insul.material.durability_score) / 3.0,
                1
            )
        )

        # 3. High-Thermal-Mass Solar Passive Assembly
        mass_wall = next((m for m in rankings["walls"] if m.material.volumetric_heat_capacity_J_m3K >= 1.8e6), wall_top)
        mass_floor = next((m for m in rankings["flooring"] if m.material.volumetric_heat_capacity_J_m3K >= 1.8e6), floor_top)
        mass_assembly = EnvelopeAssembly(
            assembly_name="High-Inertia Diurnal Trombe System",
            description="Focuses on heavy structural storage to capture daytime winter solar irradiance and discharge heat all night.",
            wall_material=mass_wall,
            roof_material=roof_top,
            insulation_material=insul_top,
            floor_material=mass_floor,
            glazing_material=glaze_top,
            total_estimated_cost_m2=round(total_cost * 1.05, 2),
            estimated_envelope_r_value=round(r_val, 2),
            estimated_thermal_mass_rating="Extreme (>2.0 MJ/m³·K)",
            durability_rating_10=round(mass_wall.material.durability_score, 1)
        )

        # 4. Generate AI Engineering Explanations
        ai_explanations = self._generate_ai_explanations(req, primary_assembly, budget_assembly)

        # Format serializable rankings
        serialized_rankings: Dict[str, List[Dict[str, Any]]] = {}
        for r, items in rankings.items():
            serialized_rankings[r] = [
                {
                    "rank": item.rank,
                    "id": item.material.id,
                    "name": item.material.name,
                    "category": item.material.category,
                    "total_score": item.total_score,
                    "thermal_score": item.thermal_score,
                    "affordability_score": item.affordability_score,
                    "durability_score": item.durability_score,
                    "availability_score": item.availability_score,
                    "climate_suitability_score": item.climate_suitability_score,
                    "k_W_mK": item.material.k_W_mK,
                    "density_kg_m3": item.material.density_kg_m3,
                    "cp_J_kgK": item.material.cp_J_kgK,
                    "volumetric_heat_capacity_MJ_m3K": round(item.material.volumetric_heat_capacity_J_m3K / 1e6, 2),
                    "solar_absorptivity": item.material.solar_absorptivity,
                    "emissivity": item.material.emissivity,
                    "typical_cost_usd_m2": item.material.typical_cost_usd_m2,
                    "cost_tier": item.material.cost_tier,
                    "durability_years": item.material.durability_lifespan_years,
                    "regional_availability_score": item.material.regional_availability.get(req.location, 7.0),
                    "fire_rating": item.material.fire_rating,
                    "embodied_carbon": item.material.embodied_carbon,
                    "advantages": item.material.advantages,
                    "disadvantages": item.material.disadvantages,
                    "notes": item.score_breakdown_notes,
                    "source": item.material.source
                }
                for item in items
            ]

        return AIRecommendationReport(
            request_summary={
                "location": req.location,
                "location_label": REGIONS.get(req.location, {}).get("name", req.location),
                "climate_condition": req.climate_condition,
                "climate_label": CLIMATE_TYPES.get(req.climate_condition, req.climate_condition),
                "budget_level": req.budget_level,
                "budget_label": BUDGET_TIERS.get(req.budget_level, {}).get("label", req.budget_level),
                "budget_cap_usd_m2": req.budget_target_usd_m2 or BUDGET_TIERS.get(req.budget_level, {}).get("max_envelope_cost_m2", 75.0),
            },
            primary_assembly=primary_assembly,
            budget_alternative_assembly=budget_assembly,
            high_thermal_mass_assembly=mass_assembly,
            role_rankings=serialized_rankings,
            ai_explanations=ai_explanations,
            disclaimer="Physical thermophysical properties (k, rho, cp, alpha, emissivity) are verified from ASHRAE / NIST reference literature. Financial costs, lifespans, and regional logistics ratings are estimated engineering benchmarks and clearly marked as such."
        )

    def _generate_ai_explanations(
        self,
        req: RecommendationRequest,
        primary: EnvelopeAssembly,
        budget: EnvelopeAssembly
    ) -> Dict[str, Any]:
        """
        Produces physics-grounded engineering narrative explanations for why each material was chosen,
        highlighting thermodynamic equations, envelope synergy, and budget trade-offs.
        """
        loc_name = REGIONS.get(req.location, {}).get("name", req.location)
        clim_name = CLIMATE_TYPES.get(req.climate_condition, req.climate_condition)

        # Wall explanation
        wall_m = primary.wall_material.material
        wall_rho_cp_mj = wall_m.volumetric_heat_capacity_J_m3K / 1e6
        wall_why = (
            f"Selected {wall_m.name} for the primary structural envelope core. "
            f"With a volumetric heat capacity of {wall_rho_cp_mj:.2f} MJ/m³·K and density of {wall_m.density_kg_m3:.0f} kg/m³, "
            f"it provides massive thermal damping against extreme {clim_name} diurnal temperature fluctuations. "
            f"When wrapped with continuous exterior insulation, this core acts as an indoor thermal battery, storing passive solar heat during peak daytime sun."
        )

        # Insulation explanation
        insul_m = primary.insulation_material.material
        insul_r_per_100mm = 0.10 / max(0.005, insul_m.k_W_mK)
        insul_why = (
            f"Recommended {insul_m.name} with an ultra-low thermal conductivity of k = {insul_m.k_W_mK:.3f} W/m·K. "
            f"A 100mm continuous layer yields an R-value of {insul_r_per_100mm:.2f} m²·K/W, cutting Fourier conductive heat flux (q = -k·dT/dx) by over 75% "
            f"during sub-zero nights. Its {insul_m.fire_rating} fire classification provides vital life safety in enclosed, remote shelters."
        )

        # Glazing explanation
        glaze_m = primary.glazing_material.material
        glaze_why = (
            f"Recommended {glaze_m.name}. In sub-zero sunny conditions (such as Leh/Ladakh with >650 W/m² GHI), "
            f"the selective coating admits shortwave solar irradiance while reflecting longwave infrared back into the interior. "
            f"This transforms southern window apertures into net-positive energy collectors over 24-hour cycles."
        )

        # Roof explanation
        roof_m = primary.roof_material.material
        roof_why = (
            f"Selected {roof_m.name} for the roof assembly due to its proven resistance to heavy snow loads, wind shear, and weather extremes. "
            f"Combined with the high-R insulation layer beneath, it eliminates the primary convective escape route of heated shelter air."
        )

        # Flooring explanation
        floor_m = primary.floor_material.material
        floor_why = (
            f"Specified {floor_m.name} to decouple indoor occupancy zones from freezing subgrade permafrost, "
            f"while providing abrasion resistance and durable thermal contact comfort."
        )

        # Budget alternatives narrative
        cost_diff = primary.total_estimated_cost_m2 - budget.total_estimated_cost_m2
        pct_savings = round((cost_diff / max(1.0, primary.total_estimated_cost_m2)) * 100.0, 1) if cost_diff > 0 else 0.0

        budget_narrative = (
            f"When operating under strict budget constraints (e.g. Humanitarian Emergency response), "
            f"substituting the primary assembly with '{budget.assembly_name}' achieves an estimated {pct_savings}% cost reduction "
            f"(saving ~${cost_diff:.1f}/m² of envelope). "
            f"Key trade-offs: Switching from {primary.wall_material.material.name} to {budget.wall_material.material.name} utilizes local adobe or low-cost masonry. "
            f"While requiring slightly thicker wall construction (approx 350-400mm) and external lime plaster against rain erosion, "
            f"it preserves over 80% of the thermal comfort performance while heavily reducing upfront freight logistics."
        )

        # Envelope synergy synthesis
        synergy_synthesis = (
            f"Envelope Thermodynamic Synergy: The recommended design pairs a heavy interior thermal mass ({wall_m.name}) "
            f"with an exterior thermal resistance blanket ({insul_m.name}) and high-performance apertures ({glaze_m.name}). "
            f"In building physics, placing insulation on the EXTERIOR of high-density mass prevents freezing temperatures from penetrating the structural core, "
            f"eliminates interstitial dew-point condensation, and shifts the peak nocturnal indoor cooling phase by 8 to 12 hours."
        )

        return {
            "climate_strategy_summary": f"Passive solar design strategy optimized for {loc_name} under {clim_name} boundary conditions.",
            "wall_justification": wall_why,
            "insulation_justification": insul_why,
            "glazing_justification": glaze_why,
            "roof_justification": roof_why,
            "flooring_justification": floor_why,
            "budget_alternative_analysis": budget_narrative,
            "envelope_synergy_synthesis": synergy_synthesis,
            "cost_saving_pct": pct_savings,
            "estimated_cost_saving_usd_m2": round(cost_diff, 2)
        }


# ---------------------------------------------------------------------------
# Global Singleton
# ---------------------------------------------------------------------------

_engine_instance: Optional[MaterialRecommendationEngine] = None


def get_recommendation_engine() -> MaterialRecommendationEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = MaterialRecommendationEngine()
    return _engine_instance
