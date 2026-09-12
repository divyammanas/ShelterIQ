"""
weather_dataset.py — In-memory singleton dataset manager for 5-year Leh weather data (2021-2025).

Loads `leh_weather_5years_enriched.csv` once at startup, keeps numerical arrays
in contiguous NumPy arrays for zero-overhead slicing, provides summary statistics,
and exposes adapters to convert date ranges or predefined scenarios into `ClimateSeries`.
"""

import os
import csv
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

REQUIRED_COLUMNS = [
    "timestamp",
    "temperature_c",
    "ghi_w_m2",
    "wind_speed_m_s",
    "relative_humidity",
    "ghi_clearsky_w_m2",
    "cloud_cover_pct",
    "solar_gain_tilted_w_m2",
    "diurnal_mean_temp_c",
    "diurnal_temp_range_c",
    "diurnal_mean_temp_24h_c",
    "solar_altitude_deg",
    "solar_azimuth_deg"
]

SCENARIOS_META = [
    {
        "id": "typical_winter_72h",
        "name": "Typical Winter (72h)",
        "description": "Representative 72-hour Ladakh winter period with sub-zero temperatures and high solar radiation.",
        "start": "2024-01-15 00:00:00",
        "end": "2024-01-17 23:00:00",
        "duration_h": 72
    },
    {
        "id": "coldest_week",
        "name": "Historic Cold Wave (7 Days)",
        "description": "Extreme 7-day winter freeze around record low (-39.1°C) in January 2022.",
        "start": "2022-01-12 00:00:00",
        "end": "2022-01-18 23:00:00",
        "duration_h": 168
    },
    {
        "id": "high_wind_period",
        "name": "High Wind Spring Storm (72h)",
        "description": "Spring storm period with peak winds up to 12.6 m/s.",
        "start": "2025-04-19 00:00:00",
        "end": "2025-04-21 23:00:00",
        "duration_h": 72
    },
    {
        "id": "peak_solar_week",
        "name": "Peak Solar Week (7 Days)",
        "description": "May summer solstice lead-up with intense clear-sky GHI exceeding 1,100 W/m².",
        "start": "2023-05-09 00:00:00",
        "end": "2023-05-15 23:00:00",
        "duration_h": 168
    },
    {
        "id": "year_2024",
        "name": "Full Year 2024",
        "description": "Complete annual cycle for 2024 (8,784 hourly records).",
        "start": "2024-01-01 00:00:00",
        "end": "2024-12-31 23:00:00",
        "duration_h": 8784
    },
    {
        "id": "year_2023",
        "name": "Full Year 2023",
        "description": "Complete annual cycle for 2023 (8,760 hourly records).",
        "start": "2023-01-01 00:00:00",
        "end": "2023-12-31 23:00:00",
        "duration_h": 8760
    },
    {
        "id": "year_2022",
        "name": "Full Year 2022",
        "description": "Complete annual cycle for 2022 (8,760 hourly records).",
        "start": "2022-01-01 00:00:00",
        "end": "2022-12-31 23:00:00",
        "duration_h": 8760
    },
    {
        "id": "year_2021",
        "name": "Full Year 2021",
        "description": "Complete annual cycle for 2021 (8,760 hourly records).",
        "start": "2021-01-01 00:00:00",
        "end": "2021-12-31 23:00:00",
        "duration_h": 8760
    },
    {
        "id": "year_2025",
        "name": "Full Year 2025",
        "description": "Complete annual cycle for 2025 (8,760 hourly records).",
        "start": "2025-01-01 00:00:00",
        "end": "2025-12-31 23:00:00",
        "duration_h": 8760
    }
]


class WeatherDataset:
    """In-memory store for the 5-year hourly Leh weather dataset."""

    def __init__(self, csv_path: Optional[str] = None):
        if csv_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidate_paths = [
                os.path.join(base_dir, "data", "leh_weather_5years_enriched.csv"),
                os.path.join(base_dir, "leh_weather_5years_enriched.csv"),
                os.path.expanduser("~/Downloads/leh_weather_5years_enriched.csv"),
            ]
            for cp in candidate_paths:
                if os.path.isfile(cp):
                    csv_path = cp
                    break

        if not csv_path or not os.path.isfile(csv_path):
            raise FileNotFoundError(f"Weather dataset CSV not found at candidate paths.")

        self.csv_path = csv_path
        self._load()

    def _load(self):
        with open(self.csv_path, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            missing = [c for c in REQUIRED_COLUMNS if c not in fieldnames]
            if missing:
                raise ValueError(f"Missing required columns in {self.csv_path}: {missing}")

            rows = list(reader)

        # Sort chronologically by timestamp
        rows.sort(key=lambda r: r["timestamp"])
        self.total_records = len(rows)

        self.timestamps: List[str] = [r["timestamp"] for r in rows]
        self.dt_timestamps: List[datetime] = [
            datetime.fromisoformat(ts.replace(" ", "T")) for ts in self.timestamps
        ]

        # Convert numerical columns to fast NumPy float64 arrays
        self.temperature_c = np.array([float(r["temperature_c"]) for r in rows], dtype=np.float64)
        self.ghi_w_m2 = np.array([float(r["ghi_w_m2"]) for r in rows], dtype=np.float64)
        self.wind_speed_m_s = np.array([float(r["wind_speed_m_s"]) for r in rows], dtype=np.float64)
        self.relative_humidity = np.array([float(r["relative_humidity"]) for r in rows], dtype=np.float64)
        self.ghi_clearsky_w_m2 = np.array([float(r["ghi_clearsky_w_m2"]) for r in rows], dtype=np.float64)
        self.cloud_cover_pct = np.array([float(r["cloud_cover_pct"]) for r in rows], dtype=np.float64)
        self.solar_gain_tilted_w_m2 = np.array([float(r["solar_gain_tilted_w_m2"]) for r in rows], dtype=np.float64)
        self.diurnal_mean_temp_c = np.array([float(r["diurnal_mean_temp_c"]) for r in rows], dtype=np.float64)
        self.diurnal_temp_range_c = np.array([float(r["diurnal_temp_range_c"]) for r in rows], dtype=np.float64)
        self.diurnal_mean_temp_24h_c = np.array([float(r["diurnal_mean_temp_24h_c"]) for r in rows], dtype=np.float64)
        self.solar_altitude_deg = np.array([float(r["solar_altitude_deg"]) for r in rows], dtype=np.float64)
        self.solar_azimuth_deg = np.array([float(r["solar_azimuth_deg"]) for r in rows], dtype=np.float64)

        # Precompute summary statistics
        self._summary = {
            "location": "Leh, Ladakh (34.15° N, 77.57° E, 3500m ASL)",
            "elevation_m": 3500,
            "latitude_deg": 34.15,
            "longitude_deg": 77.57,
            "start_date": self.timestamps[0],
            "end_date": self.timestamps[-1],
            "total_records": self.total_records,
            "resolution": "1h",
            "available_years": sorted(list(set(d.year for d in self.dt_timestamps))),
            "temperature": {
                "min": round(float(np.min(self.temperature_c)), 2),
                "max": round(float(np.max(self.temperature_c)), 2),
                "mean": round(float(np.mean(self.temperature_c)), 2),
            },
            "ghi": {
                "min": round(float(np.min(self.ghi_w_m2)), 2),
                "max": round(float(np.max(self.ghi_w_m2)), 2),
                "mean": round(float(np.mean(self.ghi_w_m2)), 2),
            },
            "wind": {
                "min": round(float(np.min(self.wind_speed_m_s)), 2),
                "max": round(float(np.max(self.wind_speed_m_s)), 2),
                "mean": round(float(np.mean(self.wind_speed_m_s)), 2),
            },
            "humidity": {
                "min": round(float(np.min(self.relative_humidity)), 2),
                "max": round(float(np.max(self.relative_humidity)), 2),
                "mean": round(float(np.mean(self.relative_humidity)), 2),
            },
            "extremes": {
                "coldest": {
                    "value": round(float(np.min(self.temperature_c)), 2),
                    "timestamp": self.timestamps[int(np.argmin(self.temperature_c))]
                },
                "hottest": {
                    "value": round(float(np.max(self.temperature_c)), 2),
                    "timestamp": self.timestamps[int(np.argmax(self.temperature_c))]
                },
                "max_wind": {
                    "value": round(float(np.max(self.wind_speed_m_s)), 2),
                    "timestamp": self.timestamps[int(np.argmax(self.wind_speed_m_s))]
                },
                "max_ghi": {
                    "value": round(float(np.max(self.ghi_w_m2)), 2),
                    "timestamp": self.timestamps[int(np.argmax(self.ghi_w_m2))]
                }
            }
        }

    def get_summary(self) -> Dict[str, Any]:
        return self._summary

    def get_scenarios(self) -> List[Dict[str, Any]]:
        return SCENARIOS_META

    def _find_range_indices(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        year: Optional[int] = None
    ) -> Tuple[int, int]:
        """Find start and end row indices in O(log N) or linear sweep."""
        if year is not None:
            start_date = f"{year}-01-01 00:00:00"
            end_date = f"{year}-12-31 23:59:59"

        if not start_date and not end_date:
            return 0, self.total_records

        # Parse comparison datetimes
        start_dt = (
            datetime.fromisoformat(start_date.replace(" ", "T"))
            if start_date
            else self.dt_timestamps[0]
        )
        end_dt = (
            datetime.fromisoformat(end_date.replace(" ", "T"))
            if end_date
            else self.dt_timestamps[-1]
        )

        import bisect
        start_idx = bisect.bisect_left(self.dt_timestamps, start_dt)
        end_idx = bisect.bisect_right(self.dt_timestamps, end_dt)

        start_idx = max(0, min(start_idx, self.total_records - 1))
        end_idx = max(start_idx + 1, min(end_idx, self.total_records))

        return start_idx, end_idx

    def get_slice_dict(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        year: Optional[int] = None,
        scenario: Optional[str] = None,
        max_points: int = 2000
    ) -> Dict[str, Any]:
        """Returns JSON-serializable sliced records with downsampling if needed."""
        if scenario:
            sc_match = next((s for s in SCENARIOS_META if s["id"] == scenario), None)
            if sc_match:
                start_date = sc_match["start"]
                end_date = sc_match["end"]

        s_idx, e_idx = self._find_range_indices(start_date, end_date, year)
        count = e_idx - s_idx

        # Calculate stride for downsampling
        step = max(1, (count + max_points - 1) // max_points) if max_points and count > max_points else 1
        indices = list(range(s_idx, e_idx, step))

        records = []
        for i in indices:
            records.append({
                "timestamp": self.timestamps[i],
                "temperature_c": round(float(self.temperature_c[i]), 2),
                "ghi_w_m2": round(float(self.ghi_w_m2[i]), 1),
                "wind_speed_m_s": round(float(self.wind_speed_m_s[i]), 2),
                "relative_humidity": round(float(self.relative_humidity[i]), 1),
                "cloud_cover_pct": round(float(self.cloud_cover_pct[i]), 1),
                "solar_gain_tilted_w_m2": round(float(self.solar_gain_tilted_w_m2[i]), 1),
                "solar_altitude_deg": round(float(self.solar_altitude_deg[i]), 1),
                "solar_azimuth_deg": round(float(self.solar_azimuth_deg[i]), 1),
            })

        sub_temp = self.temperature_c[s_idx:e_idx]
        sub_ghi = self.ghi_w_m2[s_idx:e_idx]
        sub_wind = self.wind_speed_m_s[s_idx:e_idx]
        sub_rh = self.relative_humidity[s_idx:e_idx]

        return {
            "start_date": self.timestamps[s_idx],
            "end_date": self.timestamps[e_idx - 1],
            "total_points": count,
            "returned_points": len(records),
            "step_stride": step,
            "stats": {
                "min_temp": round(float(np.min(sub_temp)), 2) if len(sub_temp) else 0,
                "max_temp": round(float(np.max(sub_temp)), 2) if len(sub_temp) else 0,
                "mean_temp": round(float(np.mean(sub_temp)), 2) if len(sub_temp) else 0,
                "max_ghi": round(float(np.max(sub_ghi)), 1) if len(sub_ghi) else 0,
                "mean_ghi": round(float(np.mean(sub_ghi)), 1) if len(sub_ghi) else 0,
                "mean_wind": round(float(np.mean(sub_wind)), 2) if len(sub_wind) else 0,
                "mean_rh": round(float(np.mean(sub_rh)), 1) if len(sub_rh) else 0,
            },
            "records": records
        }

    def get_climate_series(
        self,
        scenario: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        year: Optional[int] = None,
        duration_h: Optional[float] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Extracts raw NumPy arrays: (t_hours, T_out, ghi, wind, rh, cloud).
        t_hours is normalized to start at 0.0 with 1.0h steps.
        """
        if scenario:
            sc_match = next((s for s in SCENARIOS_META if s["id"] == scenario), None)
            if sc_match:
                start_date = sc_match["start"]
                end_date = sc_match["end"]

        s_idx, e_idx = self._find_range_indices(start_date, end_date, year)

        if duration_h is not None and duration_h > 0:
            req_points = int(round(duration_h))
            e_idx = min(s_idx + req_points, self.total_records)

        count = e_idx - s_idx
        if count <= 0:
            raise ValueError(f"No records found for specified range {start_date} to {end_date}")

        t_hours = np.arange(0, count, dtype=np.float64)
        T_out = self.temperature_c[s_idx:e_idx].copy()
        ghi = self.ghi_w_m2[s_idx:e_idx].copy()
        wind = self.wind_speed_m_s[s_idx:e_idx].copy()
        rh = self.relative_humidity[s_idx:e_idx].copy()
        cloud = self.cloud_cover_pct[s_idx:e_idx].copy()

        return t_hours, T_out, ghi, wind, rh, cloud


# Global singleton instance loaded once
_global_dataset: Optional[WeatherDataset] = None


def get_weather_dataset() -> WeatherDataset:
    global _global_dataset
    if _global_dataset is None:
        _global_dataset = WeatherDataset()
    return _global_dataset
