import os
import sys
import numpy as np
# pyrefly: ignore [missing-import]
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from materials import MaterialDatabase, Material
from geometry import Shelter, Layer, Opening
from climate import ClimateSeries, synthetic_ladakh_winter, from_leh_dataset
from comfort import ComfortBand
from thermal_engine import simulate, AddedMass, SimulationResult
from compare import DesignCase, run_comparison, design_score
from optimize import SearchSpace, optimize as run_optimize
from weather_dataset import get_weather_dataset
from materials import get_material_dataset as _get_material_dataset
from material_intelligence import (
    get_recommendation_engine,
    RecommendationRequest,
    REGIONS,
    CLIMATE_TYPES,
    BUDGET_TIERS
)

app = FastAPI(title="ShelterIQ Simulation & Optimization Engine API")

# Load material dataset once at startup (singleton, mirrors weather_dataset pattern)
try:
    _material_dataset = _get_material_dataset()
except FileNotFoundError as _e:
    import warnings as _startup_warnings
    _startup_warnings.warn(f"Material dataset not loaded: {_e}")
    _material_dataset = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MaterialSchema(BaseModel):
    name: str
    k: float
    rho: float
    cp: float
    alpha: float = 0.6
    epsilon: float = 0.9
    is_pcm: bool = False
    pcm_props: Optional[Dict[str, float]] = None

class LayerSchema(BaseModel):
    material: MaterialSchema
    thickness: float

class OpeningSchema(BaseModel):
    name: str
    width: float
    height: float
    glazing: MaterialSchema
    shgc: float
    orientation_deg: float
    is_door: bool = False
    u_value_override: Optional[float] = None

class AddedMassSchema(BaseModel):
    name: str
    material: MaterialSchema
    volume_m3: float

class ShelterSchema(BaseModel):
    length: float
    width: float
    height: float
    shape: str
    orientation_deg: float
    roof_pitch_deg: float
    ach: float
    walls: Dict[str, List[LayerSchema]]
    roof: List[LayerSchema]
    floor: List[LayerSchema]
    openings: List[OpeningSchema]

class ClimateSchema(BaseModel):
    t_hours: List[float]
    T_out: List[float]
    ghi: List[float]
    wind: List[float]
    rh: List[float]
    cloud: List[float]

class SimSettingsSchema(BaseModel):
    duration: int
    timestep: float
    T_air0: float
    T_mass0: float
    internal_gains: float
    heating_enabled: bool
    heating_setpoint: float

class SimulateRequest(BaseModel):
    shelter: ShelterSchema
    climate: Optional[ClimateSchema] = None
    settings: SimSettingsSchema
    added_masses: List[AddedMassSchema]
    scenario: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    year: Optional[int] = None

def map_to_material(m: MaterialSchema) -> Material:
    return Material(
        name=m.name,
        k=m.k,
        rho=m.rho,
        cp=m.cp,
        alpha=m.alpha,
        epsilon=m.epsilon,
        is_pcm=m.is_pcm,
        pcm_props=m.pcm_props
    )

def map_to_layer(l: LayerSchema) -> Layer:
    return Layer(material=map_to_material(l.material), thickness=l.thickness)

def map_to_opening(o: OpeningSchema) -> Opening:
    return Opening(
        name=o.name,
        width=o.width,
        height=o.height,
        glazing=map_to_material(o.glazing),
        shgc=o.shgc,
        orientation_deg=o.orientation_deg,
        is_door=o.is_door,
        # pyrefly: ignore [bad-argument-type]
        u_value_override=o.u_value_override
    )

def map_to_shelter(s: ShelterSchema) -> Shelter:
    wall_layers = [map_to_layer(l) for l in s.walls.get("S", [])]
    if not wall_layers and s.walls:
        first_face = list(s.walls.keys())[0]
        wall_layers = [map_to_layer(l) for l in s.walls[first_face]]
        
    roof_layers = [map_to_layer(l) for l in s.roof]
    floor_layers = [map_to_layer(l) for l in s.floor]
    openings = [map_to_opening(o) for o in s.openings]
    
    shelter = Shelter(
        length=s.length,
        width=s.width,
        height=s.height,
        shape=s.shape,
        orientation_deg=s.orientation_deg,
        roof_pitch_deg=s.roof_pitch_deg,
        ach=s.ach,
        openings=openings
    )
    shelter.build_uniform_envelope(wall_layers, roof_layers, floor_layers)
    return shelter

# ---------------------------------------------------------------------------
# Material dataset endpoints
# ---------------------------------------------------------------------------

@app.get("/api/materials")
def get_materials_list():
    """
    Returns [{id, name, category, source}] for every material in the CSV dataset.
    Only sends the fields needed for the frontend selector — not the full property set.
    """
    if _material_dataset is None:
        raise HTTPException(status_code=503, detail="Material dataset not available.")
    return _material_dataset.list_with_meta()


class RecommendationRequestSchema(BaseModel):
    location: str = "ladakh_high_altitude"
    location_name: Optional[str] = None
    climate_condition: str = "high_altitude_cold_desert"
    budget_level: str = "moderate_balanced"
    budget_target_usd_m2: Optional[float] = None
    priority_thermal_efficiency: float = 0.85
    priority_affordability: float = 0.70
    priority_durability: float = 0.80
    priority_local_availability: float = 0.85
    priority_eco_sustainability: float = 0.50
    prefers_high_thermal_mass: bool = True
    prefers_prefabricated_speed: bool = False
    custom_notes: Optional[str] = None

class MaterialCompareRequestSchema(BaseModel):
    material_ids: List[str]

class MaterialExplainRequestSchema(BaseModel):
    material_id: str
    target_role: str = "walls"
    climate_condition: str = "high_altitude_cold_desert"
    location: str = "ladakh_high_altitude"

@app.get("/api/materials/intelligence/meta")
def get_material_intelligence_meta():
    """
    Returns available climate regions, climate classifications, and budget tiers
    for guiding the Material Recommendation Engine.
    """
    return {
        "regions": REGIONS,
        "climate_types": CLIMATE_TYPES,
        "budget_tiers": BUDGET_TIERS
    }


@app.get("/api/materials/intelligence/list")
def get_material_intelligence_list(
    role: Optional[str] = None,
    category: Optional[str] = None,
    max_cost: Optional[float] = None
):
    """
    Returns full enriched material intelligence database including physical properties
    (thermal conductivity, density, specific heat, emissivity, solar absorptivity)
    and clearly labeled estimated values (cost, durability lifespan, regional availability,
    advantages, disadvantages, and verified data provenance).
    """
    engine = get_recommendation_engine()
    materials = engine.list_all_enriched()
    result = []
    for m in materials:
        if role and role not in m.envelope_roles and role != "all":
            continue
        if category and category.lower() != m.category.lower():
            continue
        if max_cost and m.typical_cost_usd_m2 > max_cost:
            continue
        result.append(m.to_dict())
    return result


@app.post("/api/materials/intelligence/recommend")
def recommend_materials(req: RecommendationRequestSchema):
    """
    Multi-criteria intelligent recommendation endpoint. Evaluates construction materials
    for walls, roofs, insulation, flooring, and glazing based on thermal conductivity,
    density, specific heat, emissivity, solar absorptivity, cost, availability, and durability.
    Returns optimal, budget-alternative, and high-inertia assemblies with AI physics explanations.
    """
    try:
        engine = get_recommendation_engine()
        internal_req = RecommendationRequest(
            location=req.location,
            location_name=req.location_name,
            climate_condition=req.climate_condition,
            budget_level=req.budget_level,
            budget_target_usd_m2=req.budget_target_usd_m2,
            priority_thermal_efficiency=req.priority_thermal_efficiency,
            priority_affordability=req.priority_affordability,
            priority_durability=req.priority_durability,
            priority_local_availability=req.priority_local_availability,
            priority_eco_sustainability=req.priority_eco_sustainability,
            prefers_high_thermal_mass=req.prefers_high_thermal_mass,
            prefers_prefabricated_speed=req.prefers_prefabricated_speed,
            custom_notes=req.custom_notes
        )
        report = engine.recommend(internal_req)
        return report.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Material recommendation error: {str(e)}")


@app.post("/api/materials/intelligence/compare")
def compare_materials(req: MaterialCompareRequestSchema):
    """
    Returns a side-by-side technical comparison matrix for specified material keys.
    """
    engine = get_recommendation_engine()
    results = []
    for mid in req.material_ids:
        m = engine.get_enriched_material(mid)
        if m:
            results.append(m.to_dict())
    return {
        "count": len(results),
        "materials": results
    }


@app.post("/api/materials/intelligence/explain")
def explain_material(req: MaterialExplainRequestSchema):
    """
    Generates a dedicated physics-backed engineering explanation for why a specific
    material is or is not suitable for a designated envelope role and climate.
    """
    engine = get_recommendation_engine()
    mat = engine.get_enriched_material(req.material_id)
    if not mat:
        raise HTTPException(status_code=404, detail=f"Material '{req.material_id}' not found.")

    v_cap = mat.volumetric_heat_capacity_J_m3K / 1e6
    effusivity = mat.thermal_effusivity
    diffusivity_e7 = mat.thermal_diffusivity_m2_s * 1e7

    explanation = {
        "material_id": mat.id,
        "material_name": mat.name,
        "target_role": req.target_role,
        "climate_condition": req.climate_condition,
        "thermodynamic_metrics": {
            "thermal_conductivity_k": f"{mat.k_W_mK:.3f} W/m·K (Fourier conduction rate)",
            "volumetric_heat_capacity": f"{v_cap:.2f} MJ/m³·K (Thermal inertia storage density)",
            "thermal_effusivity": f"{effusivity:.0f} J/(m²·K·s½) (Transient surface contact response)",
            "thermal_diffusivity": f"{diffusivity_e7:.2f} × 10⁻⁷ m²/s (Heat wave propagation velocity)"
        },
        "suitability_analysis": (
            f"{mat.name} exhibits thermal conductivity k = {mat.k_W_mK:.3f} W/m·K and volumetric heat capacity {v_cap:.2f} MJ/m³·K. "
            f"For {req.target_role} applications in {req.climate_condition}, "
            f"{'it excels as a primary thermal storage medium' if v_cap > 1.8 else 'it functions primarily as a thermal barrier / resist element'}. "
            f"Its surface emissivity of {mat.emissivity:.2f} and solar absorptivity of {mat.solar_absorptivity:.2f} determine longwave radiative emission and solar gain."
        ),
        "advantages": mat.advantages,
        "disadvantages": mat.disadvantages,
        "estimated_cost_usd_m2": mat.typical_cost_usd_m2,
        "durability_years": mat.durability_lifespan_years,
        "provenance_note": mat.provenance
    }
    return explanation


@app.get("/api/materials/{material_id}")
def get_material_detail(material_id: str):
    """
    Returns the full thermal properties for a single material from the CSV dataset.
    Response: {name, category, thermal_conductivity, density, specific_heat,
               emissivity, solar_absorptivity, source}
    """
    if _material_dataset is None:
        raise HTTPException(status_code=503, detail="Material dataset not available.")
    try:
        return _material_dataset.get_detail(material_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Material '{material_id}' not found in dataset.")


# ---------------------------------------------------------------------------
# Climate endpoints
# ---------------------------------------------------------------------------

@app.get("/api/climate/summary")
def get_climate_summary():
    try:
        ds = get_weather_dataset()
        return ds.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/climate/scenarios")
def get_climate_scenarios():
    try:
        ds = get_weather_dataset()
        return ds.get_scenarios()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/climate/hourly")
def get_climate_hourly(
    start: Optional[str] = None,
    end: Optional[str] = None,
    year: Optional[int] = None,
    scenario: Optional[str] = None,
    limit: int = 2000
):
    try:
        ds = get_weather_dataset()
        return ds.get_slice_dict(start_date=start, end_date=end, year=year, scenario=scenario, max_points=limit)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate")
def api_simulate(req: SimulateRequest):
    try:
        shelter_obj = map_to_shelter(req.shelter)
        if req.scenario or req.start_date or req.year or req.climate is None:
            climate_obj = from_leh_dataset(
                scenario=req.scenario or "typical_winter_72h",
                start_date=req.start_date,
                end_date=req.end_date,
                year=req.year,
                duration_h=float(req.settings.duration)
            )
        else:
            climate_obj = ClimateSeries(
                t_hours=np.array(req.climate.t_hours),
                T_out=np.array(req.climate.T_out),
                ghi=np.array(req.climate.ghi),
                wind=np.array(req.climate.wind),
                rh=np.array(req.climate.rh),
                cloud=np.array(req.climate.cloud)
            )
        
        masses = [
            AddedMass(
                name=m.name,
                material=map_to_material(m.material),
                volume_m3=m.volume_m3
            ) for m in req.added_masses
        ]
        
        band = ComfortBand(t_min=16.0, t_max=26.0, t_marginal_low=8.0, t_marginal_high=30.0)
        heating_setpoint = req.settings.heating_setpoint if req.settings.heating_enabled else None
        
        result: SimulationResult = simulate(
            shelter=shelter_obj,
            climate=climate_obj,
            dt_h=req.settings.timestep,
            added_masses=masses,
            internal_gains_W=req.settings.internal_gains,
            comfort_band=band,
            heating_setpoint_C=heating_setpoint,
            T_air0=req.settings.T_air0,
            T_mass0=req.settings.T_mass0
        )
        
        total_loss_kWh = float(np.trapezoid(
            np.clip(result.conduction_loss_W + result.ventilation_loss_W, 0, None),
            result.t_hours) / 1000.0)
        total_solar_kWh = float(np.trapezoid(np.clip(result.solar_gain_W, 0, None),
                                          result.t_hours) / 1000.0)
        stability = float(np.std(result.T_air))
        
        row_metrics = {
            "comfortable_h": round(result.comfort_summary_hours["comfortable"], 1),
            "estimated_heating_kWh": round(result.heating_energy_kWh, 2),
            "thermal_stability_stdC": round(stability, 2)
        }
        total_duration = float(climate_obj.t_hours[-1] - climate_obj.t_hours[0]) if len(climate_obj.t_hours) > 1 else float(req.settings.duration)
        score = design_score(
            row_metrics,
            max_comfort_h=max(1.0, total_duration),
            max_heating_kWh=max(50.0, 150.0 * (total_duration / 72.0))
        )
        
        return {
            "t_hours": result.t_hours.tolist(),
            "T_air": result.T_air.tolist(),
            "T_mass": result.T_mass.tolist(),
            "T_out": result.T_out.tolist(),
            "solar_gain_W": result.solar_gain_W.tolist(),
            "conduction_loss_W": result.conduction_loss_W.tolist(),
            "ventilation_loss_W": result.ventilation_loss_W.tolist(),
            "net_heat_flow_W": result.net_heat_flow_W.tolist(),
            "storage_rate_W": result.storage_rate_W.tolist(),
            "heating_energy_kWh": float(result.heating_energy_kWh),
            "heating_power_W": result.heating_power_W.tolist(),
            "comfort_summary_hours": result.comfort_summary_hours,
            "comfort_status": result.comfort_status,
            "min_T_air": float(result.min_T_air),
            "max_T_air": float(result.max_T_air),
            "conduction_loss_kWh": round(total_loss_kWh, 2),
            "solar_gain_kWh": round(total_solar_kWh, 2),
            "design_score": score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class OptimizeRequest(BaseModel):
    shelter: ShelterSchema
    climate: Optional[ClimateSchema] = None
    settings: SimSettingsSchema
    n_random: int = 35
    scenario: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    year: Optional[int] = None

@app.post("/api/optimize")
def api_optimize(req: OptimizeRequest):
    try:
        shelter_obj = map_to_shelter(req.shelter)
        if req.scenario or req.start_date or req.year or req.climate is None:
            climate_obj = from_leh_dataset(
                scenario=req.scenario or "typical_winter_72h",
                start_date=req.start_date,
                end_date=req.end_date,
                year=req.year,
                duration_h=float(req.settings.duration)
            )
        else:
            climate_obj = ClimateSeries(
                t_hours=np.array(req.climate.t_hours),
                T_out=np.array(req.climate.T_out),
                ghi=np.array(req.climate.ghi),
                wind=np.array(req.climate.wind),
                rh=np.array(req.climate.rh),
                cloud=np.array(req.climate.cloud)
            )
        
        mdb = MaterialDatabase()
        space = SearchSpace(
            insulation_keys=["eps_insulation", "xps_insulation", "mineral_wool"],
            insulation_thicknesses_m=[0.05, 0.10, 0.15],
            structural_keys=["stone_granite", "rammed_earth", "concrete_light"],
            structural_thicknesses_m=[0.20, 0.30],
            orientations_deg=[160.0, 180.0, 200.0],
            window_area_fractions=[0.10, 0.15, 0.20],
            ach_options=[0.3, 0.5, 0.7]
        )
        
        band = ComfortBand(t_min=16.0, t_max=26.0, t_marginal_low=8.0, t_marginal_high=30.0)
        
        top5 = run_optimize(
            base_shelter=shelter_obj,
            mdb=mdb,
            space=space,
            climate=climate_obj,
            n_random=req.n_random,
            top_k=5,
            dt_h=req.settings.timestep,
            comfort_band=band,
            heating_setpoint_C=req.settings.heating_setpoint,
            seed=7
        )
        
        serialized = []
        for r in top5:
            params = r.get("params", {})
            serialized.append({
                "name": r["design"],
                "score": float(r["score"]),
                "min_T": float(r["min_T_air_C"]),
                "max_T": float(r["max_T_air_C"]),
                "comfort_h": float(r["comfortable_h"]),
                "heating_energy": float(r["estimated_heating_kWh"]),
                "conduction_loss": float(r["total_heat_loss_kWh"]),
                "params": {
                    "struct": params.get("structure") or params.get("struct") or "stone_granite",
                    "sthick": float(params.get("structure_thickness_m", params.get("sthick", 0.3))),
                    "ins": params.get("insulation") or params.get("ins") or "xps_insulation",
                    "thick": float(params.get("insulation_thickness_m", params.get("thick", 0.1))),
                    "orient": float(params.get("orientation_deg", params.get("orient", 180.0))),
                    "win_f": float(params.get("window_fraction", params.get("win_f", 0.15))),
                    "ach_val": float(params.get("ach", params.get("ach_val", 0.5))),
                }
            })
        return serialized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_DIST = os.path.join(BASE_DIR, "frontend", "dist")
LEGACY_INDEX = os.path.join(BASE_DIR, "index.html")
HAS_REACT_BUILD = os.path.isfile(os.path.join(REACT_DIST, "index.html"))


def _index_path() -> str:
    if HAS_REACT_BUILD:
        return os.path.join(REACT_DIST, "index.html")
    return LEGACY_INDEX


@app.api_route("/", methods=["GET", "HEAD"])
def get_index():
    index_path = _index_path()
    if not os.path.isfile(index_path):
        raise HTTPException(status_code=500, detail="Frontend index.html was not found")
    return FileResponse(index_path)


@app.get("/comparison_table.csv")
def get_comparison_table():
    path = os.path.join(BASE_DIR, "comparison_table.csv")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="comparison_table.csv not found")
    return FileResponse(path)


@app.get("/optimization_results.csv")
def get_optimization_results():
    path = os.path.join(BASE_DIR, "optimization_results.csv")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="optimization_results.csv not found")
    return FileResponse(path)


if HAS_REACT_BUILD:
    app.mount("/assets", StaticFiles(directory=os.path.join(REACT_DIST, "assets")), name="react_assets")

    @app.get("/Icon.jpeg")
    def get_icon_jpeg():
        path = os.path.join(REACT_DIST, "Icon.jpeg")
        if not os.path.isfile(path):
            path = os.path.join(BASE_DIR, "frontend", "Icon.jpeg")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404)
        return FileResponse(path, media_type="image/jpeg")

    @app.get("/favicon.jpg")
    def get_favicon_jpg():
        path = os.path.join(REACT_DIST, "favicon.jpg")
        if not os.path.isfile(path):
            path = os.path.join(REACT_DIST, "Icon.jpeg")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404)
        return FileResponse(path, media_type="image/jpeg")

    @app.get("/favicon.ico")
    def get_favicon_ico():
        path = os.path.join(REACT_DIST, "Icon.jpeg")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404)
        return FileResponse(path, media_type="image/jpeg")

    @app.get("/favicon.svg")
    def get_favicon():
        path = os.path.join(REACT_DIST, "favicon.svg")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404)
        return FileResponse(path)

    @app.get("/icons.svg")
    def get_icons():
        path = os.path.join(REACT_DIST, "icons.svg")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404)
        return FileResponse(path)
else:
    app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=os.environ.get("RELOAD", "").lower() in ("1", "true"))
