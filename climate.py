"""
climate.py — Climate data series: ambient temp, solar radiation, wind,
humidity, cloud cover, at a user-defined timestep, over a user-defined
simulation duration.

Supports:
  - manual/synthetic generation (sinusoidal diurnal model, quick to demo)
  - CSV import (columns: hour, T_out_C, GHI_Wm2, wind_ms, RH_pct, cloud_pct)
  - future weather-API adapter stub
"""

import numpy as np
import csv
from dataclasses import dataclass


@dataclass
class ClimateSeries:
    t_hours: np.ndarray        # time axis, hours from sim start
    T_out: np.ndarray          # C
    ghi: np.ndarray            # Global Horizontal Irradiance, W/m2
    wind: np.ndarray           # m/s
    rh: np.ndarray             # % relative humidity
    cloud: np.ndarray          # % cloud cover

    def at(self, t_hour: float):
        """Linear-interpolate all channels at a given hour."""
        return dict(
            T_out=np.interp(t_hour, self.t_hours, self.T_out),
            ghi=np.interp(t_hour, self.t_hours, self.ghi),
            wind=np.interp(t_hour, self.t_hours, self.wind),
            rh=np.interp(t_hour, self.t_hours, self.rh),
            cloud=np.interp(t_hour, self.t_hours, self.cloud),
        )


def synthetic_ladakh_winter(duration_h: float = 72, dt_h: float = 1.0,
                             T_mean=-8.0, T_amp=9.0, ghi_peak=650,
                             wind_mean=3.5, rh_mean=35, cloud_mean=15,
                             phase_shift_h=14.0) -> ClimateSeries:
    """
    Synthetic high-altitude cold-desert winter profile (Ladakh-like):
    large diurnal swing, strong clear-sky solar despite cold air, low
    humidity, moderate wind. Diurnal min near sunrise (~6h), peak ~14h.
    """
    t = np.arange(0, duration_h + 1e-9, dt_h)
    hod = t % 24  # hour of day

    T_out = T_mean + T_amp * np.sin(2 * np.pi * (hod - 6) / 24 - np.pi / 2)
    # daytime solar bell curve, zero at night
    daylight = np.clip(np.sin(np.pi * (hod - 6) / 12), 0, None)
    ghi = ghi_peak * daylight ** 1.3

    wind = wind_mean + 1.5 * np.sin(2 * np.pi * (hod - 15) / 24) + \
        np.random.default_rng(42).normal(0, 0.3, size=t.shape)
    wind = np.clip(wind, 0.2, None)

    rh = rh_mean - 8 * daylight + np.random.default_rng(1).normal(0, 2, size=t.shape)
    rh = np.clip(rh, 5, 100)

    cloud = np.full_like(t, cloud_mean, dtype=float)

    return ClimateSeries(t, T_out, ghi, wind, rh, cloud)


def from_csv(path: str) -> ClimateSeries:
    """
    Expects columns: hour, T_out_C, GHI_Wm2, wind_ms, RH_pct, cloud_pct
    """
    t, T, g, w, rh, c = [], [], [], [], [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            t.append(float(row["hour"]))
            T.append(float(row["T_out_C"]))
            g.append(float(row["GHI_Wm2"]))
            w.append(float(row["wind_ms"]))
            rh.append(float(row["RH_pct"]))
            c.append(float(row["cloud_pct"]))
    return ClimateSeries(np.array(t), np.array(T), np.array(g), np.array(w),
                          np.array(rh), np.array(c))


def from_manual_hourly(T_out_list, ghi_list=None, wind_list=None,
                        rh_list=None, cloud_list=None, dt_h=1.0) -> ClimateSeries:
    n = len(T_out_list)
    t = np.arange(0, n * dt_h, dt_h)[:n]
    z = np.zeros(n)
    return ClimateSeries(
        t, np.array(T_out_list, dtype=float),
        np.array(ghi_list, dtype=float) if ghi_list else z,
        np.array(wind_list, dtype=float) if wind_list else np.full(n, 2.0),
        np.array(rh_list, dtype=float) if rh_list else np.full(n, 40.0),
        np.array(cloud_list, dtype=float) if cloud_list else np.full(n, 20.0),
    )


def fetch_live_weather_stub(lat: float, lon: float, duration_h: float):
    """
    Placeholder for future real-time weather API integration
    (e.g. Open-Meteo / IMD). Wire this to an HTTP client and map the
    response into a ClimateSeries when a live API key/endpoint is available.
    """
    raise NotImplementedError(
        "Live weather API integration not yet wired — use synthetic_ladakh_winter() "
        "or from_csv() for now."
    )
