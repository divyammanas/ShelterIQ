"""
materials.py — Thermal material database.

Each material carries the properties needed for conduction, thermal-mass
(capacitance) and radiation calculations:
    k       thermal conductivity      [W/m.K]
    rho     density                   [kg/m3]
    cp      specific heat             [J/kg.K]
    epsilon surface emissivity        [-]
    alpha   solar absorptivity        [-]   (opaque surfaces)
    is_pcm  whether this is a phase-change material
    pcm_props: dict with T_melt [C], latent heat L [J/kg], melt band [C]
               (used for effective-heat-capacity method)

Users can register custom materials at runtime with add_material().
"""

from dataclasses import dataclass, field
from typing import Optional, Dict


@dataclass
class Material:
    name: str
    k: float          # W/m.K
    rho: float        # kg/m3
    cp: float         # J/kg.K
    epsilon: float = 0.9
    alpha: float = 0.6          # solar absorptivity (opaque)
    is_pcm: bool = False
    pcm_props: Optional[Dict] = None   # {"T_melt":, "L":, "band":}

    def volumetric_heat_capacity(self) -> float:
        """J/m3.K — rho*cp, the key term for thermal-mass sizing."""
        return self.rho * self.cp

    def effective_cp(self, T: float) -> float:
        """
        Effective specific heat at temperature T [C], accounting for PCM
        latent heat release/absorption across the melt band
        (enthalpy method — avoids a moving-boundary solve).
        """
        if not self.is_pcm or not self.pcm_props:
            return self.cp
        T_melt = self.pcm_props["T_melt"]
        L = self.pcm_props["L"]
        band = self.pcm_props.get("band", 2.0)  # +/- deg C mushy zone
        if abs(T - T_melt) <= band:
            # Gaussian-shaped latent heat spike integrates ~L over the band
            import math
            sigma = band / 2.5
            spike = (L / (sigma * math.sqrt(2 * math.pi))) * math.exp(
                -0.5 * ((T - T_melt) / sigma) ** 2
            )
            return self.cp + spike
        return self.cp


DEFAULT_MATERIALS: Dict[str, Material] = {
    "concrete_dense":   Material("Dense Concrete", k=1.75, rho=2300, cp=1000, alpha=0.65),
    "concrete_light":   Material("Lightweight Concrete", k=0.38, rho=1000, cp=1000, alpha=0.6),
    "brick_common":     Material("Common Brick", k=0.72, rho=1700, cp=840, alpha=0.7),
    "stone_granite":    Material("Granite / Local Stone", k=2.8, rho=2600, cp=790, alpha=0.55),
    "rammed_earth":     Material("Rammed Earth", k=0.6, rho=1900, cp=1170, alpha=0.7),
    "mud_brick_adobe":  Material("Mud Brick (Adobe)", k=0.46, rho=1600, cp=1000, alpha=0.7),
    "timber_softwood":  Material("Softwood Timber", k=0.13, rho=500, cp=1600, alpha=0.6),
    "eps_insulation":   Material("EPS Insulation", k=0.034, rho=20, cp=1450, alpha=0.5),
    "xps_insulation":   Material("XPS Insulation", k=0.029, rho=35, cp=1450, alpha=0.5),
    "mineral_wool":     Material("Mineral Wool", k=0.04, rho=100, cp=840, alpha=0.5),
    "straw_bale":       Material("Straw Bale", k=0.07, rho=110, cp=1500, alpha=0.6),
    "water":            Material("Water (thermal mass)", k=0.6, rho=1000, cp=4186, alpha=0.9),
    "glass_single":     Material("Single Glazing", k=1.0, rho=2500, cp=840, epsilon=0.84, alpha=0.05),
    "glass_double_air": Material("Double Glazing (air gap)", k=0.7, rho=2500, cp=840, epsilon=0.84, alpha=0.05),
    "glass_double_lowE":Material("Double Glazing Low-E Argon", k=0.5, rho=2500, cp=840, epsilon=0.2, alpha=0.05),
    "air_gap":          Material("Air Gap (unventilated)", k=0.16, rho=1.2, cp=1005, alpha=0.0),
    "pcm_rt21": Material(
        "PCM RT21 (paraffin)", k=0.2, rho=880, cp=2000,
        is_pcm=True, pcm_props={"T_melt": 21.0, "L": 155000, "band": 2.5},
    ),
    "pcm_salt_hydrate": Material(
        "PCM Salt Hydrate (CaCl2.6H2O)", k=1.1, rho=1560, cp=2200,
        is_pcm=True, pcm_props={"T_melt": 29.0, "L": 190000, "band": 2.0},
    ),
}


class MaterialDatabase:
    """In-memory material catalogue with custom-entry support."""

    def __init__(self):
        self._db: Dict[str, Material] = dict(DEFAULT_MATERIALS)

    def get(self, key: str) -> Material:
        if key not in self._db:
            raise KeyError(f"Unknown material '{key}'. Use add_material() to register it.")
        return self._db[key]

    def add_material(self, key: str, material: Material):
        self._db[key] = material

    def list_materials(self):
        return list(self._db.keys())

    def as_table(self):
        """Return rows for a UI material-comparison table."""
        rows = []
        for key, m in self._db.items():
            rows.append({
                "key": key, "name": m.name, "k (W/mK)": m.k, "rho (kg/m3)": m.rho,
                "cp (J/kgK)": m.cp, "rho*cp (J/m3K)": m.volumetric_heat_capacity(),
                "emissivity": m.epsilon, "solar absorptivity": m.alpha,
                "PCM": m.is_pcm,
            })
        return rows


# ---------------------------------------------------------------------------
# CSV-backed material dataset (loaded once at startup, singleton pattern)
# Mirrors weather_dataset.py architecture.
# ---------------------------------------------------------------------------

import csv as _csv
import os as _os
import math as _math
import re as _re
import warnings as _warnings
from typing import List as _List

CSV_REQUIRED_COLUMNS = [
    "material_name",
    "category",
    "k_W_mK",
    "density_kg_m3",
    "cp_J_kgK",
    "emissivity",
    "solar_absorptivity",
    "source",
]


def _slugify(name: str) -> str:
    """Convert a material name to a stable lowercase underscore key."""
    slug = name.lower()
    slug = _re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    return slug


class MaterialDataset:
    """
    In-memory store for the CSV-backed material library.

    Loads ``data/ShelterIQ_materials_filtered.csv`` (or a caller-supplied
    path) once, validates required columns, maps CSV fields to
    ShelterIQ's Material model, and exposes a stable key-based lookup.

    PCM-category rows in the CSV carry no latent-heat data, so they are
    registered as plain (non-PCM) materials with is_pcm=False.  The full
    PCM definitions (pcm_rt21, pcm_salt_hydrate) remain in DEFAULT_MATERIALS
    and are not affected.
    """

    def __init__(self, csv_path: Optional[str] = None):
        if csv_path is None:
            base_dir = _os.path.dirname(_os.path.abspath(__file__))
            candidates = [
                _os.path.join(base_dir, "data", "ShelterIQ_materials_filtered.csv"),
                _os.path.join(base_dir, "ShelterIQ_materials_filtered.csv"),
            ]
            for cp in candidates:
                if _os.path.isfile(cp):
                    csv_path = cp
                    break

        if not csv_path or not _os.path.isfile(csv_path):
            raise FileNotFoundError(
                "ShelterIQ_materials_filtered.csv not found. "
                "Expected at data/ShelterIQ_materials_filtered.csv"
            )

        self.csv_path = csv_path
        # key → Material
        self._materials: Dict[str, Material] = {}
        # key → metadata (category, source, original name)
        self._meta: Dict[str, Dict] = {}
        self._load()

    def _load(self):
        with open(self.csv_path, mode="r", newline="", encoding="utf-8") as f:
            reader = _csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            missing = [c for c in CSV_REQUIRED_COLUMNS if c not in fieldnames]
            if missing:
                raise ValueError(
                    f"CSV {self.csv_path} is missing required columns: {missing}"
                )
            rows = list(reader)

        loaded = 0
        skipped = 0
        seen_keys: Dict[str, int] = {}  # key → count, for duplicate detection

        for row in rows:
            name = row.get("material_name", "").strip()
            if not name:
                skipped += 1
                continue

            # Parse numeric fields; skip row if any required numeric is invalid
            try:
                k_val = float(row["k_W_mK"])
                rho_val = float(row["density_kg_m3"])
                cp_val = float(row["cp_J_kgK"])
                eps_val = float(row["emissivity"])
                alpha_val = float(row["solar_absorptivity"])
            except (ValueError, KeyError):
                _warnings.warn(
                    f"MaterialDataset: skipping row '{name}' — non-numeric property value."
                )
                skipped += 1
                continue

            # Validate finite, positive values
            if not all(_math.isfinite(v) for v in [k_val, rho_val, cp_val, eps_val, alpha_val]):
                _warnings.warn(
                    f"MaterialDataset: skipping row '{name}' — non-finite property value."
                )
                skipped += 1
                continue
            if k_val <= 0 or rho_val <= 0 or cp_val <= 0:
                _warnings.warn(
                    f"MaterialDataset: skipping row '{name}' — non-positive k/rho/cp."
                )
                skipped += 1
                continue

            key = _slugify(name)

            # Disambiguate duplicate slugs
            if key in seen_keys:
                seen_keys[key] += 1
                key = f"{key}_{seen_keys[key]}"
            else:
                seen_keys[key] = 1

            material = Material(
                name=name,
                k=k_val,
                rho=rho_val,
                cp=cp_val,
                epsilon=eps_val,
                alpha=alpha_val,
                is_pcm=False,   # CSV PCM rows have no T_melt/L; keep is_pcm=False
                pcm_props=None,
            )
            self._materials[key] = material
            self._meta[key] = {
                "category": row.get("category", "").strip(),
                "source": row.get("source", "").strip(),
                "original_name": name,
            }
            loaded += 1

        if loaded == 0:
            raise ValueError(f"MaterialDataset: no valid rows loaded from {self.csv_path}")

        if skipped:
            _warnings.warn(f"MaterialDataset: skipped {skipped} invalid row(s) from {self.csv_path}")

        self._loaded_count = loaded

    def get(self, key: str) -> Material:
        if key not in self._materials:
            raise KeyError(f"Unknown CSV material '{key}'.")
        return self._materials[key]

    def list_keys(self) -> _List[str]:
        return list(self._materials.keys())

    def list_with_meta(self) -> _List[Dict]:
        """
        Returns a list of {id, name, category, source} dicts — enough for
        the frontend material-selector without sending the full property set.
        """
        result = []
        for key, mat in self._materials.items():
            meta = self._meta[key]
            result.append({
                "id": key,
                "name": mat.name,
                "category": meta["category"],
                "source": meta["source"],
            })
        return result

    def get_detail(self, key: str) -> Dict:
        """
        Returns the full property dict for a single material — used by
        the GET /api/materials/{material_id} endpoint.
        """
        mat = self.get(key)
        meta = self._meta[key]
        return {
            "id": key,
            "name": mat.name,
            "category": meta["category"],
            "thermal_conductivity": mat.k,
            "density": mat.rho,
            "specific_heat": mat.cp,
            "emissivity": mat.epsilon,
            "solar_absorptivity": mat.alpha,
            "source": meta["source"],
        }

    @property
    def loaded_count(self) -> int:
        return self._loaded_count


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_global_material_dataset: Optional["MaterialDataset"] = None


def get_material_dataset() -> MaterialDataset:
    global _global_material_dataset
    if _global_material_dataset is None:
        _global_material_dataset = MaterialDataset()
    return _global_material_dataset
