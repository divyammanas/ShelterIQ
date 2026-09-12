import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { MaterialDatabase, syntheticLadakhWinter, simulate, designScore, parseCSV, LCG } from '../services/physicsEngine';
const AppContext = createContext(undefined);
const ASSEMBLY_STORAGE_KEY = 'shelterIQ_saved_assemblies';
export const AppProvider = ({ children }) => {
    const mdb = React.useMemo(() => new MaterialDatabase(), []);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('shelterIQ_theme');
        return saved !== null ? saved === 'dark' : true;
    });
    const [savedAssemblies, setSavedAssemblies] = useState(() => {
        try {
            const stored = localStorage.getItem(ASSEMBLY_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    });
    const [wallLayers, setWallLayers] = useState([
        { material: mdb.get("stone_granite"), thickness: 0.30 },
        { material: mdb.get("eps_insulation"), thickness: 0.10 }
    ]);
    const [roofLayers, setRoofLayers] = useState([
        { material: mdb.get("stone_granite"), thickness: 0.15 },
        { material: mdb.get("eps_insulation"), thickness: 0.12 }
    ]);
    const [floorLayers, setFloorLayers] = useState([
        { material: mdb.get("stone_granite"), thickness: 0.20 }
    ]);
    const [thermalMassType, setThermalMassType] = useState("water_drums");
    const [thermalMassQty, setThermalMassQty] = useState(2);
    const [addedMasses, setAddedMasses] = useState([
        { name: "2x Water drums", material: mdb.get("water"), volume_m3: 0.6 }
    ]);
    const [shelter, setShelter] = useState({
        length: 6.0,
        width: 4.0,
        height: 2.6,
        shape: "flat_roof_box",
        orientation_deg: 180.0,
        roof_pitch_deg: 20.0,
        ach: 0.6,
        openings: [
            { name: "South Window", width: 1.6, height: 1.2, area: 1.92, glazing: mdb.get("glass_double_lowE"), shgc: 0.55, orientation_deg: 180.0, is_door: false },
            { name: "Entry Door", width: 0.9, height: 2.0, area: 1.8, is_door: true, u_value_override: 1.8, orientation_deg: 180.0, shgc: 0.0 }
        ],
        walls: { N: [], E: [], S: [], W: [] },
        roof: [],
        floor: []
    });
    const [comfortBand, setComfortBand] = useState({
        t_min: 16.0,
        t_max: 26.0,
        t_marginal_low: 8.0,
        t_marginal_high: 30.0
    });
    const [climateParams, setClimateParams] = useState({
        latitude: 34.0,
        tMean: -8.0,
        tAmp: 9.0,
        ghiPeak: 650,
        windMean: 3.5,
        rhMean: 35,
        cloudMean: 15
    });
    const [climate, setClimate] = useState(() => syntheticLadakhWinter(72, 0.5, -8.0, 9.0, 650, 3.5, 35, 15));
    const [simDuration, setSimDurationState] = useState(72);
    const [simTimestep, setSimTimestepState] = useState(0.5);
    const [internalGains, setInternalGains] = useState(100.0);
    const [heatingEnabled, setHeatingEnabled] = useState(false);
    const [heatingSetpoint, setHeatingSetpoint] = useState(16.0);
    const [T_air0, setT_air0] = useState(-2.0);
    const [T_mass0, setT_mass0] = useState(-2.0);
    const [simResult, setSimResult] = useState(null);
    const [activeHour, setActiveHour] = useState(12);
    const [isSimulating, setIsSimulating] = useState(false);
    const [optResults, setOptResults] = useState([]);
    const [optLogs, setOptLogs] = useState("Waiting to execute optimizer search space...");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [loadedPreset, setLoadedPreset] = useState(null);
    useEffect(() => {
        localStorage.setItem('shelterIQ_theme', isDarkMode ? 'dark' : 'light');
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
        }
        else {
            root.classList.remove('dark');
        }
    }, [isDarkMode]);
    useEffect(() => {
        localStorage.setItem(ASSEMBLY_STORAGE_KEY, JSON.stringify(savedAssemblies));
    }, [savedAssemblies]);
    useEffect(() => {
        if (simResult && simResult.t_hours.length > 0) {
            const maxH = simResult.t_hours[simResult.t_hours.length - 1];
            if (activeHour > maxH) {
                setActiveHour(maxH);
            }
        }
    }, [simResult]);
    useEffect(() => {
        setShelter(prev => {
            const updatedWalls = {
                N: JSON.parse(JSON.stringify(wallLayers)),
                E: JSON.parse(JSON.stringify(wallLayers)),
                S: JSON.parse(JSON.stringify(wallLayers)),
                W: JSON.parse(JSON.stringify(wallLayers))
            };
            return {
                ...prev,
                walls: updatedWalls,
                roof: JSON.parse(JSON.stringify(roofLayers)),
                floor: JSON.parse(JSON.stringify(floorLayers))
            };
        });
    }, [wallLayers, roofLayers, floorLayers]);
    const setSimDuration = (val) => {
        setSimDurationState(val);
        setClimate(syntheticLadakhWinter(val, simTimestep, climateParams.tMean, climateParams.tAmp, climateParams.ghiPeak, climateParams.windMean, climateParams.rhMean, climateParams.cloudMean));
    };
    const setSimTimestep = (val) => {
        const nextTimestep = Number(val);
        if (!Number.isFinite(nextTimestep) || nextTimestep <= 0)
            return;
        setSimTimestepState(nextTimestep);
        setClimate(syntheticLadakhWinter(simDuration, nextTimestep, climateParams.tMean, climateParams.tAmp, climateParams.ghiPeak, climateParams.windMean, climateParams.rhMean, climateParams.cloudMean));
    };
    const updateClimateParams = (updates) => {
        setClimateParams(prev => {
            const next = { ...prev, ...updates };
            setClimate(syntheticLadakhWinter(simDuration, simTimestep, next.tMean, next.tAmp, next.ghiPeak, next.windMean, next.rhMean, next.cloudMean));
            return next;
        });
    };
    const updateShelterOpenings = (width, height, shgc, glazingKey) => {
        setShelter(prev => {
            const openings = [...prev.openings];
            const winIdx = openings.findIndex(o => !o.is_door);
            if (winIdx !== -1) {
                openings[winIdx] = {
                    ...openings[winIdx],
                    width,
                    height,
                    area: width * height,
                    shgc,
                    glazing: mdb.get(glazingKey)
                };
            }
            return { ...prev, openings };
        });
    };
    const updateThermalMass = (type, qty) => {
        setThermalMassType(type);
        setThermalMassQty(qty);
        if (type === "none") {
            setAddedMasses([]);
        }
        else if (type === "water_drums") {
            setAddedMasses([{
                    name: `${qty.toFixed(0)}x Water drums`,
                    material: mdb.get("water"),
                    volume_m3: qty * 0.3
                }]);
        }
        else if (type === "concrete_wall") {
            setAddedMasses([{
                    name: `Concrete partition (${qty.toFixed(1)}m)`,
                    material: mdb.get("concrete_dense"),
                    volume_m3: qty * 2.0 * 0.15
                }]);
        }
        else if (type === "pcm_panels") {
            setAddedMasses([{
                    name: `PCM panels (${qty.toFixed(0)}m²)`,
                    material: mdb.get("pcm_rt21"),
                    volume_m3: qty * 0.02
                }]);
        }
    };
    const saveAssembly = (name) => {
        const isFromPreset = loadedPreset && !loadedPreset.isModified && loadedPreset.score != null;
        const defaultName = isFromPreset
            ? `Preset #${Number(loadedPreset.id ?? 0) + 1} (${Number(loadedPreset.score).toFixed(1)})`
            : `Assembly ${savedAssemblies.length + 1}`;
        const assembly = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: name.trim() || defaultName,
            savedAt: new Date().toISOString(),
            shelter: JSON.parse(JSON.stringify({ ...shelter, walls: { N: wallLayers, E: wallLayers, S: wallLayers, W: wallLayers }, roof: roofLayers, floor: floorLayers })),
            wallLayers: JSON.parse(JSON.stringify(wallLayers)),
            roofLayers: JSON.parse(JSON.stringify(roofLayers)),
            floorLayers: JSON.parse(JSON.stringify(floorLayers)),
            addedMasses: JSON.parse(JSON.stringify(addedMasses)),
            climateParams: { ...climateParams },
            presetScore: isFromPreset ? Number(loadedPreset.score) : (simResult?.design_score ? Number(simResult.design_score.toFixed(1)) : null),
            presetId: isFromPreset ? loadedPreset.id : null,
        };
        setSavedAssemblies(prev => [...prev, assembly]);
    };
    const removeAssembly = (id) => {
        setSavedAssemblies(prev => prev.filter(assembly => assembly.id !== id));
    };
    const runActiveSimulation = async (customShelter, customWalls, customRoof, customFloor, overrideScore) => {
        setIsSimulating(true);
        const w = customWalls || wallLayers;
        const r = customRoof || roofLayers;
        const f = customFloor || floorLayers;
        const s = customShelter || shelter;

        const activeWalls = {};
        const faces = ['N', 'E', 'S', 'W'];
        faces.forEach(face => {
            activeWalls[face] = w.map(l => ({
                material: { ...l.material },
                thickness: l.thickness
            }));
        });
        const shelterPayload = {
            length: s.length,
            width: s.width,
            height: s.height,
            shape: s.shape,
            orientation_deg: s.orientation_deg,
            roof_pitch_deg: s.roof_pitch_deg,
            ach: s.ach,
            walls: activeWalls,
            roof: r.map(l => ({ material: { ...l.material }, thickness: l.thickness })),
            floor: f.map(l => ({ material: { ...l.material }, thickness: l.thickness })),
            openings: s.openings.map(o => ({
                name: o.name,
                width: o.width,
                height: o.height,
                glazing: o.glazing ? { ...o.glazing } : { name: "Single Glazing", k: 1.0, rho: 2500, cp: 840 },
                shgc: o.shgc,
                orientation_deg: o.orientation_deg,
                is_door: o.is_door,
                u_value_override: o.u_value_override
            }))
        };
        const addedMassesPayload = addedMasses.map(am => ({
            name: am.name,
            material: { ...am.material },
            volume_m3: am.volume_m3
        }));
        const climatePayload = {
            t_hours: climate.t_hours,
            T_out: climate.T_out,
            ghi: climate.ghi,
            wind: climate.wind,
            rh: climate.rh,
            cloud: climate.cloud
        };
        const settingsPayload = {
            duration: simDuration,
            timestep: simTimestep,
            T_air0,
            T_mass0,
            internal_gains: internalGains,
            heating_enabled: heatingEnabled,
            heating_setpoint: heatingSetpoint
        };
        try {
            const res = await axios.post('/api/simulate', {
                shelter: shelterPayload,
                climate: climatePayload,
                settings: settingsPayload,
                added_masses: addedMassesPayload
            });
            const data = res.data;
            if (overrideScore != null) {
                data.design_score = Number(overrideScore);
            }
            setSimResult(data);
        }
        catch (err) {
            console.warn("FastAPI backend simulate request failed, falling back to local JS solver:", err);
            const localResult = simulate({
                ...s,
                walls: { N: w, E: w, S: w, W: w },
                roof: r,
                floor: f
            }, climate, simTimestep, addedMasses, internalGains, comfortBand, heatingEnabled ? heatingSetpoint : 16.0, T_air0, T_mass0);
            if (overrideScore != null) {
                localResult.design_score = Number(overrideScore);
            }
            setSimResult(localResult);
        }
        finally {
            setIsSimulating(false);
        }
    };
    const runOptimizationMC = async () => {
        setIsOptimizing(true);
        setOptLogs("Initiating design search space optimization...\n");
        const activeWalls = {};
        const faces = ['N', 'E', 'S', 'W'];
        faces.forEach(face => {
            activeWalls[face] = wallLayers.map(l => ({
                material: { ...l.material },
                thickness: l.thickness
            }));
        });
        const shelterPayload = {
            length: shelter.length,
            width: shelter.width,
            height: shelter.height,
            shape: shelter.shape,
            orientation_deg: shelter.orientation_deg,
            roof_pitch_deg: shelter.roof_pitch_deg,
            ach: shelter.ach,
            walls: activeWalls,
            roof: roofLayers.map(l => ({ material: { ...l.material }, thickness: l.thickness })),
            floor: floorLayers.map(l => ({ material: { ...l.material }, thickness: l.thickness })),
            openings: shelter.openings.map(o => ({
                name: o.name,
                width: o.width,
                height: o.height,
                glazing: o.glazing ? { ...o.glazing } : { name: "Single Glazing", k: 1.0, rho: 2500, cp: 840 },
                shgc: o.shgc,
                orientation_deg: o.orientation_deg,
                is_door: o.is_door,
                u_value_override: o.u_value_override
            }))
        };
        const climatePayload = {
            t_hours: climate.t_hours,
            T_out: climate.T_out,
            ghi: climate.ghi,
            wind: climate.wind,
            rh: climate.rh,
            cloud: climate.cloud
        };
        const settingsPayload = {
            duration: simDuration,
            timestep: simTimestep,
            T_air0,
            T_mass0,
            internal_gains: internalGains,
            heating_enabled: heatingEnabled,
            heating_setpoint: heatingSetpoint
        };
        try {
            setOptLogs(prev => prev + "Contacting server-side optimizer API...\n");
            const res = await axios.post('/api/optimize', {
                shelter: shelterPayload,
                climate: climatePayload,
                settings: settingsPayload,
                n_random: 35
            });
            setOptResults(res.data);
            setOptLogs(prev => prev + "Backend Optimization Complete! Best Score: " + res.data[0].score.toFixed(1) + "\n");
        }
        catch (err) {
            console.warn("Backend optimization API failed. Falling back to local Monte Carlo simulation...");
            setOptLogs(prev => prev + "Backend failed. Running local Monte Carlo search...\n");
            const optSpace = {
                insulations: ["eps_insulation", "xps_insulation", "mineral_wool"],
                thicknesses: [0.05, 0.10, 0.15],
                structures: ["stone_granite", "rammed_earth", "concrete_light"],
                struct_thicknesses: [0.20, 0.30],
                orientations: [180.0, 160.0, 200.0],
                window_fractions: [0.10, 0.15, 0.20],
                ach_options: [0.3, 0.5, 0.7]
            };
            const sampleSize = 35;
            const candidates = [];
            const rng = LCG(7);
            let stepLogs = "";
            for (let step = 0; step < sampleSize; step++) {
                const ins = optSpace.insulations[Math.floor(rng() * optSpace.insulations.length)];
                const thick = optSpace.thicknesses[Math.floor(rng() * optSpace.thicknesses.length)];
                const struct = optSpace.structures[Math.floor(rng() * optSpace.structures.length)];
                const sthick = optSpace.struct_thicknesses[Math.floor(rng() * optSpace.struct_thicknesses.length)];
                const orient = optSpace.orientations[Math.floor(rng() * optSpace.orientations.length)];
                const win_f = optSpace.window_fractions[Math.floor(rng() * optSpace.window_fractions.length)];
                const ach_val = optSpace.ach_options[Math.floor(rng() * optSpace.ach_options.length)];
                const wall_l = [
                    { material: mdb.get(struct), thickness: sthick },
                    { material: mdb.get(ins), thickness: thick }
                ];
                const roof_l = [
                    { material: mdb.get(struct), thickness: Math.max(sthick * 0.6, 0.05) },
                    { material: mdb.get(ins), thickness: thick }
                ];
                const floor_l = [
                    { material: mdb.get(struct), thickness: sthick }
                ];
                const south_wall_area = shelter.length * shelter.height;
                const win_area = Math.max(south_wall_area * win_f, 0.1);
                const win_w = Math.min(Math.sqrt(win_area), shelter.length * 0.8);
                const win_h = win_area / win_w;
                const candOpenings = [
                    { name: "South Window", width: win_w, height: win_h, area: win_w * win_h, glazing: mdb.get("glass_double_lowE"), shgc: 0.55, orientation_deg: 180.0, is_door: false },
                    { name: "Entry Door", width: 0.9, height: 2.0, area: 1.8, is_door: true, u_value_override: 1.8, orientation_deg: orient, shgc: 0.0 }
                ];
                const mockShelter = {
                    length: shelter.length,
                    width: shelter.width,
                    height: shelter.height,
                    shape: shelter.shape,
                    orientation_deg: orient,
                    roof_pitch_deg: shelter.roof_pitch_deg,
                    ach: ach_val,
                    openings: candOpenings,
                    walls: { N: wall_l, E: wall_l, S: wall_l, W: wall_l },
                    roof: roof_l,
                    floor: floor_l
                };
                const res = simulate(mockShelter, climate, simTimestep, addedMasses, internalGains, comfortBand, 16.0, T_air0, T_mass0);
                const score = designScore(res, simDuration);
                candidates.push({
                    score,
                    params: { ins, thick, struct, sthick, orient, win_f, ach_val }
                });
                stepLogs += `Iter #${step + 1}: ${struct}(${Math.round(sthick * 100)}cm) + ${ins}(${Math.round(thick * 100)}cm) -> Score: ${score.toFixed(1)}\n`;
            }
            candidates.sort((a, b) => b.score - a.score);
            const top5 = candidates.slice(0, 5);
            setOptResults(top5);
            setOptLogs(prev => prev + stepLogs + `\nLocal Optimization Complete! Best Score: ${top5[0].score.toFixed(1)}\n`);
        }
        finally {
            setIsOptimizing(false);
        }
    };
    const loadDesignPreset = (p, presetMeta = {}) => {
        const structMat = mdb.get(p.struct);
        const insMat = mdb.get(p.ins);
        const newWall = [
            { material: structMat, thickness: p.sthick },
            { material: insMat, thickness: p.thick }
        ];
        const newRoof = [
            { material: structMat, thickness: Math.max(Number((p.sthick * 0.6).toFixed(2)), 0.05) },
            { material: insMat, thickness: p.thick }
        ];
        const newFloor = [
            { material: structMat, thickness: p.sthick }
        ];
        setWallLayers(newWall);
        setRoofLayers(newRoof);
        setFloorLayers(newFloor);
        const south_wall_area = shelter.length * shelter.height;
        const win_area = Math.max(south_wall_area * p.win_f, 0.1);
        const win_w = Number(Math.min(Math.sqrt(win_area), shelter.length * 0.8).toFixed(2));
        const win_h = Number((win_area / win_w).toFixed(2));
        const newOpenings = [
            { name: "South Window", width: win_w, height: win_h, area: Number((win_w * win_h).toFixed(2)), glazing: mdb.get("glass_double_lowE"), shgc: 0.55, orientation_deg: 180.0, is_door: false },
            { name: "Entry Door", width: 0.9, height: 2.0, area: 1.8, is_door: true, u_value_override: 1.8, orientation_deg: p.orient, shgc: 0.0 }
        ];
        const newShelter = {
            ...shelter,
            orientation_deg: p.orient,
            ach: p.ach_val,
            openings: newOpenings,
            walls: {
                N: JSON.parse(JSON.stringify(newWall)),
                E: JSON.parse(JSON.stringify(newWall)),
                S: JSON.parse(JSON.stringify(newWall)),
                W: JSON.parse(JSON.stringify(newWall))
            },
            roof: JSON.parse(JSON.stringify(newRoof)),
            floor: JSON.parse(JSON.stringify(newFloor))
        };
        setShelter(newShelter);

        const meta = {
            id: presetMeta.id !== undefined ? presetMeta.id : null,
            score: presetMeta.score !== undefined ? presetMeta.score : null,
            params: { ...p },
            isModified: false,
            loadedAt: Date.now()
        };
        setLoadedPreset(meta);

        const structName = structMat?.name || p.struct;
        const insName = insMat?.name || p.ins;
        const presetNumStr = meta.id !== null ? `Preset #${Number(meta.id) + 1}` : 'Custom Preset';
        setOptLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] ✓ Loaded ${presetNumStr}: ${structName} (${Math.round(p.sthick * 100)}cm) + ${insName} (${Math.round(p.thick * 100)}cm) | Orient: ${p.orient}° | Win: ${Math.round(p.win_f * 100)}% | ACH: ${p.ach_val}\n`);

        runActiveSimulation(newShelter, newWall, newRoof, newFloor, meta.score != null ? Number(meta.score) : undefined);
    };
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await axios.get('/optimization_results.csv');
                const rows = parseCSV(res.data);
                if (rows.length > 0) {
                    const parsed = rows.map(r => {
                        const designStr = String(r.design ?? "");
                        const params = {
                            struct: "stone_granite",
                            sthick: 0.3,
                            ins: "xps_insulation",
                            thick: 0.1,
                            orient: 180,
                            win_f: 0.15,
                            ach_val: 0.5
                        };
                        const matMatch = designStr.match(/^([a-zA-Z_]+)\((\d+)cm\)\+([a-zA-Z_]+)\((\d+)cm\)/);
                        if (matMatch) {
                            params.struct = matMatch[1];
                            params.sthick = parseFloat(matMatch[2]) / 100.0;
                            params.ins = matMatch[3];
                            params.thick = parseFloat(matMatch[4]) / 100.0;
                        }
                        const orientMatch = designStr.match(/orient=(\d+)/);
                        if (orientMatch)
                            params.orient = parseFloat(orientMatch[1]);
                        const winMatch = designStr.match(/win=(\d+)%/);
                        if (winMatch)
                            params.win_f = parseFloat(winMatch[1]) / 100.0;
                        const achMatch = designStr.match(/ACH=([\d\.]+)/);
                        if (achMatch)
                            params.ach_val = parseFloat(achMatch[1]);
                        return {
                            score: Number(r.score ?? r.design_score ?? 0.0),
                            params
                        };
                    });
                    setOptResults(parsed);
                    console.log("Loaded initial optimization picks from CSV successfully.");
                }
            }
            catch (e) {
                console.warn("Could not fetch optimization_results.csv from server. Using local defaults.");
                setOptResults([
                    { score: 79.6, params: { ins: "xps_insulation", thick: 0.15, struct: "stone_granite", sthick: 0.30, orient: 200, win_f: 0.10, ach_val: 0.5 } },
                    { score: 78.6, params: { ins: "eps_insulation", thick: 0.15, struct: "concrete_light", sthick: 0.20, orient: 180, win_f: 0.20, ach_val: 0.5 } },
                    { score: 78.6, params: { ins: "xps_insulation", thick: 0.15, struct: "rammed_earth", sthick: 0.20, orient: 200, win_f: 0.20, ach_val: 0.3 } },
                    { score: 78.4, params: { ins: "eps_insulation", thick: 0.15, struct: "concrete_light", sthick: 0.20, orient: 200, win_f: 0.20, ach_val: 0.5 } },
                    { score: 78.2, params: { ins: "xps_insulation", thick: 0.10, struct: "rammed_earth", sthick: 0.30, orient: 200, win_f: 0.10, ach_val: 0.5 } }
                ]);
            }
        };
        fetchInitialData();
    }, []);
    useEffect(() => {
        runActiveSimulation();
    }, []);
    return (<AppContext.Provider value={{
            mdb,
            savedAssemblies,
            saveAssembly,
            removeAssembly,
            wallLayers,
            setWallLayers,
            roofLayers,
            setRoofLayers,
            floorLayers,
            setFloorLayers,
            shelter,
            setShelter,
            updateShelterOpenings,
            updateThermalMass,
            thermalMassType,
            setThermalMassType,
            thermalMassQty,
            setThermalMassQty,
            addedMasses,
            setAddedMasses,
            comfortBand,
            setComfortBand,
            climate,
            setClimate,
            climateParams,
            updateClimateParams,
            simDuration,
            setSimDuration,
            simTimestep,
            setSimTimestep,
            internalGains,
            setInternalGains,
            heatingEnabled,
            setHeatingEnabled,
            heatingSetpoint,
            setHeatingSetpoint,
            T_air0,
            setT_air0,
            T_mass0,
            setT_mass0,
            simResult,
            activeHour,
            setActiveHour,
            isSimulating,
            optResults,
            setOptResults,
            optLogs,
            setOptLogs,
            isOptimizing,
            runActiveSimulation,
            runOptimizationMC,
            loadDesignPreset,
            loadedPreset,
            setLoadedPreset,
            isDarkMode,
            setIsDarkMode
        }}>
      {children}
    </AppContext.Provider>);
};
export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
