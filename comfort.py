"""
comfort.py — Comfort-band classification for indoor temperature.

Default band is tuned for passive cold-climate shelters (Ladakh-style),
where "comfort" is a survivable/liveable indoor band rather than strict
ASHRAE 55 (which assumes mechanical conditioning). Override for other
climates/use-cases.
"""

from dataclasses import dataclass


@dataclass
class ComfortBand:
    t_min: float = 18.0
    t_max: float = 26.0
    t_marginal_low: float = 12.0   # below this: cold-stress risk
    t_marginal_high: float = 30.0

    def classify(self, T: float) -> str:
        if self.t_min <= T <= self.t_max:
            return "comfortable"
        if self.t_marginal_low <= T < self.t_min or self.t_max < T <= self.t_marginal_high:
            return "marginal"
        return "uncomfortable"


def comfort_hours(temps, dt_h: float, band: ComfortBand) -> dict:
    counts = {"comfortable": 0.0, "marginal": 0.0, "uncomfortable": 0.0}
    for T in temps:
        counts[band.classify(T)] += dt_h
    return counts
