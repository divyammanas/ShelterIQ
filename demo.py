"""
demo.py — End-to-end demonstration of the thermal calculation engine.

Run: python3 demo.py
Produces:
  - simulation_dashboard.png   (ambient/indoor temp, heat flow breakdown,
                                 solar gain, thermal storage, comfort status)
  - comparison_table.csv       (design comparison module output)
  - optimization_results.csv   (top optimizer picks)
  - simulation_timeseries.csv  (raw output for the future web UI/API)
"""

import numpy as np
# pyrefly: ignore [missing-import]
import matplotlib
matplotlib.use("Agg")
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import pandas as pd

from materials import MaterialDatabase, Material
from geometry import Shelter, Layer, Opening
from climate import synthetic_ladakh_winter
from comfort import ComfortBand
from thermal_engine import simulate, AddedMass
from compare import DesignCase, run_comparison, design_score
from optimize import SearchSpace, optimize


def build_baseline_shelter(mdb: MaterialDatabase) -> Shelter:
    """A modest single-room Ladakhi passive shelter: rammed-earth /
    stone walls, 10cm EPS insulation, double low-E south window,
    insulated door, flat roof (typical vernacular form)."""
    struct = mdb.get("stone_granite")
    insulation = mdb.get("eps_insulation")
    glazing = mdb.get("glass_double_lowE")

    shelter = Shelter(length=6.0, width=4.0, height=2.6, shape="flat_roof_box",
                       orientation_deg=180.0, ach=0.6)

    window = Opening(name="South Window", width=1.6, height=1.2, glazing=glazing,
                      shgc=0.55, orientation_deg=180.0)
    door = Opening(name="Entry Door", width=0.9, height=2.0, is_door=True,
                    u_value_override=1.8, orientation_deg=180.0)
    shelter.openings = [window, door]

    wall_layers = [Layer(struct, 0.30), Layer(insulation, 0.10)]
    roof_layers = [Layer(struct, 0.15), Layer(insulation, 0.12)]
    floor_layers = [Layer(struct, 0.20)]
    shelter.build_uniform_envelope(wall_layers, roof_layers, floor_layers)
    return shelter


def main():
    mdb = MaterialDatabase()
    climate = synthetic_ladakh_winter(duration_h=72, dt_h=0.5)
    comfort_band = ComfortBand(t_min=16.0, t_max=26.0, t_marginal_low=8.0, t_marginal_high=30.0)

    # 1) Baseline transient simulation --------------------------------
    baseline = build_baseline_shelter(mdb)
    water_mass = AddedMass("Water drums (thermal mass)", mdb.get("water"), volume_m3=0.6)
    result = simulate(baseline, climate, dt_h=0.5, added_masses=[water_mass],
                       comfort_band=comfort_band, heating_setpoint_C=None,  # passive, unheated
                       T_air0=-2.0, T_mass0=-2.0)

    print("=== Baseline passive simulation (72h, unheated) ===")
    print(f"Indoor T range: {result.min_T_air:.1f}C to {result.max_T_air:.1f}C")
    print(f"Comfort hours: {result.comfort_summary_hours}")

    # also run WITH ideal auxiliary heating to report heating demand
    result_heated = simulate(baseline, climate, dt_h=0.5, added_masses=[water_mass],
                              comfort_band=comfort_band, heating_setpoint_C=16.0,
                              T_air0=-2.0, T_mass0=-2.0)
    print(f"Estimated heating energy to hold 16C setpoint: "
          f"{result_heated.heating_energy_kWh:.2f} kWh over {climate.t_hours[-1]:.0f}h")

    # --- dashboard plot ---
    fig, axs = plt.subplots(4, 1, figsize=(11, 13), sharex=True)

    axs[0].plot(result.t_hours, result.T_out, label="Ambient T (C)", color="tab:blue")
    axs[0].plot(result.t_hours, result.T_air, label="Indoor Air T (C)", color="tab:red")
    axs[0].plot(result.t_hours, result.T_mass, label="Thermal Mass T (C)", color="tab:orange", alpha=0.7)
    axs[0].axhspan(comfort_band.t_min, comfort_band.t_max, color="green", alpha=0.08, label="Comfort band")
    axs[0].set_ylabel("Temperature (C)")
    axs[0].legend(loc="upper right", fontsize=8)
    axs[0].set_title("Ambient vs Indoor Temperature — Ladakh Winter, 72h Passive")

    axs[1].plot(result.t_hours, result.solar_gain_W, label="Solar gain (W)", color="tab:orange")
    axs[1].plot(result.t_hours, -result.conduction_loss_W, label="-Conduction loss (W)", color="tab:purple")
    axs[1].plot(result.t_hours, -result.ventilation_loss_W, label="-Ventilation loss (W)", color="tab:brown")
    axs[1].plot(result.t_hours, result.net_heat_flow_W, label="Net heat flow (W)", color="black", lw=1.2)
    axs[1].axhline(0, color="grey", lw=0.5)
    axs[1].set_ylabel("Heat flow (W)")
    axs[1].legend(loc="upper right", fontsize=8)
    axs[1].set_title("Heat Flow Breakdown")

    axs[2].plot(result.t_hours, result.storage_rate_W, color="tab:green")
    axs[2].axhline(0, color="grey", lw=0.5)
    axs[2].set_ylabel("Storage rate (W)")
    axs[2].set_title("Thermal Energy Stored (+) / Released (-) by Mass")

    status_num = np.array([{"comfortable": 2, "marginal": 1, "uncomfortable": 0}[s]
                            for s in result.comfort_status])
    axs[3].fill_between(result.t_hours, status_num, step="mid", color="tab:green", alpha=0.5)
    axs[3].set_yticks([0, 1, 2])
    axs[3].set_yticklabels(["Uncomfortable", "Marginal", "Comfortable"])
    axs[3].set_xlabel("Time (hours)")
    axs[3].set_title("Comfort Status")

    plt.tight_layout()
    plt.savefig("/home/claude/thermal_engine/simulation_dashboard.png", dpi=130)
    print("Saved simulation_dashboard.png")

    pd.DataFrame({
        "hour": result.t_hours, "T_out_C": result.T_out, "T_air_C": result.T_air,
        "T_mass_C": result.T_mass, "solar_gain_W": result.solar_gain_W,
        "conduction_loss_W": result.conduction_loss_W, "ventilation_loss_W": result.ventilation_loss_W,
        "net_heat_flow_W": result.net_heat_flow_W, "storage_rate_W": result.storage_rate_W,
        "comfort_status": result.comfort_status,
    }).to_csv("/home/claude/thermal_engine/simulation_timeseries.csv", index=False)

    # 2) Design comparison module --------------------------------------
    struct_alt = mdb.get("rammed_earth")
    insulation_thick = mdb.get("xps_insulation")
    alt_shelter = Shelter(length=6.0, width=4.0, height=2.6, shape="flat_roof_box",
                           orientation_deg=180.0, ach=0.4)
    alt_shelter.openings = [
        Opening("South Window", 1.6, 1.2, glazing=mdb.get("glass_double_lowE"), shgc=0.55, orientation_deg=180.0),
        Opening("Entry Door", 0.9, 2.0, is_door=True, u_value_override=1.6, orientation_deg=180.0),
    ]
    alt_shelter.build_uniform_envelope(
        [Layer(struct_alt, 0.35), Layer(insulation_thick, 0.15)],
        [Layer(struct_alt, 0.15), Layer(insulation_thick, 0.18)],
        [Layer(struct_alt, 0.25)],
    )

    cases = [
        DesignCase("Baseline: Stone + EPS10cm", baseline, added_masses=[water_mass]),
        DesignCase("Alt: Rammed Earth + XPS15cm, low ACH", alt_shelter, added_masses=[water_mass]),
    ]
    comp_rows = run_comparison(cases, climate, dt_h=0.5, comfort_band=comfort_band,
                                heating_setpoint_C=16.0)
    for row in comp_rows:
        row["design_score"] = design_score(row)
    comp_df = pd.DataFrame(comp_rows)
    comp_df.to_csv("/home/claude/thermal_engine/comparison_table.csv", index=False)
    print("\n=== Design comparison ===")
    print(comp_df.to_string(index=False))

    # 3) Optimization engine ---------------------------------------------
    space = SearchSpace(
        insulation_keys=["eps_insulation", "xps_insulation", "mineral_wool"],
        insulation_thicknesses_m=[0.05, 0.10, 0.15],
        structural_keys=["stone_granite", "rammed_earth", "concrete_light"],
        structural_thicknesses_m=[0.20, 0.30],
        orientations_deg=[180.0, 160.0, 200.0],
        window_area_fractions=[0.10, 0.15, 0.20],
        ach_options=[0.3, 0.5, 0.7],
    )
    top = optimize(baseline, mdb, space, climate, n_random=30, top_k=5,
                    dt_h=1.0, comfort_band=comfort_band, heating_setpoint_C=16.0)
    opt_df = pd.DataFrame([{k: v for k, v in r.items() if k != "params"} for r in top])
    opt_df.to_csv("/home/claude/thermal_engine/optimization_results.csv", index=False)
    print("\n=== Top optimizer picks ===")
    print(opt_df.to_string(index=False))
    print("\nBest design parameters:", top[0]["params"])


if __name__ == "__main__":
    main()
