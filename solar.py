"""
solar.py — Simplified solar-on-surface and sol-air temperature.

Uses a simplified isotropic-sky model to split GHI into a component on a
tilted/oriented surface, given hour-of-day (assumes sun roughly south at
solar noon, standard for northern-hemisphere sites like Ladakh, 34N).
No full solar-position (declination/hour-angle) library dependency needed
for a first accuracy pass; swap in pvlib later for production-grade angles.
"""

import numpy as np

LADAKH_LAT_DEG = 34.0


def surface_irradiance(ghi: float, hod: float, surface_orientation_deg: float,
                        surface_tilt_deg: float, cloud_pct: float = 0.0,
                        latitude_deg: float = LADAKH_LAT_DEG) -> float:
    """
    Approximate irradiance on an arbitrary tilted/oriented surface [W/m2].

    Splits GHI into beam (assumed sun position by hour-angle) + diffuse
    (isotropic sky, ~15% of GHI at this dry high-altitude site), projects
    beam onto the surface normal via a simplified incidence-angle cosine,
    and derates for cloud cover.
    """
    if ghi <= 0:
        return 0.0

    # crude sun position: hour angle from solar noon (15 deg/hr), fixed
    # declination for a winter design period (~ -20 deg, Ladakh winter)
    hour_angle_deg = 15.0 * (hod - 12.0)
    declination_deg = -20.0
    lat = np.radians(latitude_deg)
    decl = np.radians(declination_deg)
    ha = np.radians(hour_angle_deg)

    sin_alt = np.sin(lat) * np.sin(decl) + np.cos(lat) * np.cos(decl) * np.cos(ha)
    sin_alt = np.clip(sin_alt, 0.001, 1.0)
    solar_altitude = np.arcsin(sin_alt)

    # solar azimuth (0=N,90=E,180=S,270=W), simplified
    cos_az = (np.sin(decl) - np.sin(lat) * sin_alt) / (np.cos(lat) * np.cos(solar_altitude) + 1e-9)
    cos_az = np.clip(cos_az, -1, 1)
    solar_azimuth = 180.0 + np.degrees(np.sign(ha) * np.arccos(cos_az)) if ha != 0 else 180.0

    diffuse_frac = 0.15
    beam = ghi * (1 - diffuse_frac)
    diffuse = ghi * diffuse_frac

    tilt = np.radians(surface_tilt_deg)
    surf_az = np.radians(surface_orientation_deg)
    sun_az = np.radians(solar_azimuth)

    cos_incidence = (np.sin(solar_altitude) * np.cos(tilt) +
                      np.cos(solar_altitude) * np.sin(tilt) * np.cos(sun_az - surf_az))
    cos_incidence = np.clip(cos_incidence, 0.0, 1.0)

    beam_on_surface = beam * cos_incidence
    diffuse_on_surface = diffuse * (1 + np.cos(tilt)) / 2.0  # sky-view factor

    total = beam_on_surface + diffuse_on_surface
    cloud_derate = 1.0 - 0.75 * (cloud_pct / 100.0)
    return max(total * cloud_derate, 0.0)


def sol_air_temperature(T_out: float, irradiance_on_surface: float,
                         alpha: float, h_out: float = 22.0,
                         is_horizontal: bool = False,
                         long_wave_correction: float = 0.0) -> float:
    """
    Sol-air temperature [C] — the fictitious outdoor temperature that
    would produce the same heat flow into an opaque surface as the
    combined effect of actual T_out + absorbed solar radiation
    (ASHRAE method): T_sol-air = T_out + alpha*I/h_out - dR/h_out

    long_wave_correction (dR term, ~4 C typical for horizontal roofs at
    night due to sky radiative loss) applied for roofs facing clear sky.
    """
    lw = long_wave_correction if is_horizontal else 0.0
    return T_out + (alpha * irradiance_on_surface / h_out) - lw
