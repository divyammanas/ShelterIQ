"""
thermal_engine.py — Transient thermal simulation core.

Model: a physically-conserving 2-node RC network per timestep, in the
spirit of ISO 13790's simplified hourly method:

    Node A (indoor air, low capacitance C_air)
    Node M (effective building thermal mass, capacitance C_mass —
            envelope inner layers + any explicit added mass/PCM)
    Node Out (ambient, prescribed by the climate series)

Heat paths:
    H_ve   : air  <-> outdoor          (ventilation/infiltration)
    H_win  : air  <-> outdoor          (windows + doors, direct conduction —
                                         negligible thermal mass)
    H_op_i : mass <-> sol-air(surface i)   (opaque wall/roof/floor conduction,
                                             driven by sol-air temp so solar-
                                             heated opaque surfaces feed the
                                             mass node)
    H_ms   : mass <-> air              (internal convective coupling)
    Q_solar_air / Q_solar_mass : direct window solar gain, split between
                                  immediate air heating and mass absorption

Backward-Euler (implicit) time-stepping — a 2x2 linear solve per step —
is unconditionally stable, so dt is a free user choice (minutes to hours)
without the low-capacitance air node blowing up an explicit scheme.

Outputs a full time-series plus an energy breakdown for dashboards.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional

from geometry import Shelter, Opening, Layer
from materials import Material
from climate import ClimateSeries
from solar import surface_irradiance, sol_air_temperature
from comfort import ComfortBand, comfort_hours

RHO_AIR = 1.2       # kg/m3
CP_AIR = 1005.0     # J/kg.K
H_OUT = 22.0        # W/m2K combined external film (wind-dependent refinement below)
H_MS = 9.1          # W/m2K internal convective coupling coefficient (ISO 13790 default)
GROUND_TEMP_C = 6.0  # stable shallow-ground temperature (approx local annual mean, Ladakh) —
                      # ground-contact floors couple to this, not to swinging ambient air


@dataclass
class AddedMass:
    """Explicit thermal-mass element added inside the shelter (e.g. water
    drums, PCM panels, stone floor slab) beyond the envelope's own mass."""
    name: str
    material: Material
    volume_m3: float

    def heat_capacity(self, T_ref: float = 20.0) -> float:
        return self.material.rho * self.material.effective_cp(T_ref) * self.volume_m3


@dataclass
class SimulationResult:
    t_hours: np.ndarray
    T_out: np.ndarray
    T_air: np.ndarray
    T_mass: np.ndarray
    solar_gain_W: np.ndarray
    conduction_loss_W: np.ndarray   # opaque + window, positive = loss to outside
    ventilation_loss_W: np.ndarray
    net_heat_flow_W: np.ndarray     # + into building, - out
    storage_rate_W: np.ndarray      # d(stored energy)/dt, + = charging
    heating_power_W: np.ndarray     # auxiliary heating needed to hold setpoint (0 if unheated run)
    comfort_status: List[str]
    comfort_summary_hours: dict
    heating_energy_kWh: float
    min_T_air: float
    max_T_air: float


def wind_film_coefficient(wind_ms: float) -> float:
    """External convective film coefficient, wind-dependent (simplified
    McAdams correlation): h = 5.7 + 3.8*v"""
    return 5.7 + 3.8 * max(wind_ms, 0.0)


def simulate(shelter: Shelter, climate: ClimateSeries, dt_h: float = 0.5,
             added_masses: Optional[List[AddedMass]] = None,
             internal_gains_W: float = 100.0,
             comfort_band: Optional[ComfortBand] = None,
             heating_setpoint_C: Optional[float] = 18.0,
             T_air0: float = 5.0, T_mass0: float = 5.0) -> SimulationResult:
    """
    Run the transient simulation over the full duration of `climate`.

    heating_setpoint_C: if set, an ideal auxiliary heater tops up T_air to
        this value whenever it would otherwise fall below it (used to
        report the *estimated external heating requirement*). Set to None
        to simulate a fully passive, unheated shelter.
    """
    added_masses = added_masses or []
    comfort_band = comfort_band or ComfortBand()

    elements = shelter.envelope_elements()  # walls x4 + roof + floor
    windows = [o for o in shelter.openings if not o.is_door]
    doors = [o for o in shelter.openings if o.is_door]

    # Static conductances -----------------------------------------------
    H_win_total = sum(o.u_value() * o.area for o in windows + doors)
    H_ve = 0.34 * shelter.ach * shelter.volume()  # W/K  (0.34 ~ rho*cp/3600)
    U_A = {el.name: (el.u_value(), el.area) for el in elements}
    H_ms = H_MS * (shelter.wall_area_net() + shelter.roof.area)  # internal surface area coupling

    # Capacitances --------------------------------------------------------
    C_air = RHO_AIR * CP_AIR * shelter.volume()
    C_mass = sum(el.areal_heat_capacity() * el.area for el in elements)
    C_mass += sum(m.heat_capacity() for m in added_masses)

    # Build the simulation's own dt_h-spaced time axis (independent of
    # whatever resolution the climate series happens to be sampled at —
    # ClimateSeries.at() interpolates), so dt_h is always the true,
    # single source of truth for both integration and comfort-hour
    # accounting downstream.
    duration_h = float(climate.t_hours[-1])
    t = np.arange(0.0, duration_h + 1e-9, dt_h)
    n = len(t)
    T_air = np.zeros(n)
    T_mass = np.zeros(n)
    T_air[0], T_mass[0] = T_air0, T_mass0

    solar_gain = np.zeros(n)
    cond_loss = np.zeros(n)
    vent_loss = np.zeros(n)
    net_flow = np.zeros(n)
    storage_rate = np.zeros(n)
    heating_power = np.zeros(n)

    for k in range(1, n):
        dt_sec = (t[k] - t[k - 1]) * 3600.0
        hod = t[k] % 24.0
        cl = climate.at(t[k])
        T_out_k = cl["T_out"]
        # pyrefly: ignore [bad-argument-type]
        h_out_dyn = wind_film_coefficient(cl["wind"])

        # --- sol-air temps + opaque conduction target for the mass node ---
        Hop_sum = 0.0
        Hop_Tsolair_sum = 0.0
        for el in elements:
            U, A = U_A[el.name]
            if el.is_ground_contact:
                # ground-contact floor: couples to stable sub-surface soil
                # temperature, not to swinging ambient air / solar
                T_solair = GROUND_TEMP_C
            else:
                # pyrefly: ignore [bad-argument-type]
                I_surf = surface_irradiance(cl["ghi"], hod, el.orientation_deg,
                                             # pyrefly: ignore [bad-argument-type]
                                             el.tilt_deg, cl["cloud"])
                layer_alpha = el.layers[0].material.alpha if el.layers else 0.6
                # pyrefly: ignore [bad-argument-type]
                T_solair = sol_air_temperature(T_out_k, I_surf, layer_alpha, h_out=h_out_dyn,
                                                is_horizontal=(el.tilt_deg < 10),
                                                long_wave_correction=4.0 if I_surf == 0 else 0.0)
            Hop_sum += U * A
            Hop_Tsolair_sum += U * A * T_solair

        # --- window solar gain (direct, split air/mass) ---
        Q_win_solar = 0.0
        for w in windows:
            # pyrefly: ignore [bad-argument-type]
            I_surf = surface_irradiance(cl["ghi"], hod, w.orientation_deg, 90.0, cl["cloud"])
            Q_win_solar += I_surf * w.shgc * w.area
        Q_solar_air = 0.7 * Q_win_solar + internal_gains_W
        Q_solar_mass = 0.3 * Q_win_solar

        # --- implicit (backward Euler) 2x2 solve ---
        # [ (C_air/dt + H_ve+H_win+H_ms)   -H_ms            ] [Ta]   [C_air/dt*Ta_old + (H_ve+H_win)*Tout + Qsolar_air]
        # [ -H_ms          (C_mass/dt + Hop_sum + H_ms)      ] [Tm] = [C_mass/dt*Tm_old + Hop_Tsolair_sum + Qsolar_mass]
        a11 = C_air / dt_sec + H_ve + H_win_total + H_ms
        a12 = -H_ms
        a21 = -H_ms
        a22 = C_mass / dt_sec + Hop_sum + H_ms
        b1 = C_air / dt_sec * T_air[k - 1] + (H_ve + H_win_total) * T_out_k + Q_solar_air
        b2 = C_mass / dt_sec * T_mass[k - 1] + Hop_Tsolair_sum + Q_solar_mass

        A = np.array([[a11, a12], [a21, a22]])
        b = np.array([b1, b2])
        Ta_new, Tm_new = np.linalg.solve(A, b)

        # --- optional ideal auxiliary heating to hold setpoint ---
        q_heat = 0.0
        if heating_setpoint_C is not None and Ta_new < heating_setpoint_C:
            # re-solve with Ta forced to setpoint, back out required q_heat
            # added directly to the air-node energy balance
            Ta_target = heating_setpoint_C
            # Re-solve the mass-node row consistently with the air node
            # clamped to the setpoint (row 2: -H_ms*Ta + a22*Tm = b2), so
            # the thermal mass correctly warms toward the heated air
            # temperature instead of being left at its unheated-solve value.
            Ta_new = Ta_target
            Tm_new = (b2 + H_ms * Ta_new) / a22
            # from row 1: a11*Ta - H_ms*Tm = b1 + q_heat
            q_heat = a11 * Ta_new - H_ms * Tm_new - b1
            q_heat = max(q_heat, 0.0)

        T_air[k], T_mass[k] = Ta_new, Tm_new
        heating_power[k] = q_heat

        # --- bookkeeping for dashboards ---
        solar_gain[k] = Q_win_solar + Hop_Tsolair_sum - Hop_sum * T_out_k  # solar contribution vs a no-sun baseline
        cond_opaque_loss = Hop_sum * (Tm_new - T_out_k)
        cond_window_loss = H_win_total * (Ta_new - T_out_k)
        cond_loss[k] = cond_opaque_loss + cond_window_loss
        vent_loss[k] = H_ve * (Ta_new - T_out_k)
        net_flow[k] = Q_solar_air + Q_solar_mass + q_heat - cond_loss[k] - vent_loss[k]
        storage_rate[k] = (C_mass * (Tm_new - T_mass[k - 1]) + C_air * (Ta_new - T_air[k - 1])) / dt_sec

    comfort_status = [comfort_band.classify(T) for T in T_air]
    summary = comfort_hours(T_air, dt_h, comfort_band)
    heating_energy_kWh = float(np.trapezoid(heating_power, t) / 1000.0)
    T_out_series = np.interp(t, climate.t_hours, climate.T_out)

    return SimulationResult(
        # pyrefly: ignore [bad-argument-type]
        t_hours=t, T_out=T_out_series, T_air=T_air, T_mass=T_mass,
        solar_gain_W=solar_gain, conduction_loss_W=cond_loss, ventilation_loss_W=vent_loss,
        net_heat_flow_W=net_flow, storage_rate_W=storage_rate, heating_power_W=heating_power,
        comfort_status=comfort_status, comfort_summary_hours=summary,
        heating_energy_kWh=heating_energy_kWh,
        min_T_air=float(np.min(T_air)), max_T_air=float(np.max(T_air)),
    )
