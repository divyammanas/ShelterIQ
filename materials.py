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


# ---------------------------------------------------------------------------
# Default database — representative values, adjust for lab-verified data.
# ---------------------------------------------------------------------------

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
