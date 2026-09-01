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

# Ensure local path is registered
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import original Python core engine files
from materials import MaterialDatabase, Material
from geometry import Shelter, Layer, Opening
from climate import ClimateSeries, synthetic_ladakh_winter
from comfort import ComfortBand
from thermal_engine import simulate, AddedMass, SimulationResult
from compare import DesignCase, run_comparison, design_score
from optimize import SearchSpace, optimize as run_optimize

app = FastAPI(title="ShelterIQ Simulation & Optimization Engine API")

# Enable CORS for cross-origin local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic API Schemas ---
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
    climate: ClimateSchema
    settings: SimSettingsSchema
    added_masses: List[AddedMassSchema]

# --- Schema Mapping Helpers ---
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
    # Use South wall layers as the uniform wall layer representation
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

# --- REST Endpoints ---
@app.post("/api/simulate")
def api_simulate(req: SimulateRequest):
    try:
        shelter_obj = map_to_shelter(req.shelter)
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
        
        # Run local transient simulation
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
        
        # Trapeze integrations for loss/gain metrics
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
        score = design_score(row_metrics, max_comfort_h=float(req.settings.duration))
        
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
    climate: ClimateSchema
    settings: SimSettingsSchema
    n_random: int = 35

@app.post("/api/optimize")
def api_optimize(req: OptimizeRequest):
    try:
        shelter_obj = map_to_shelter(req.shelter)
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
            serialized.append({
                "name": r["design"],
                "score": float(r["score"]),
                "min_T": float(r["min_T_air_C"]),
                "max_T": float(r["max_T_air_C"]),
                "comfort_h": float(r["comfortable_h"]),
                "heating_energy": float(r["estimated_heating_kWh"]),
                "conduction_loss": float(r["total_heat_loss_kWh"]),
                "params": r["params"]
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
    assets_dir = os.path.join(REACT_DIST, "assets")
    if os.path.isdir(assets_dir):
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
