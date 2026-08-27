"""
geometry.py — Shelter geometry, orientation, and layered envelope construction.

Supports box and simple pitched-roof shapes. Each envelope element (wall x4,
roof, floor) is built from an ordered list of material layers (outside -> in),
from which U-value, R-value and areal heat capacity are derived.
"""

import math
from dataclasses import dataclass, field
from typing import List, Tuple, Dict
from materials import Material

R_SI_OUT = 0.04   # m2K/W external surface resistance (wind-exposed, ~ high wind)
R_SI_IN = 0.13    # m2K/W internal surface resistance (still air)


@dataclass
class Layer:
    material: Material
    thickness: float  # m


@dataclass
class BuildingElement:
    """A wall, roof or floor assembly made of ordered layers."""
    name: str
    layers: List[Layer]
    area: float              # m2
    orientation_deg: float = 0.0   # 0=N,90=E,180=S,270=W (compass, used for solar)
    tilt_deg: float = 90.0         # 90=vertical wall, 0=horizontal roof-up
    is_ground_contact: bool = False

    def r_value(self, include_films=True) -> float:
        r = sum(l.thickness / l.material.k for l in self.layers)
        if include_films and not self.is_ground_contact:
            r += R_SI_OUT + R_SI_IN
        elif include_films and self.is_ground_contact:
            # Simplified steady-state ground-coupling resistance for a
            # slab-on-grade floor (soil + coupling effects dominate over
            # the slab's own conductance for typical shelter footprints;
            # ~1.5-2.0 m2K/W is a common design-stage approximation).
            r += R_SI_IN + 1.8
        return r

    def u_value(self) -> float:
        return 1.0 / self.r_value()

    def areal_heat_capacity(self) -> float:
        """
        kappa [J/m2.K] — ISO 13790-style effective internal heat capacity:
        sum of (rho*cp*thickness) for the *inner-half* of each layer up to
        the layer, capped so far-side (outer) mass doesn't count toward the
        fast-responding indoor-coupled mass. Simplified: use inner-facing
        half of total layer mass, capped at 0.1 m depth of penetration.
        """
        kappa = 0.0
        depth_used = 0.0
        max_depth = 0.10  # m — typical thermal penetration depth over a day
        # layers ordered outside->inside; walk from the inside (reverse)
        for l in reversed(self.layers):
            remaining = max_depth - depth_used
            if remaining <= 0:
                break
            eff_thick = min(l.thickness, remaining)
            kappa += l.material.rho * l.material.cp * eff_thick
            depth_used += eff_thick
        return kappa

    def total_mass_heat_capacity(self) -> float:
        """Full areal heat capacity (all layers) — used for PCM/mass sizing, J/m2.K"""
        return sum(l.material.rho * l.material.cp * l.thickness for l in self.layers)


@dataclass
class Opening:
    """Window or door."""
    name: str
    width: float
    height: float
    # pyrefly: ignore [bad-assignment]
    glazing: Material = None       # None => opaque door
    # pyrefly: ignore [bad-assignment]
    u_value_override: float = None  # e.g. door U-value if not glazing
    shgc: float = 0.6               # solar heat gain coefficient (windows)
    orientation_deg: float = 180.0
    is_door: bool = False

    @property
    def area(self) -> float:
        return self.width * self.height

    def u_value(self) -> float:
        if self.u_value_override is not None:
            return self.u_value_override
        if self.glazing is not None:
            # crude single-pane-equivalent U from conductivity + fixed films
            R = 0.006 / self.glazing.k + R_SI_OUT + R_SI_IN if not self.glazing.is_pcm else 1.4
            # double-glazing keys already encode an effective k; treat as one layer @ 6mm-equiv per pane
            return 1.0 / R if not self.is_door else 2.0
        return 2.0  # default insulated door U-value W/m2K


@dataclass
class Shelter:
    length: float
    width: float
    height: float
    shape: str = "flat_roof_box"   # 'flat_roof_box' | 'pitched_roof_box'
    orientation_deg: float = 180.0  # compass bearing the "front" (length) wall faces
    roof_pitch_deg: float = 20.0
    walls: Dict[str, BuildingElement] = field(default_factory=dict)   # N,E,S,W
    # pyrefly: ignore [bad-assignment]
    roof: BuildingElement = None
    # pyrefly: ignore [bad-assignment]
    floor: BuildingElement = None
    openings: List[Opening] = field(default_factory=list)
    ach: float = 0.5   # air changes per hour (infiltration + ventilation)

    def volume(self) -> float:
        if self.shape == "pitched_roof_box":
            ridge_extra = self.width * math.tan(math.radians(self.roof_pitch_deg)) * self.length / 2
            return self.length * self.width * self.height + ridge_extra
        return self.length * self.width * self.height

    def floor_area(self) -> float:
        return self.length * self.width

    def wall_area_gross(self) -> float:
        return 2 * (self.length + self.width) * self.height

    def opening_area(self) -> float:
        return sum(o.area for o in self.openings)

    def wall_area_net(self) -> float:
        return self.wall_area_gross() - self.opening_area()

    def build_uniform_envelope(self, wall_layers: List[Layer], roof_layers: List[Layer],
                                floor_layers: List[Layer]):
        """Convenience: same layer stack on all 4 walls, split by compass face."""
        face_bearings = {"N": 0.0, "E": 90.0, "S": 180.0, "W": 270.0}
        # allocate openings' area away from gross per-face area proportionally
        per_face_area = self.wall_area_gross() / 4.0
        for face, bearing in face_bearings.items():
            openings_here = [o for o in self.openings if o.orientation_deg == bearing]
            face_opening_area = sum(o.area for o in openings_here)
            self.walls[face] = BuildingElement(
                name=f"Wall-{face}",
                layers=list(wall_layers),
                area=max(per_face_area - face_opening_area, 0.0),
                orientation_deg=bearing,
                tilt_deg=90.0,
            )
        roof_tilt = 0.0 if self.shape == "flat_roof_box" else self.roof_pitch_deg
        roof_area = self.floor_area() if self.shape == "flat_roof_box" else \
            self.floor_area() / math.cos(math.radians(self.roof_pitch_deg))
        self.roof = BuildingElement(
            name="Roof", layers=list(roof_layers), area=roof_area,
            orientation_deg=self.orientation_deg, tilt_deg=roof_tilt,
        )
        self.floor = BuildingElement(
            name="Floor", layers=list(floor_layers), area=self.floor_area(),
            is_ground_contact=True, tilt_deg=180.0,
        )

    def envelope_elements(self) -> List[BuildingElement]:
        return list(self.walls.values()) + [self.roof, self.floor]
