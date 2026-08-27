"""
optimize.py — Optimization engine.

Searches combinations of insulation thickness, wall material, orientation,
and window area to find the design that maximizes the composite design
score (see compare.design_score). Uses random + local-refinement search
(cheap, parallelizable, no gradient needed — appropriate since the
simulator is a black box w.r.t. the search variables).

For a hackathon-scale demo this trades exhaustiveness for speed; swap in
a genetic algorithm (e.g. DEAP) or Bayesian optimization later without
touching the simulation core.
"""

import itertools
import random
from dataclasses import dataclass
from typing import List, Dict, Callable, Optional

from geometry import Shelter, Layer, Opening
from materials import MaterialDatabase
from climate import ClimateSeries
from compare import DesignCase, run_comparison, design_score
from comfort import ComfortBand


@dataclass
class SearchSpace:
    insulation_keys: List[str]              # e.g. ['eps_insulation','xps_insulation','mineral_wool']
    insulation_thicknesses_m: List[float]    # e.g. [0.05, 0.1, 0.15]
    structural_keys: List[str]               # e.g. ['concrete_dense','stone_granite','rammed_earth']
    structural_thicknesses_m: List[float]
    orientations_deg: List[float]            # candidate front-orientation bearings
    window_area_fractions: List[float]       # fraction of south-ish wall area glazed
    ach_options: List[float]


def _build_candidate(base: Shelter, mdb: MaterialDatabase, insulation_key, ins_t,
                      struct_key, struct_t, orientation, win_frac, ach) -> Shelter:
    ins_mat = mdb.get(insulation_key)
    struct_mat = mdb.get(struct_key)
    wall_layers = [Layer(struct_mat, struct_t), Layer(ins_mat, ins_t)]
    roof_layers = [Layer(struct_mat, max(struct_t * 0.6, 0.05)), Layer(ins_mat, ins_t)]
    floor_layers = [Layer(struct_mat, struct_t)]

    s = Shelter(length=base.length, width=base.width, height=base.height,
                shape=base.shape, orientation_deg=orientation, ach=ach)

    south_wall_area = s.length * s.height  # approx one face
    win_area = max(south_wall_area * win_frac, 0.1)
    win_w = min((win_area) ** 0.5, s.length * 0.8)
    win_h = win_area / win_w
    glazing = mdb.get("glass_double_lowE")
    window = Opening(name="South Window", width=win_w, height=win_h, glazing=glazing,
                      shgc=0.55, orientation_deg=180.0)
    door = Opening(name="Entry Door", width=0.9, height=2.0, is_door=True,
                    u_value_override=1.8, orientation_deg=orientation)
    s.openings = [window, door]
    s.build_uniform_envelope(wall_layers, roof_layers, floor_layers)
    return s


def optimize(base_shelter: Shelter, mdb: MaterialDatabase, space: SearchSpace,
             climate: ClimateSeries, n_random: int = 40, top_k: int = 5,
             dt_h: float = 1.0, comfort_band: Optional[ComfortBand] = None,
             heating_setpoint_C: float = 18.0, seed: int = 7) -> List[Dict]:
    """
    Random search over the combinatorial space (cheap, embarrassingly
    parallel, avoids combinatorial blow-up of full grid search), scored
    by compare.design_score. Returns the top_k candidates with their
    parameters and metrics.
    """
    rng = random.Random(seed)
    combos = list(itertools.product(
        space.insulation_keys, space.insulation_thicknesses_m,
        space.structural_keys, space.structural_thicknesses_m,
        space.orientations_deg, space.window_area_fractions, space.ach_options,
    ))
    sample = rng.sample(combos, min(n_random, len(combos)))

    results = []
    for (ins_k, ins_t, struct_k, struct_t, orient, win_frac, ach) in sample:
        candidate = _build_candidate(base_shelter, mdb, ins_k, ins_t, struct_k, struct_t,
                                      orient, win_frac, ach)
        name = (f"{struct_k}({struct_t*100:.0f}cm)+{ins_k}({ins_t*100:.0f}cm) "
                f"orient={orient:.0f} win={win_frac:.0%} ACH={ach}")
        case = DesignCase(name=name, shelter=candidate)
        rows = run_comparison([case], climate, dt_h=dt_h, comfort_band=comfort_band,
                               heating_setpoint_C=heating_setpoint_C)
        row = rows[0]
        row["score"] = design_score(row)
        row["params"] = dict(insulation=ins_k, insulation_thickness_m=ins_t,
                              structure=struct_k, structure_thickness_m=struct_t,
                              orientation_deg=orient, window_fraction=win_frac, ach=ach)
        results.append(row)

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:top_k]
