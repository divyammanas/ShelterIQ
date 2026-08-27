"""
compare.py — Design comparison module.

Runs N shelter configurations under an identical climate series and
tabulates the metrics needed to rank them: heat loss, solar gain,
min/max indoor temp, comfort hours, thermal stability (std-dev of
indoor temp as a stability proxy), and estimated heating requirement.
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Optional

from geometry import Shelter
from climate import ClimateSeries
from thermal_engine import simulate, AddedMass, SimulationResult
from comfort import ComfortBand


@dataclass
class DesignCase:
    name: str
    shelter: Shelter
    added_masses: Optional[List[AddedMass]] = None


def run_comparison(cases: List[DesignCase], climate: ClimateSeries, dt_h: float = 0.5,
                    comfort_band: Optional[ComfortBand] = None,
                    heating_setpoint_C: Optional[float] = 18.0) -> List[Dict]:
    rows = []
    for case in cases:
        result: SimulationResult = simulate(
            case.shelter, climate, dt_h=dt_h,
            added_masses=case.added_masses,
            comfort_band=comfort_band,
            heating_setpoint_C=heating_setpoint_C,
        )
        total_loss_kWh = float(np.trapezoid(
            np.clip(result.conduction_loss_W + result.ventilation_loss_W, 0, None),
            result.t_hours) / 1000.0)
        total_solar_kWh = float(np.trapezoid(np.clip(result.solar_gain_W, 0, None),
                                          result.t_hours) / 1000.0)
        stability = float(np.std(result.T_air))  # lower = more stable indoor temp
        rows.append({
            "design": case.name,
            "min_T_air_C": round(result.min_T_air, 2),
            "max_T_air_C": round(result.max_T_air, 2),
            "comfortable_h": round(result.comfort_summary_hours["comfortable"], 1),
            "marginal_h": round(result.comfort_summary_hours["marginal"], 1),
            "uncomfortable_h": round(result.comfort_summary_hours["uncomfortable"], 1),
            "total_heat_loss_kWh": round(total_loss_kWh, 2),
            "total_solar_gain_kWh": round(total_solar_kWh, 2),
            "thermal_stability_stdC": round(stability, 2),
            "estimated_heating_kWh": round(result.heating_energy_kWh, 2),
        })
    return rows


def design_score(row: Dict, w_comfort=0.4, w_heating=0.35, w_stability=0.25,
                  max_comfort_h=72.0, max_heating_kWh=150.0, max_stability=10.0) -> float:
    """
    0-100 composite score: more comfort hours is better, less heating
    energy is better, lower temperature swing (stability) is better.
    Weights are adjustable; normalization bounds should be set from the
    scenario's simulation duration / expected worst-case heating load.
    """
    comfort_score = min(row["comfortable_h"] / max_comfort_h, 1.0)
    heating_score = 1.0 - min(row["estimated_heating_kWh"] / max_heating_kWh, 1.0)
    stability_score = 1.0 - min(row["thermal_stability_stdC"] / max_stability, 1.0)
    return round(100 * (w_comfort * comfort_score + w_heating * heating_score +
                         w_stability * stability_score), 1)
