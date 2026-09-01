import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { 
  type Layer, 
  type Shelter, 
  type ClimateSeries, 
  type ComfortBand, 
  type AddedMass, 
  type SimulationResult,
  MaterialDatabase,
  syntheticLadakhWinter,
  simulate,
  designScore,
  parseCSV,
  LCG
} from '../services/physicsEngine';

export interface SavedDesign {
  name: string;
  score: number;
  min_T: number;
  max_T: number;
  comfort_h: number;
  heating_energy: number;
  conduction_loss: number;
}

export interface OptResult {
  score: number;
  params: {
    ins: string;
    thick: number;
    struct: string;
    sthick: number;
    orient: number;
    win_f: number;
    ach_val: number;
  };
}

interface AppContextType {
  mdb: MaterialDatabase;
  savedDesigns: SavedDesign[];
  setSavedDesigns: React.Dispatch<React.SetStateAction<SavedDesign[]>>;
  
  // Envelope Layers
  wallLayers: Layer[];
  setWallLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  roofLayers: Layer[];
  setRoofLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  floorLayers: Layer[];
  setFloorLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  
  // Shelter
  shelter: Shelter;
  setShelter: React.Dispatch<React.SetStateAction<Shelter>>;
  updateShelterOpenings: (width: number, height: number, shgc: number, glazingKey: string) => void;
  updateThermalMass: (type: string, qty: number) => void;
  thermalMassType: string;
  setThermalMassType: (type: string) => void;
  thermalMassQty: number;
  setThermalMassQty: (qty: number) => void;

  addedMasses: AddedMass[];
  setAddedMasses: React.Dispatch<React.SetStateAction<AddedMass[]>>;
  
  // Comfort Band
  comfortBand: ComfortBand;
  setComfortBand: React.Dispatch<React.SetStateAction<ComfortBand>>;
  
  // Climate
  climate: ClimateSeries;
  setClimate: React.Dispatch<React.SetStateAction<ClimateSeries>>;
  climateParams: {
    latitude: number;
    tMean: number;
    tAmp: number;
    ghiPeak: number;
    windMean: number;
    rhMean: number;
    cloudMean: number;
  };
  updateClimateParams: (updates: Partial<{
    latitude: number;
    tMean: number;
    tAmp: number;
    ghiPeak: number;
    windMean: number;
    rhMean: number;
    cloudMean: number;
  }>) => void;
  importClimateCSV: (csvText: string) => void;
  
  // Simulation Settings
  simDuration: number;
  setSimDuration: (val: number) => void;
  simTimestep: number;
  setSimTimestep: (val: number) => void;
  internalGains: number;
  setInternalGains: (val: number) => void;
  heatingEnabled: boolean;
  setHeatingEnabled: (val: boolean) => void;
  heatingSetpoint: number;
  setHeatingSetpoint: (val: number) => void;
  T_air0: number;
  setT_air0: (val: number) => void;
  T_mass0: number;
  setT_mass0: (val: number) => void;
  
  // Active state
  simResult: SimulationResult | null;
  activeHour: number;
  setActiveHour: React.Dispatch<React.SetStateAction<number>>;
  isSimulating: boolean;
  
  // Optimization
  optResults: OptResult[];
  setOptResults: React.Dispatch<React.SetStateAction<OptResult[]>>;
  optLogs: string;
  setOptLogs: React.Dispatch<React.SetStateAction<string>>;
  isOptimizing: boolean;
  
  // Actions
  runActiveSimulation: () => Promise<void>;
  runOptimizationMC: () => Promise<void>;
  addDesignToPortfolio: (name?: string) => void;
  loadDesignPreset: (params: OptResult['params']) => void;
  
  // Theme
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mdb = React.useMemo(() => new MaterialDatabase(), []);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('shelterIQ_theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  
  // Envelope Layers
  const [wallLayers, setWallLayers] = useState<Layer[]>([
    { material: mdb.get("stone_granite"), thickness: 0.30 },
    { material: mdb.get("eps_insulation"), thickness: 0.10 }
  ]);
  const [roofLayers, setRoofLayers] = useState<Layer[]>([
    { material: mdb.get("stone_granite"), thickness: 0.15 },
    { material: mdb.get("eps_insulation"), thickness: 0.12 }
  ]);
  const [floorLayers, setFloorLayers] = useState<Layer[]>([
    { material: mdb.get("stone_granite"), thickness: 0.20 }
  ]);
  
  // Thermal mass selection states
  const [thermalMassType, setThermalMassType] = useState<string>("water_drums");
  const [thermalMassQty, setThermalMassQty] = useState<number>(2);
  const [addedMasses, setAddedMasses] = useState<AddedMass[]>([
    { name: "2x Water drums", material: mdb.get("water"), volume_m3: 0.6 }
  ]);
  
  // Shelter
  const [shelter, setShelter] = useState<Shelter>({
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
  
  // Comfort Band
  const [comfortBand, setComfortBand] = useState<ComfortBand>({
    t_min: 16.0,
    t_max: 26.0,
    t_marginal_low: 8.0,
    t_marginal_high: 30.0
  });
  
  // Climate Params & State
  const [climateParams, setClimateParams] = useState({
    latitude: 34.0,
    tMean: -8.0,
    tAmp: 9.0,
    ghiPeak: 650,
    windMean: 3.5,
    rhMean: 35,
    cloudMean: 15
  });
  
  const [climate, setClimate] = useState<ClimateSeries>(() => 
    syntheticLadakhWinter(72, 0.5, -8.0, 9.0, 650, 3.5, 35, 15)
  );
  
  // Simulation Settings
  const [simDuration, setSimDurationState] = useState<number>(72);
  const [simTimestep, setSimTimestep] = useState<number>(0.5);
  const [internalGains, setInternalGains] = useState<number>(100.0);
  const [heatingEnabled, setHeatingEnabled] = useState<boolean>(false);
  const [heatingSetpoint, setHeatingSetpoint] = useState<number>(16.0);
  const [T_air0, setT_air0] = useState<number>(-2.0);
  const [T_mass0, setT_mass0] = useState<number>(-2.0);
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [activeHour, setActiveHour] = useState<number>(12);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  // Optimization
  const [optResults, setOptResults] = useState<OptResult[]>([]);
  const [optLogs, setOptLogs] = useState<string>("Waiting to execute optimizer search space...");
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Sync dark mode class on html tag and localStorage
  useEffect(() => {
    localStorage.setItem('shelterIQ_theme', isDarkMode ? 'dark' : 'light');
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Regulate activeHour slider range dynamically based on simulation result
  useEffect(() => {
    if (simResult && simResult.t_hours.length > 0) {
      const maxH = simResult.t_hours[simResult.t_hours.length - 1];
      if (activeHour > maxH) {
        setActiveHour(maxH);
      }
    }
  }, [simResult]);

  // Sync layers & thermal masses with the active shelter object representation
  useEffect(() => {
    setShelter(prev => {
      const updatedWalls: Shelter['walls'] = {
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

  // Update simulation duration updates climate series
  const setSimDuration = (val: number) => {
    setSimDurationState(val);
    setClimate(syntheticLadakhWinter(
      val, 
      simTimestep, 
      climateParams.tMean, 
      climateParams.tAmp, 
      climateParams.ghiPeak, 
      climateParams.windMean, 
      climateParams.rhMean, 
      climateParams.cloudMean
    ));
  };

  // Re-generate synthetic climate on parameters change
  const updateClimateParams = (updates: Partial<typeof climateParams>) => {
    setClimateParams(prev => {
      const next = { ...prev, ...updates };
      setClimate(syntheticLadakhWinter(
        simDuration, 
        simTimestep, 
        next.tMean, 
        next.tAmp, 
        next.ghiPeak, 
        next.windMean, 
        next.rhMean, 
        next.cloudMean
      ));
      return next;
    });
  };

  const importClimateCSV = (csvText: string) => {
    try {
      const rows = parseCSV(csvText);
      if (rows.length === 0) return;
      
      const t_hours = rows.map(r => Number(r.hour ?? r.time ?? 0));
      const T_out = rows.map(r => Number(r.T_out_C ?? r.temp ?? 0));
      const ghi = rows.map(r => Number(r.GHI_Wm2 ?? r.solar ?? 0));
      const wind = rows.map(r => Number(r.wind_ms ?? r.wind ?? 0));
      const rh = rows.map(r => Number(r.RH_pct ?? r.humidity ?? 0));
      const cloud = rows.map(r => Number(r.cloud_pct ?? r.cloud ?? 0));
      
      setClimate({ t_hours, T_out, ghi, wind, rh, cloud });
      setSimDurationState(Math.round(t_hours[t_hours.length - 1]));
      console.log("Loaded climate CSV containing " + t_hours.length + " timesteps.");
    } catch (err) {
      console.error("Invalid weather CSV file structure", err);
    }
  };

  // Handle south window opening dimensions/materials
  const updateShelterOpenings = (width: number, height: number, shgc: number, glazingKey: string) => {
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

  // Handle thermal mass inputs updates
  const updateThermalMass = (type: string, qty: number) => {
    setThermalMassType(type);
    setThermalMassQty(qty);
    if (type === "none") {
      setAddedMasses([]);
    } else if (type === "water_drums") {
      setAddedMasses([{
        name: `${qty.toFixed(0)}x Water drums`,
        material: mdb.get("water"),
        volume_m3: qty * 0.3
      }]);
    } else if (type === "concrete_wall") {
      setAddedMasses([{
        name: `Concrete partition (${qty.toFixed(1)}m)`,
        material: mdb.get("concrete_dense"),
        volume_m3: qty * 2.0 * 0.15
      }]);
    } else if (type === "pcm_panels") {
      setAddedMasses([{
        name: `PCM panels (${qty.toFixed(0)}m²)`,
        material: mdb.get("pcm_rt21"),
        volume_m3: qty * 0.02
      }]);
    }
  };

  // Run the core transient simulator
  const runActiveSimulation = async () => {
    setIsSimulating(true);
    
    // Build active shelter structure for payload
    const activeWalls: Record<string, any[]> = {};
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
      setSimResult(res.data);
    } catch (err) {
      console.warn("FastAPI backend simulate request failed, falling back to local JS solver:", err);
      const localResult = simulate(
        {
          ...shelter,
          walls: { N: wallLayers, E: wallLayers, S: wallLayers, W: wallLayers },
          roof: roofLayers,
          floor: floorLayers
        },
        climate,
        simTimestep,
        addedMasses,
        internalGains,
        comfortBand,
        heatingEnabled ? heatingSetpoint : null,
        T_air0,
        T_mass0
      );
      setSimResult(localResult);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run Monte Carlo Optimization
  const runOptimizationMC = async () => {
    setIsOptimizing(true);
    setOptLogs("Initiating design search space optimization...\n");
    
    // Payload structures
    const activeWalls: Record<string, any[]> = {};
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
    } catch (err) {
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
      const candidates: OptResult[] = [];
      const rng = LCG(7); // seeded LCG
      
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
        
        const mockShelter: Shelter = {
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
        
        const res = simulate(
          mockShelter,
          climate,
          simTimestep,
          addedMasses,
          internalGains,
          comfortBand,
          16.0,
          T_air0,
          T_mass0
        );
        
        const score = designScore(res, 72.0);
        candidates.push({
          score,
          params: { ins, thick, struct, sthick, orient, win_f, ach_val }
        });
        
        stepLogs += `Iter #${step+1}: ${struct}(${Math.round(sthick*100)}cm) + ${ins}(${Math.round(thick*100)}cm) -> Score: ${score.toFixed(1)}\n`;
      }
      
      candidates.sort((a, b) => b.score - a.score);
      const top5 = candidates.slice(0, 5);
      setOptResults(top5);
      setOptLogs(prev => prev + stepLogs + `\nLocal Optimization Complete! Best Score: ${top5[0].score.toFixed(1)}\n`);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Add current active design to portfolio
  const addDesignToPortfolio = (name?: string) => {
    if (!simResult) return;
    const designName = name || `Design Case ${savedDesigns.length + 1}`;
    
    // Integrate trapezoidal loss metrics for conduction
    let total_loss_kWh = 0;
    for (let k = 1; k < simResult.t_hours.length; k++) {
      const dt = simResult.t_hours[k] - simResult.t_hours[k-1];
      const lossVal = 0.5 * (simResult.conduction_loss_W[k] + simResult.conduction_loss_W[k-1]) * dt;
      total_loss_kWh += Math.max(lossVal, 0.0);
    }
    total_loss_kWh /= 1000.0;
    
    const newDesign: SavedDesign = {
      name: designName,
      score: designScore(simResult, simDuration),
      min_T: Number(simResult.min_T_air.toFixed(1)),
      max_T: Number(simResult.max_T_air.toFixed(1)),
      comfort_h: Number(simResult.comfort_summary_hours.comfortable.toFixed(1)),
      heating_energy: Number(simResult.heating_energy_kWh.toFixed(2)),
      conduction_loss: Number(total_loss_kWh.toFixed(2))
    };
    
    setSavedDesigns(prev => [...prev, newDesign]);
  };

  // Load an optimization preset into the active design canvas
  const loadDesignPreset = (p: OptResult['params']) => {
    // 1. Set materials assembly layers
    const structMat = mdb.get(p.struct);
    const insMat = mdb.get(p.ins);
    
    const newWall = [
      { material: structMat, thickness: p.sthick },
      { material: insMat, thickness: p.thick }
    ];
    const newRoof = [
      { material: structMat, thickness: Math.max(p.sthick * 0.6, 0.05) },
      { material: insMat, thickness: p.thick }
    ];
    const newFloor = [
      { material: structMat, thickness: p.sthick }
    ];
    
    setWallLayers(newWall);
    setRoofLayers(newRoof);
    setFloorLayers(newFloor);
    
    // 2. Openings
    const south_wall_area = shelter.length * shelter.height;
    const win_area = Math.max(south_wall_area * p.win_f, 0.1);
    const win_w = Math.min(Math.sqrt(win_area), shelter.length * 0.8);
    const win_h = win_area / win_w;
    
    setShelter(prev => ({
      ...prev,
      orientation_deg: p.orient,
      ach: p.ach_val,
      openings: [
        { name: "South Window", width: win_w, height: win_h, area: win_w * win_h, glazing: mdb.get("glass_double_lowE"), shgc: 0.55, orientation_deg: 180.0, is_door: false },
        { name: "Entry Door", width: 0.9, height: 2.0, area: 1.8, is_door: true, u_value_override: 1.8, orientation_deg: p.orient, shgc: 0.0 }
      ]
    }));
  };

  // Load initial portfolio CSVs or fall back to baseline arrays on startup
  useEffect(() => {
    const fetchInitialData = async () => {
      // 1. Load Portfolio Matrix
      try {
        const res = await axios.get('/comparison_table.csv');
        const rows = parseCSV(res.data);
        if (rows.length > 0) {
          const parsed = rows.map(r => ({
            name: String(r.design ?? r.name ?? "Unnamed Design"),
            score: Number(r.design_score ?? r.score ?? 0.0),
            min_T: Number(r.min_T_air_C ?? r.min_T ?? 0.0),
            max_T: Number(r.max_T_air_C ?? r.max_T ?? 0.0),
            comfort_h: Number(r.comfortable_h ?? r.comfort_h ?? 0.0),
            heating_energy: Number(r.estimated_heating_kWh ?? r.heating_energy ?? 0.0),
            conduction_loss: Number(r.total_heat_loss_kWh ?? 0.0)
          }));
          setSavedDesigns(parsed);
          console.log("Loaded initial portfolio CSV successfully.");
        }
      } catch (e) {
        console.warn("Could not fetch comparison_table.csv from server. Using fallback static design states.");
        setSavedDesigns([
          {
            name: "Baseline: Stone + EPS10cm",
            score: 74.7,
            min_T: 5.0,
            max_T: 16.0,
            comfort_h: 72.0,
            heating_energy: 98.47,
            conduction_loss: 100.07
          },
          {
            name: "Alt: Rammed Earth + XPS15cm, low ACH",
            score: 79.7,
            min_T: 5.0,
            max_T: 16.0,
            comfort_h: 72.0,
            heating_energy: 77.16,
            conduction_loss: 74.03
          }
        ]);
      }

      // 2. Load Optimization Picks
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
            if (orientMatch) params.orient = parseFloat(orientMatch[1]);
            const winMatch = designStr.match(/win=(\d+)%/);
            if (winMatch) params.win_f = parseFloat(winMatch[1]) / 100.0;
            const achMatch = designStr.match(/ACH=([\d\.]+)/);
            if (achMatch) params.ach_val = parseFloat(achMatch[1]);
            
            return {
              score: Number(r.score ?? r.design_score ?? 0.0),
              params
            };
          });
          setOptResults(parsed);
          console.log("Loaded initial optimization picks from CSV successfully.");
        }
      } catch (e) {
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

  // Run the baseline simulation immediately on startup
  useEffect(() => {
    runActiveSimulation();
  }, []);

  return (
    <AppContext.Provider value={{
      mdb,
      savedDesigns,
      setSavedDesigns,
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
      importClimateCSV,
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
      addDesignToPortfolio,
      loadDesignPreset,
      isDarkMode,
      setIsDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
