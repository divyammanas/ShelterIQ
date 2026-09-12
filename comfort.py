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
    t_min: float = 16.0
    t_max: float = 26.0
    t_marginal_low: float = 8.0   # below this: cold-stress risk
    t_marginal_high: float = 30.0

    def classify(self, T: float) -> str:
        if self.t_min - 0.05 <= T <= self.t_max + 0.05:
            return "comfortable"
        if (self.t_marginal_low - 0.05 <= T < self.t_min - 0.05) or (self.t_max + 0.05 < T <= self.t_marginal_high + 0.05):
            return "marginal"
        return "uncomfortable"


def comfort_hours(temps, dt_h: float, band: ComfortBand) -> dict:
    counts = {"comfortable": 0.0, "marginal": 0.0, "uncomfortable": 0.0}
    eval_temps = temps[1:] if len(temps) > 1 else temps
    for T in eval_temps:
        counts[band.classify(T)] += dt_h
    return counts
