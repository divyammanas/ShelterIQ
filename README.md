# ShelterIQ

### Thermal simulation and design optimization for climate-resilient shelters

ShelterIQ is a Python-based thermal modelling and design-analysis engine for evaluating shelter performance in cold, high-altitude environments. The current implementation focuses on passive thermal behaviour under a synthetic Ladakh-like winter climate, while providing a foundation for future real-weather and web-based interfaces.

## What ShelterIQ does

ShelterIQ models how a shelter responds to outdoor temperature, solar radiation, wind, ventilation, envelope construction, glazing, thermal mass, and optional auxiliary heating.

The current pipeline can:

- Simulate indoor air and building thermal-mass temperatures over time.
- Account for conduction through walls, roof, floor, windows, and doors.
- Model ventilation/infiltration heat loss using air-change rate (ACH).
- Calculate solar gains through openings and solar effects on opaque surfaces.
- Evaluate thermal comfort using configurable comfort bands.
- Estimate auxiliary heating energy required to maintain a setpoint.
- Compare alternative shelter/material designs.
- Search a design space for high-performing combinations of materials, insulation thickness, orientation, window area, and ACH.
- Export simulation and optimization results as CSV files for downstream analysis or a future UI/API.

The end-to-end demonstration uses a 72-hour passive shelter simulation for a synthetic Ladakh winter profile and generates a dashboard, comparison data, optimization results, and raw time-series data. fileciteturn2file0L2-L2

## Current Architecture

```text
Climate Input
     │
     ▼
┌───────────────┐
│  climate.py   │  synthetic / CSV climate series
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   solar.py    │  solar irradiance + sol-air effects
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ geometry.py   │  shelter geometry + envelope
└───────┬───────┘
        │
        ├───────────────┐
        ▼               ▼
┌───────────────┐ ┌───────────────┐
│ materials.py  │ │ comfort.py    │
│ material DB   │ │ comfort bands │
└───────┬───────┘ └───────┬───────┘
        │                 │
        └────────┬────────┘
                 ▼
        ┌─────────────────┐
        │ thermal_engine  │
        │ 2-node RC model │
        └────────┬────────┘
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
┌───────────────┐   ┌───────────────┐
│  compare.py   │   │   optimize.py │
│ design cases  │   │ design search │
└───────────────┘   └───────────────┘
                 │
                 ▼
            demo.py / outputs
```

## Thermal Model

The simulation core uses a physically conserving two-node resistance-capacitance model with an indoor-air node and an effective building thermal-mass node. It uses backward-Euler time stepping and solves a 2×2 linear system at each timestep. The model accounts for ventilation, window/door conduction, opaque-envelope conduction, internal air-to-mass coupling, solar gains, explicit thermal masses, comfort, and optional ideal auxiliary heating. fileciteturn4file0L2-L2

## Material Database

`materials.py` contains a built-in catalogue of representative construction and thermal-mass materials, including stone, rammed earth, concrete, timber, EPS/XPS/mineral-wool insulation, glazing, water, and phase-change materials (PCM). Materials expose thermal conductivity, density, specific heat, surface emissivity, solar absorptivity, and optional PCM properties. Custom materials can also be registered at runtime. fileciteturn3file0L2-L2

> **Note:** The default material values are representative modelling inputs and should be replaced or calibrated with laboratory/field-verified data for engineering decisions. fileciteturn3file0L2-L2

## Climate Inputs

The climate layer currently supports:

1. **Synthetic Ladakh-like winter data** for repeatable demos and testing.
2. **CSV import** with the following columns:

```text
hour, T_out_C, GHI_Wm2, wind_ms, RH_pct, cloud_pct
```

A live-weather API adapter is planned but is not wired into the current implementation yet. fileciteturn5file0L2-L2

## Project Structure

| File | Purpose |
|---|---|
| `demo.py` | End-to-end demonstration and output generation |
| `thermal_engine.py` | Core transient thermal simulation engine |
| `materials.py` | Material database and thermal properties |
| `geometry.py` | Shelter geometry, envelope layers, and openings |
| `climate.py` | Climate series generation and CSV import |
| `solar.py` | Solar irradiance and sol-air calculations |
| `comfort.py` | Thermal comfort classification and summaries |
| `compare.py` | Alternative design comparison |
| `optimize.py` | Design-space search and ranking |
| `simulation_dashboard.png` | Example generated simulation dashboard |
| `simulation_timeseries.csv` | Raw simulation time-series output |
| `comparison_table.csv` | Design comparison output |
| `optimization_results.csv` | Top optimization candidates |

The repository currently contains these core Python modules plus the generated CSV/dashboard outputs. fileciteturn1file0L2-L2

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/divyammanas/ShelterIQ.git
cd ShelterIQ
```

### 2. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows:

```powershell
.venv\Scripts\activate
```

### 3. Install dependencies

The current code imports NumPy, Pandas, and Matplotlib. Install them with:

```bash
pip install numpy pandas matplotlib
```

### 4. Run the demo

```bash
python3 demo.py
```

The demo produces:

- `simulation_dashboard.png`
- `simulation_timeseries.csv`
- `comparison_table.csv`
- `optimization_results.csv`

The demo is designed as an end-to-end example covering baseline simulation, an alternative design comparison, and optimization. fileciteturn2file0L2-L2

## Example Workflow

A typical workflow is:

```python
from materials import MaterialDatabase
from climate import synthetic_ladakh_winter
from thermal_engine import simulate

mdb = MaterialDatabase()
climate = synthetic_ladakh_winter(duration_h=72, dt_h=0.5)

# Build a Shelter object using geometry.py,
# then pass it to the simulator.
result = simulate(
    shelter,
    climate,
    dt_h=0.5,
    comfort_band=comfort_band,
    heating_setpoint_C=None,
)

print(result.min_T_air)
print(result.max_T_air)
print(result.comfort_summary_hours)
```

For the complete working example, see `demo.py`. fileciteturn2file0L2-L2

## Design Optimization

`optimize.py` can search combinations of:

- Structural material
- Insulation material
- Insulation thickness
- Structural thickness
- Shelter orientation
- Window-area fraction
- Air-change rate (ACH)

The demo currently evaluates a search space containing multiple insulation and structural material choices, three insulation thicknesses, multiple orientations, window-area fractions, and ACH values, then exports the top-ranked candidates. fileciteturn2file0L2-L2

## Current Limitations

ShelterIQ is currently a research/prototype simulation project rather than a validated engineering package.

Important limitations include:

- The default demonstration climate is synthetic rather than live weather data.
- Several physical coefficients and material properties are simplified assumptions.
- The live weather adapter is currently a stub.
- There is no production web interface/API in the repository yet.
- Simulation results should be validated against measured field or laboratory data before being used for real construction decisions.

## Roadmap

Planned directions include:

- Real weather-data integration.
- Location-aware climate modelling.
- A browser-based dashboard and API.
- More detailed envelope and geometry modelling.
- Calibration against experimental/field measurements.
- Additional passive-design strategies and optimization objectives.
- Improved reporting and decision-support visualizations.

## Project Status

🚧 **Active development / prototype**

ShelterIQ is being developed as part of a Smart India Hackathon 2026 project.

## Contributing

Contributions are welcome. For team development, use feature branches rather than committing directly to `main`:

```bash
git checkout -b feature/<your-feature>
git add .
git commit -m "Describe your change"
git push -u origin feature/<your-feature>
```

Then open a Pull Request against `main`.

## License

License information will be added to the repository as the project is finalized.

---

**ShelterIQ** — modelling smarter, more resilient shelters through thermal simulation and design optimization.
