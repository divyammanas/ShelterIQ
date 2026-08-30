import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useApp } from '../context/AppContext';

interface ThreeDShelterProps {
  viewMode: 'physical' | 'thermal';
  envelopeOpacity: number;
  visibilityStates: {
    roof: boolean;
    walls: boolean;
    floor: boolean;
    openings: boolean;
    mass: boolean;
    arrows: boolean;
  };
  isRotating: boolean;
}

export const ThreeDShelter: React.FC<ThreeDShelterProps> = ({
  viewMode,
  envelopeOpacity,
  visibilityStates,
  isRotating
}) => {
  const { 
    shelter, 
    simResult, 
    activeHour, 
    thermalMassType, 
    thermalMassQty 
  } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Three.js object references
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const shelterGroupRef = useRef<THREE.Group | null>(null);
  const arrowGroupRef = useRef<THREE.Group | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const sunBeamRef = useRef<THREE.Mesh | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  
  // Animation state
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<{ mesh: THREE.Mesh; origin: THREE.Vector3; destination: THREE.Vector3; t: number; speed: number }[]>([]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate navy background
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(9, 7, 10);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight, false);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // prevent going under ground
    controls.minDistance = 4;
    controls.maxDistance = 25;
    controls.autoRotate = isRotating;
    controlsRef.current = controls;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    dirLightRef.current = dirLight;
    
    // Sun representation
    const sunGeom = new THREE.SphereGeometry(0.4, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;
    
    // Sun light beam cylinder
    const beamGeom = new THREE.CylinderGeometry(0.015, 0.015, 1, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.25 });
    const sunBeam = new THREE.Mesh(beamGeom, beamMat);
    scene.add(sunBeam);
    sunBeamRef.current = sunBeam;
    
    // Ground Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);
    
    // Compass Circle
    const compassGeom = new THREE.RingGeometry(7.5, 7.6, 64);
    const compassMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.DoubleSide });
    const compass = new THREE.Mesh(compassGeom, compassMat);
    compass.rotation.x = Math.PI / 2;
    scene.add(compass);
    
    // Compass Labels
    createCompassLabel(scene, "N", 0, 0, -7.9, 0xef4444); // North is Red
    createCompassLabel(scene, "S", 0, 0, 7.9, 0x475569);
    createCompassLabel(scene, "E", 7.9, 0, 0, 0x475569);
    createCompassLabel(scene, "W", -7.9, 0, 0, 0x475569);
    
    // Groups for shelter meshes and dynamic arrows
    const shelterGroup = new THREE.Group();
    scene.add(shelterGroup);
    shelterGroupRef.current = shelterGroup;
    
    const arrowGroup = new THREE.Group();
    scene.add(arrowGroup);
    arrowGroupRef.current = arrowGroup;
    
    // Animation loop
    const animateScene = () => {
      animFrameIdRef.current = requestAnimationFrame(animateScene);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Dynamic particle flow animations
      if (particlesRef.current.length > 0) {
        particlesRef.current.forEach(p => {
          p.t += p.speed;
          if (p.t > 1.0) p.t = 0.0;
          p.mesh.position.copy(p.origin).lerp(p.destination, p.t);
        });
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animateScene();
    
    // Raycasting click logic for tooltip
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let startX = 0, startY = 0;
    
    const onMouseDown = (e: MouseEvent) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
        isDragging = true;
      }
    };
    
    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging && canvasRef.current && tooltipRef.current && cameraRef.current && shelterGroupRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(shelterGroupRef.current.children, true);
        
        if (intersects.length > 0) {
          let hitObj: THREE.Object3D | null = null;
          for (const hit of intersects) {
            if (hit.object.userData && hit.object.userData.name) {
              hitObj = hit.object;
              break;
            }
          }
          
          if (hitObj) {
            const u = hitObj.userData;
            tooltipRef.current.style.display = "block";
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            tooltipRef.current.style.left = `${Math.min(clickX + 15, rect.width - 240)}px`;
            tooltipRef.current.style.top = `${Math.min(clickY + 15, rect.height - 160)}px`;
            
            let heatFlowHtml = "";
            if (u.heatFlow !== undefined) {
              const flowVal = parseFloat(u.heatFlow);
              const color = flowVal > 0 ? "#f87171" : flowVal < 0 ? "#60a5fa" : "#34d399";
              const label = flowVal > 0 ? "Heat Loss" : flowVal < 0 ? "Heat Gain" : "Balanced";
              heatFlowHtml = `<div class="mb-1"><strong>Heat Flow:</strong> <span style="color:${color};font-weight:bold;">${Math.abs(flowVal).toFixed(0)} W (${label})</span></div>`;
            }
            
            tooltipRef.current.innerHTML = `
              <div class="font-bold border-b border-dashed border-blue-500 pb-1 mb-1.5 text-blue-400 uppercase text-[10px] tracking-wider">${u.name}</div>
              <div class="mb-1 text-zinc-300"><strong>Material:</strong> ${u.materialName}</div>
              ${u.thickness ? `<div class="mb-1 text-zinc-300"><strong>Thickness:</strong> ${u.thickness}</div>` : ""}
              <div class="mb-1 text-zinc-300"><strong>U-value:</strong> ${u.uValue} W/m²K</div>
              <div class="mb-1 text-zinc-300"><strong>Temperature:</strong> ${u.temp}</div>
              ${heatFlowHtml}
            `;
            return;
          }
        }
        tooltipRef.current.style.display = "none";
      }
    };
    
    const onMouseLeave = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };
    
    const canvas = canvasRef.current;
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    
    // Resize handler
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      rendererRef.current.setSize(width, height, false);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Sync rotation control setting
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating;
    }
  }, [isRotating]);

  // Rebuild shelter geometry when state details update
  useEffect(() => {
    rebuildGeometry();
  }, [
    shelter, 
    simResult, 
    activeHour, 
    viewMode, 
    envelopeOpacity, 
    visibilityStates, 
    thermalMassType, 
    thermalMassQty
  ]);

  const createCompassLabel = (scene: THREE.Scene, char: string, x: number, y: number, z: number, colorVal: number) => {
    const mat = new THREE.LineBasicMaterial({ color: colorVal, linewidth: 2 });
    const points: THREE.Vector3[] = [];
    
    if (char === "N") {
      points.push(new THREE.Vector3(-0.15, 0, -0.2));
      points.push(new THREE.Vector3(-0.15, 0, 0.2));
      points.push(new THREE.Vector3(-0.15, 0, 0.2));
      points.push(new THREE.Vector3(0.15, 0, -0.2));
      points.push(new THREE.Vector3(0.15, 0, -0.2));
      points.push(new THREE.Vector3(0.15, 0, 0.2));
    } else if (char === "S") {
      points.push(new THREE.Vector3(0.15, 0, -0.2));
      points.push(new THREE.Vector3(-0.15, 0, -0.2));
      points.push(new THREE.Vector3(-0.15, 0, 0));
      points.push(new THREE.Vector3(0.15, 0, 0));
      points.push(new THREE.Vector3(0.15, 0, 0.2));
      points.push(new THREE.Vector3(-0.15, 0, 0.2));
    } else if (char === "E") {
      points.push(new THREE.Vector3(0.15, 0, -0.2));
      points.push(new THREE.Vector3(-0.15, 0, -0.2));
      points.push(new THREE.Vector3(-0.15, 0, 0.2));
      points.push(new THREE.Vector3(0.15, 0, 0.2));
      
      const midMat = new THREE.LineBasicMaterial({ color: colorVal });
      const midGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.15, 0, 0),
        new THREE.Vector3(0.05, 0, 0)
      ]);
      const midLine = new THREE.Line(midGeom, midMat);
      midLine.position.set(x, y, z);
      scene.add(midLine);
    } else if (char === "W") {
      points.push(new THREE.Vector3(-0.18, 0, -0.2));
      points.push(new THREE.Vector3(-0.06, 0, 0.2));
      points.push(new THREE.Vector3(0, 0, -0.05));
      points.push(new THREE.Vector3(0.06, 0, 0.2));
      points.push(new THREE.Vector3(0.18, 0, -0.2));
    }
    
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geom, mat);
    line.position.set(x, y, z);
    scene.add(line);
  };

  const getMaterialColor = (material: any): number => {
    if (material.is_pcm) return 0xa855f7; // purple for PCM
    if (material.k < 0.05) {
      if (material.name.includes("XPS")) return 0x0ea5e9; // sky blue
      if (material.name.includes("Mineral")) return 0xeab308; // yellow-green
      return 0xe0f2fe; // light blue for EPS
    }
    if (material.name.includes("Stone") || material.name.includes("Granite")) return 0x475569; // slate
    if (material.name.includes("Rammed") || material.name.includes("Adobe") || material.name.includes("Brick")) return 0xb45309; // clay brown
    if (material.name.includes("Timber") || material.name.includes("Wood")) return 0x7c2d12; // wood
    if (material.name.includes("Straw")) return 0xfef08a; // straw
    if (material.name.includes("Water")) return 0x06b6d4; // cyan
    return 0x64748b; // gray
  };

  const getMaterialRoughness = (material: any): number => {
    if (material.k < 0.05) return 0.6;
    if (material.name.includes("Stone") || material.name.includes("Granite")) return 0.5;
    if (material.name.includes("Glass")) return 0.1;
    return 0.9;
  };

  const getTemperatureColor = (temp: number): THREE.Color => {
    const min_T = -15.0;
    const max_T = 25.0;
    let t = (temp - min_T) / (max_T - min_T);
    t = Math.max(Math.min(t, 1.0), 0.0);
    const hue = (1.0 - t) * 240.0;
    return new THREE.Color(`hsl(${hue}, 85%, 45%)`);
  };

  const createTempLabel = (text: string, pos: THREE.Vector3, color = "#ffffff") => {
    if (!arrowGroupRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    
    const x = 4, y = 4, w = 248, h = 56, r = 12;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = 'bold 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.scale.set(1.5, 0.375, 1);
    
    arrowGroupRef.current.add(sprite);
  };

  const createFlowArrows = (
    L: number, 
    W: number, 
    H: number, 
    solar_gain: number, 
    cond_loss: number, 
    vent_loss: number, 
    _T_air: number, 
    _T_mass: number, 
    storage_rate = 0
  ) => {
    if (!arrowGroupRef.current || !shelterGroupRef.current) return;
    particlesRef.current = [];
    const sphereGeom = new THREE.SphereGeometry(0.06, 8, 8);
    
    // 1. Solar Gain (Yellow moving inward from South window)
    if (solar_gain > 50) {
      const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const num = Math.min(Math.ceil(solar_gain / 250), 5);
      for (let i = 0; i < num; i++) {
        const mesh = new THREE.Mesh(sphereGeom, yellowMat);
        arrowGroupRef.current.add(mesh);
        
        const start = new THREE.Vector3(0, H/2, W/2).applyMatrix4(shelterGroupRef.current.matrixWorld);
        const end = new THREE.Vector3((i - (num-1)/2) * 0.5, 0.1, -W/5).applyMatrix4(shelterGroupRef.current.matrixWorld);
        
        particlesRef.current.push({
          mesh, origin: start, destination: end,
          t: (i / num), speed: 0.007
        });
        
        if (i === 0 || i === num - 1) {
          const dir = new THREE.Vector3().subVectors(end, start).normalize();
          const arr = new THREE.ArrowHelper(dir, start, 1.2, 0xfacc15, 0.3, 0.15);
          arrowGroupRef.current.add(arr);
        }
      }
    }
    
    // 2. Conduction (Blue moving outward if losing heat, Red moving inward if gaining)
    if (Math.abs(cond_loss) > 50) {
      const isLoss = cond_loss > 0;
      const condMat = new THREE.MeshBasicMaterial({ color: isLoss ? 0x3b82f6 : 0xef4444 });
      
      const paths = [
        { s: new THREE.Vector3(0, H/2, -W/4), e: new THREE.Vector3(0, H/2, -W/2 - 0.4) }, // North Wall
        { s: new THREE.Vector3(0, H/2, W/4), e: new THREE.Vector3(0, H/2, W/2 + 0.4) },   // South Wall
        { s: new THREE.Vector3(L/4, H/2, 0), e: new THREE.Vector3(L/2 + 0.4, H/2, 0) },   // East Wall
        { s: new THREE.Vector3(-L/4, H/2, 0), e: new THREE.Vector3(-L/2 - 0.4, H/2, 0) }  // West Wall
      ];
      
      paths.forEach((p) => {
        let start = p.s.clone().applyMatrix4(shelterGroupRef.current!.matrixWorld);
        let end = p.e.clone().applyMatrix4(shelterGroupRef.current!.matrixWorld);
        if (!isLoss) {
          const temp = start;
          start = end;
          end = temp;
        }
        
        const mesh = new THREE.Mesh(sphereGeom, condMat);
        arrowGroupRef.current!.add(mesh);
        particlesRef.current.push({
          mesh, origin: start, destination: end,
          t: Math.random(), speed: 0.012
        });
        
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const arr = new THREE.ArrowHelper(dir, start, 0.6, isLoss ? 0x3b82f6 : 0xef4444, 0.2, 0.1);
        arrowGroupRef.current!.add(arr);
      });
    }
    
    // 3. Ventilation (Orange moving out of roof vents)
    if (Math.abs(vent_loss) > 20) {
      const isLoss = vent_loss > 0;
      const ventMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      
      let start = new THREE.Vector3(0, H/2, 0).applyMatrix4(shelterGroupRef.current.matrixWorld);
      let end = new THREE.Vector3(0, H + 0.4, 0).applyMatrix4(shelterGroupRef.current.matrixWorld);
      if (!isLoss) {
        const temp = start;
        start = end;
        end = temp;
      }
      
      for (let i = 0; i < 3; i++) {
        const mesh = new THREE.Mesh(sphereGeom, ventMat);
        arrowGroupRef.current.add(mesh);
        particlesRef.current.push({
          mesh, origin: start, destination: end,
          t: i / 3, speed: 0.009
        });
      }
      
      const dir = new THREE.Vector3().subVectors(end, start).normalize();
      const arr = new THREE.ArrowHelper(dir, start, 0.8, 0xf97316, 0.25, 0.15);
      arrowGroupRef.current.add(arr);
    }

    // 4. Thermal Storage Flow (Charging = flows into mass, Discharging = flows out of mass)
    if (Math.abs(storage_rate) > 20) {
      const isCharging = storage_rate > 0;
      const storageMat = new THREE.MeshBasicMaterial({ color: isCharging ? 0xec4899 : 0x06b6d4 });
      
      const massTargets: THREE.Vector3[] = [];
      const t_wall = (shelter.walls.S || []).reduce((sum, l) => sum + l.thickness, 0.15);
      
      if (thermalMassType === "water_drums") {
        const drumLocations = [
          { x: -L/4, z: 0 },
          { x: L/5, z: -W/5 },
          { x: -L/4, z: W/4 },
          { x: L/4, z: W/4 },
          { x: -L/5, z: -W/4 },
          { x: 0, z: W/5 }
        ];
        for (let i = 0; i < Math.min(thermalMassQty, 6); i++) {
          const loc = drumLocations[i];
          massTargets.push(new THREE.Vector3(loc.x, 0.45, loc.z));
        }
      } else if (thermalMassType === "concrete_wall") {
        massTargets.push(new THREE.Vector3(-L/6, 0.9, 0));
      } else if (thermalMassType === "pcm_panels") {
        massTargets.push(new THREE.Vector3(0, H/2, -W/2 + t_wall + 0.05));
        massTargets.push(new THREE.Vector3(-L/2 + t_wall + 0.05, H/2, 0));
      } else {
        massTargets.push(new THREE.Vector3(0, 0, 0));
      }
      
      massTargets.forEach(massLoc => {
        let start = new THREE.Vector3(0, H/2, 0).applyMatrix4(shelterGroupRef.current!.matrixWorld);
        let end = massLoc.clone().applyMatrix4(shelterGroupRef.current!.matrixWorld);
        
        if (!isCharging) {
          const temp = start;
          start = end;
          end = temp;
        }
        
        for (let i = 0; i < 3; i++) {
          const mesh = new THREE.Mesh(sphereGeom, storageMat);
          arrowGroupRef.current!.add(mesh);
          particlesRef.current.push({
            mesh, origin: start, destination: end,
            t: i / 3, speed: 0.008
          });
        }
        
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const arr = new THREE.ArrowHelper(dir, start, 0.5, isCharging ? 0xec4899 : 0x06b6d4, 0.2, 0.1);
        arrowGroupRef.current!.add(arr);
      });
    }
  };

  const rebuildGeometry = () => {
    if (!shelter || !shelterGroupRef.current || !arrowGroupRef.current) return;
    
    const shelterGroup = shelterGroupRef.current;
    const arrowGroup = arrowGroupRef.current;
    
    // Clear dynamic objects
    while (shelterGroup.children.length > 0) {
      const obj = shelterGroup.children[0];
      shelterGroup.remove(obj);
    }
    while (arrowGroup.children.length > 0) {
      const obj = arrowGroup.children[0];
      arrowGroup.remove(obj);
    }
    particlesRef.current = [];
    
    const L = shelter.length;
    const W = shelter.width;
    const H = shelter.height;
    
    let T_air_val = 18.0;
    let T_mass_val = 15.0;
    let T_out_val = -10.0;
    let solar_gain_val = 0;
    let cond_loss_val = 0;
    let vent_loss_val = 0;
    let storage_rate_val = 0;
    
    if (simResult && simResult.t_hours.length > 0) {
      const timeStep = simResult.t_hours[1] - simResult.t_hours[0];
      let idx = Math.round(activeHour / (timeStep || 0.5));
      idx = Math.max(0, Math.min(idx, simResult.t_hours.length - 1));
      
      T_air_val = simResult.T_air[idx];
      T_mass_val = simResult.T_mass[idx];
      T_out_val = simResult.T_out[idx];
      solar_gain_val = simResult.solar_gain_W[idx];
      cond_loss_val = simResult.conduction_loss_W[idx];
      vent_loss_val = simResult.ventilation_loss_W[idx];
      storage_rate_val = simResult.storage_rate_W ? simResult.storage_rate_W[idx] : 0;
    }
    
    const wallLayers = shelter.walls.S || [];
    const roofLayers = shelter.roof || [];
    const floorLayers = shelter.floor || [];
    
    // 1. FLOOR
    let floorR = 0.17 + 0.04;
    floorLayers.forEach(l => { floorR += l.thickness / l.material.k; });
    const floorU = (1 / floorR).toFixed(2);
    const floorMatName = floorLayers.map(l => `${l.material.name} (${Math.round(l.thickness*100)}cm)`).join(" + ");
    const floorArea = L * W;
    
    const floorData = {
      name: "Floor Slab",
      materialName: floorMatName || "Concrete Slab",
      thickness: floorLayers.reduce((sum, l) => sum + l.thickness, 0).toFixed(2) + " m",
      uValue: floorU,
      temp: (T_mass_val - 2.0).toFixed(1) + " °C",
      heatFlow: (Number(floorU) * floorArea * (T_air_val - T_mass_val)).toFixed(1)
    };

    if (visibilityStates.floor) {
      let y_curr = -0.001;
      for (let i = floorLayers.length - 1; i >= 0; i--) {
        const layer = floorLayers[i];
        const t_layer = layer.thickness;
        const floorGeom = new THREE.BoxGeometry(L, t_layer, W);
        const floorMat = new THREE.MeshStandardMaterial({
          color: viewMode === "physical" ? getMaterialColor(layer.material) : getTemperatureColor(T_mass_val - 2),
          roughness: getMaterialRoughness(layer.material),
          transparent: envelopeOpacity < 1.0 || layer.material.is_pcm || layer.material.k < 0.05,
          opacity: envelopeOpacity
        });
        const floorMesh = new THREE.Mesh(floorGeom, floorMat);
        floorMesh.position.set(0, y_curr - t_layer / 2, 0);
        floorMesh.receiveShadow = true;
        floorMesh.userData = floorData;
        shelterGroup.add(floorMesh);
        y_curr -= t_layer;
      }
    }
    
    // 2. WALLS
    const t_wall = wallLayers.reduce((sum, l) => sum + l.thickness, 0);
    
    const makeWall = (wL: number, px: number, pz: number, ry: number, wallTemp: number, faceName: string) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(px, H/2, pz);
      gGroup.rotation.y = ry;
      
      let R_val = 0.13 + 0.04;
      wallLayers.forEach(l => { R_val += l.thickness / l.material.k; });
      const wall_u = (1 / R_val).toFixed(2);
      const wall_mat = wallLayers.map(l => `${l.material.name} (${Math.round(l.thickness*100)}cm)`).join(" + ");
      const wall_thick = t_wall.toFixed(2) + " m";
      const wall_area = wL * H;
      const flowVal = Number(wall_u) * wall_area * (T_air_val - wallTemp);
      
      const uData = {
        name: faceName,
        materialName: wall_mat || "Standard Wall",
        thickness: wall_thick,
        uValue: wall_u,
        temp: wallTemp.toFixed(1) + " °C",
        heatFlow: flowVal.toFixed(1)
      };
      
      if (viewMode === "physical") {
        let z_curr = t_wall / 2;
        wallLayers.forEach((layer, idx) => {
          const t_layer = layer.thickness;
          const geom = new THREE.BoxGeometry(wL - idx*0.02, H - idx*0.02, t_layer);
          const mat = new THREE.MeshStandardMaterial({ 
            color: getMaterialColor(layer.material), 
            roughness: getMaterialRoughness(layer.material),
            transparent: envelopeOpacity < 1.0 || layer.material.is_pcm || layer.material.k < 0.05,
            opacity: envelopeOpacity * (layer.material.k < 0.05 ? 0.75 : 1.0)
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.z = z_curr - t_layer / 2;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData = uData;
          gGroup.add(mesh);
          z_curr -= t_layer;
        });
      } else {
        const thermGeom = new THREE.BoxGeometry(wL, H, t_wall);
        const thermMat = new THREE.MeshStandardMaterial({ 
          color: getTemperatureColor(wallTemp),
          roughness: 0.7,
          transparent: envelopeOpacity < 1.0,
          opacity: envelopeOpacity
        });
        const thermMesh = new THREE.Mesh(thermGeom, thermMat);
        thermMesh.castShadow = true;
        thermMesh.receiveShadow = true;
        thermMesh.userData = uData;
        gGroup.add(thermMesh);
      }
      shelterGroup.add(gGroup);
    };
    
    let t_N = T_out_val;
    let t_S = T_out_val;
    let t_E = T_out_val;
    let t_W = T_out_val;
    
    if (simResult) {
      t_N = T_out_val;
      t_S = T_out_val + (solar_gain_val > 300 ? 12 : 2);
      t_E = T_out_val + (activeHour < 12 && solar_gain_val > 100 ? 5 : 1);
      t_W = T_out_val + (activeHour > 12 && solar_gain_val > 100 ? 6 : 1);
    }
    
    if (visibilityStates.walls) {
      makeWall(L, 0, -W/2 + t_wall/2, Math.PI, t_N, "North Wall");
      makeWall(W - t_wall, L/2 - t_wall/2, 0, Math.PI / 2, t_E, "East Wall");
      makeWall(W - t_wall, -L/2 + t_wall/2, 0, -Math.PI / 2, t_W, "West Wall");
      makeWall(L, 0, W/2 - t_wall/2, 0, t_S, "South Wall");
    }
    
    // 3. WINDOW (centered on South Wall)
    let win_w = 1.6;
    let win_h = 1.2;
    if (shelter.openings && shelter.openings.length > 0) {
      const win = shelter.openings.find(o => !o.is_door);
      if (win) {
        win_w = win.width;
        win_h = win.height;
      }
    }
    
    if (visibilityStates.openings) {
      const winGeom = new THREE.BoxGeometry(win_w, win_h, 0.1);
      let winMat;
      if (viewMode === "physical") {
        winMat = new THREE.MeshStandardMaterial({ 
          color: 0xe0f2fe,
          roughness: 0.1,
          transparent: true,
          opacity: envelopeOpacity * 0.6
        });
      } else {
        winMat = new THREE.MeshStandardMaterial({ 
          color: getTemperatureColor((T_air_val + T_out_val)/2),
          transparent: envelopeOpacity < 1.0,
          opacity: envelopeOpacity
        });
      }
      const winMesh = new THREE.Mesh(winGeom, winMat);
      winMesh.position.set(0, H/2, W/2 + 0.05);
      
      const winArea = win_w * win_h;
      const win_u = shelter.openings.find(o => !o.is_door)?.u_value_override || 1.8;
      winMesh.userData = {
        name: "South Window (Glazing)",
        materialName: shelter.openings.find(o => !o.is_door)?.glazing?.name || "Double Glazing Low-E",
        thickness: "0.024 m",
        uValue: win_u,
        temp: ((T_air_val + T_out_val)/2).toFixed(1) + " °C",
        heatFlow: (win_u * winArea * (T_air_val - T_out_val)).toFixed(1)
      };
      shelterGroup.add(winMesh);
      
      // Frame
      const frameGeom = new THREE.BoxGeometry(win_w + 0.1, win_h + 0.1, 0.12);
      const frameMat = new THREE.MeshStandardMaterial({ 
        color: 0x334155, 
        roughness: 0.9,
        transparent: envelopeOpacity < 1.0,
        opacity: envelopeOpacity
      });
      const frameMesh = new THREE.Mesh(frameGeom, frameMat);
      frameMesh.position.set(0, H/2, W/2 + 0.04);
      shelterGroup.add(frameMesh);
      
      // 4. DOOR
      const doorGeom = new THREE.BoxGeometry(0.9, 2.0, 0.08);
      let doorMat;
      if (viewMode === "physical") {
        doorMat = new THREE.MeshStandardMaterial({ 
          color: 0x7c2d12, 
          roughness: 0.9,
          transparent: envelopeOpacity < 1.0,
          opacity: envelopeOpacity
        });
      } else {
        doorMat = new THREE.MeshStandardMaterial({ 
          color: getTemperatureColor((T_air_val + T_out_val)/2 + 1),
          transparent: envelopeOpacity < 1.0,
          opacity: envelopeOpacity
        });
      }
      const doorMesh = new THREE.Mesh(doorGeom, doorMat);
      doorMesh.position.set(L/2 - 0.7, 1.0, W/2 + 0.04);
      
      const doorArea = 1.8;
      doorMesh.userData = {
        name: "Entry Door",
        materialName: "Timber Solid Core",
        thickness: "0.04 m",
        uValue: "1.8",
        temp: ((T_air_val + T_out_val)/2 + 1.0).toFixed(1) + " °C",
        heatFlow: (1.8 * doorArea * (T_air_val - T_out_val)).toFixed(1)
      };
      shelterGroup.add(doorMesh);
    }
    
    // 5. ROOF
    const roofTemp = (T_out_val + T_mass_val) / 2 + (solar_gain_val > 400 ? 5 : 0);
    let roofR = 0.10 + 0.04;
    roofLayers.forEach(l => { roofR += l.thickness / l.material.k; });
    const roofU = (1 / roofR).toFixed(2);
    const roofMatName = roofLayers.map(l => `${l.material.name} (${Math.round(l.thickness*100)}cm)`).join(" + ");
    const roofArea = L * W;
    const roofData = {
      name: "Roof Slab",
      materialName: roofMatName || "Standard Roof",
      thickness: roofLayers.reduce((sum, l) => sum + l.thickness, 0).toFixed(2) + " m",
      uValue: roofU,
      temp: roofTemp.toFixed(1) + " °C",
      heatFlow: (Number(roofU) * roofArea * (T_air_val - roofTemp)).toFixed(1)
    };
    
    if (visibilityStates.roof) {
      const t_roof = roofLayers.reduce((sum, l) => sum + l.thickness, 0);
      if (shelter.shape === "flat_roof_box") {
        let y_curr = H;
        for (let i = roofLayers.length - 1; i >= 0; i--) {
          const layer = roofLayers[i];
          const t_layer = layer.thickness;
          const roofGeom = new THREE.BoxGeometry(L + 0.15, t_layer, W + 0.15);
          const roofMat = new THREE.MeshStandardMaterial({
            color: viewMode === "physical" ? getMaterialColor(layer.material) : getTemperatureColor(roofTemp),
            roughness: getMaterialRoughness(layer.material),
            transparent: envelopeOpacity < 1.0 || layer.material.is_pcm || layer.material.k < 0.05,
            opacity: envelopeOpacity
          });
          const roofMesh = new THREE.Mesh(roofGeom, roofMat);
          roofMesh.position.set(0, y_curr + t_layer / 2, 0);
          roofMesh.castShadow = true;
          roofMesh.userData = roofData;
          shelterGroup.add(roofMesh);
          y_curr += t_layer;
        }
      } else {
        const pitch = shelter.roof_pitch_deg * Math.PI / 180.0;
        const slabW = (W / 2) / Math.cos(pitch) + 0.15;
        
        const slabNGroup = new THREE.Group();
        slabNGroup.position.set(0, H + (W/4) * Math.sin(pitch), -W/4);
        slabNGroup.rotation.x = pitch;
        
        let y_local = -t_roof / 2;
        for (let i = roofLayers.length - 1; i >= 0; i--) {
          const layer = roofLayers[i];
          const t_layer = layer.thickness;
          const geom = new THREE.BoxGeometry(L + 0.15, t_layer, slabW);
          const mat = new THREE.MeshStandardMaterial({
            color: viewMode === "physical" ? getMaterialColor(layer.material) : getTemperatureColor(roofTemp),
            roughness: getMaterialRoughness(layer.material),
            transparent: envelopeOpacity < 1.0 || layer.material.is_pcm || layer.material.k < 0.05,
            opacity: envelopeOpacity
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(0, y_local + t_layer / 2, 0);
          mesh.castShadow = true;
          mesh.userData = roofData;
          slabNGroup.add(mesh);
          y_local += t_layer;
        }
        shelterGroup.add(slabNGroup);
        
        const slabSGroup = new THREE.Group();
        slabSGroup.position.set(0, H + (W/4) * Math.sin(pitch), W/4);
        slabSGroup.rotation.x = -pitch;
        
        y_local = -t_roof / 2;
        for (let i = roofLayers.length - 1; i >= 0; i--) {
          const layer = roofLayers[i];
          const t_layer = layer.thickness;
          const geom = new THREE.BoxGeometry(L + 0.15, t_layer, slabW);
          const mat = new THREE.MeshStandardMaterial({
            color: viewMode === "physical" ? getMaterialColor(layer.material) : getTemperatureColor(roofTemp),
            roughness: getMaterialRoughness(layer.material),
            transparent: envelopeOpacity < 1.0 || layer.material.is_pcm || layer.material.k < 0.05,
            opacity: envelopeOpacity
          });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(0, y_local + t_layer / 2, 0);
          mesh.castShadow = true;
          mesh.userData = roofData;
          slabSGroup.add(mesh);
          y_local += t_layer;
        }
        shelterGroup.add(slabSGroup);
      }
    }
    
    // 6. DYNAMIC INTERIOR THERMAL MASS
    if (visibilityStates.mass) {
      if (thermalMassType === "water_drums") {
        const drumData = {
          name: "Water Drum (Thermal Mass)",
          materialName: "Water (Sensible Thermal Mass)",
          thickness: "Volume: 300L per drum",
          uValue: "N/A",
          temp: T_mass_val.toFixed(1) + " °C",
          heatFlow: "0.0"
        };
        const drumLocations = [
          { x: -L/4, z: 0 },
          { x: L/5, z: -W/5 },
          { x: -L/4, z: W/4 },
          { x: L/4, z: W/4 },
          { x: -L/5, z: -W/4 },
          { x: 0, z: W/5 }
        ];
        
        for (let i = 0; i < Math.min(thermalMassQty, 6); i++) {
          const loc = drumLocations[i];
          const drumGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.9, 16);
          let drumMat;
          if (viewMode === "physical") {
            drumMat = new THREE.MeshStandardMaterial({ 
              color: 0x06b6d4, 
              roughness: 0.3, 
              transparent: true, 
              opacity: 0.8 
            });
          } else {
            drumMat = new THREE.MeshStandardMaterial({ color: getTemperatureColor(T_mass_val), roughness: 0.4 });
          }
          const drumMesh = new THREE.Mesh(drumGeom, drumMat);
          drumMesh.position.set(loc.x, 0.45, loc.z);
          drumMesh.castShadow = true;
          drumMesh.userData = drumData;
          shelterGroup.add(drumMesh);
        }
      } else if (thermalMassType === "concrete_wall") {
        const wallLength = Math.min(thermalMassQty, W - 0.4);
        const partGeom = new THREE.BoxGeometry(0.15, 1.8, wallLength);
        let partMat;
        if (viewMode === "physical") {
          partMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        } else {
          partMat = new THREE.MeshStandardMaterial({ color: getTemperatureColor(T_mass_val), roughness: 0.7 });
        }
        const partition = new THREE.Mesh(partGeom, partMat);
        partition.position.set(-L/6, 0.9, 0);
        partition.castShadow = true;
        partition.receiveShadow = true;
        partition.userData = {
          name: "Concrete Partition Wall (Thermal Mass)",
          materialName: "Dense Concrete",
          thickness: "0.15 m",
          uValue: "N/A",
          temp: T_mass_val.toFixed(1) + " °C",
          heatFlow: "0.0"
        };
        shelterGroup.add(partition);
      } else if (thermalMassType === "pcm_panels") {
        const pcmNGeom = new THREE.BoxGeometry(L * 0.9, H * 0.8, 0.02);
        let pcmMat;
        if (viewMode === "physical") {
          pcmMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            roughness: 0.4,
            transparent: true,
            opacity: 0.8
          });
        } else {
          pcmMat = new THREE.MeshStandardMaterial({ color: getTemperatureColor(T_mass_val), roughness: 0.5 });
        }
        const pcmN = new THREE.Mesh(pcmNGeom, pcmMat);
        pcmN.position.set(0, H/2, -W/2 + t_wall + 0.01);
        pcmN.userData = {
          name: "PCM Wallboard (Thermal Mass)",
          materialName: "PCM RT21 Paraffin",
          thickness: "0.02 m",
          uValue: "N/A",
          temp: T_mass_val.toFixed(1) + " °C",
          heatFlow: "0.0"
        };
        shelterGroup.add(pcmN);
        
        const pcmWGeom = new THREE.BoxGeometry(0.02, H * 0.8, W * 0.8);
        const pcmW = new THREE.Mesh(pcmWGeom, pcmMat);
        pcmW.position.set(-L/2 + t_wall + 0.01, H/2, 0);
        pcmW.userData = pcmN.userData;
        shelterGroup.add(pcmW);
      }
    }
    
    // Rotate shelter to orientation
    shelterGroup.rotation.y = -shelter.orientation_deg * Math.PI / 180.0;
    
    // 7. SUN POSITIONING AND BEAM
    const hod = activeHour % 24;
    const isDaylight = hod >= 7.5 && hod <= 16.5;
    let alt = 0, az = 0;
    if (isDaylight) {
      const t_noon = hod - 12;
      alt = 35 * Math.cos((t_noon / 4.5) * (Math.PI / 2));
      az = 180 + t_noon * 20;
    } else {
      alt = -40;
      az = 0;
    }
    
    const altRad = alt * Math.PI / 180.0;
    const azRad = az * Math.PI / 180.0;
    
    const sunDist = 13;
    const sunX = sunDist * Math.cos(altRad) * Math.sin(azRad);
    const sunY = Math.max(sunDist * Math.sin(altRad), -5.0);
    const sunZ = sunDist * Math.cos(altRad) * Math.cos(azRad);
    
    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(sunX, sunY, sunZ);
    }
    
    if (alt > 0) {
      if (dirLightRef.current) {
        dirLightRef.current.position.set(sunX, sunY, sunZ);
        dirLightRef.current.intensity = 1.0;
      }
      if (sunMeshRef.current) {
        (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(0xfacc15);
      }
      if (sunBeamRef.current) {
        sunBeamRef.current.visible = visibilityStates.openings;
        const targetPos = new THREE.Vector3(0, H/2, W/2).applyMatrix4(shelterGroup.matrixWorld);
        const direction = new THREE.Vector3().subVectors(targetPos, sunMeshRef.current!.position);
        const beamLength = direction.length();
        
        sunBeamRef.current.scale.set(1, beamLength, 1);
        sunBeamRef.current.position.copy(sunMeshRef.current!.position).addScaledVector(direction, 0.5);
        sunBeamRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      }
      
      // Dashed solar rays
      if (visibilityStates.openings) {
        const targetPoints = [
          new THREE.Vector3(0, H/2, W/2),
          new THREE.Vector3(-L/3, H/2, W/2),
          new THREE.Vector3(L/3, H/2, W/2),
          new THREE.Vector3(-L/4, H, W/4),
          new THREE.Vector3(L/4, H, W/4)
        ];
        
        targetPoints.forEach(targetLocal => {
          const targetGlobal = targetLocal.clone().applyMatrix4(shelterGroup.matrixWorld);
          const points = [sunMeshRef.current!.position.clone(), targetGlobal];
          const rayGeom = new THREE.BufferGeometry().setFromPoints(points);
          const rayMat = new THREE.LineDashedMaterial({
            color: 0xfacc15,
            dashSize: 0.3,
            gapSize: 0.15,
            transparent: true,
            opacity: 0.4
          });
          const ray = new THREE.Line(rayGeom, rayMat);
          ray.computeLineDistances();
          arrowGroup.add(ray);
        });
      }
    } else {
      if (dirLightRef.current) {
        dirLightRef.current.position.set(0, -10, 0);
        dirLightRef.current.intensity = 0.05;
      }
      if (sunMeshRef.current) {
        (sunMeshRef.current.material as THREE.MeshBasicMaterial).color.setHex(0x1e293b);
      }
      if (sunBeamRef.current) {
        sunBeamRef.current.visible = false;
      }
    }
    
    // 8. THERMAL FLOWS
    if (viewMode === "thermal" && visibilityStates.arrows) {
      createFlowArrows(L, W, H, solar_gain_val, cond_loss_val, vent_loss_val, T_air_val, T_mass_val, storage_rate_val);
    }
    
    // 9. TEMPERATURE FLOATING LABELS
    if (viewMode === "thermal") {
      const sunDir = sunMeshRef.current ? sunMeshRef.current.position.clone().normalize() : new THREE.Vector3(1, 1, 1);
      createTempLabel(`T_out: ${T_out_val.toFixed(1)}°C`, new THREE.Vector3(sunDir.x * 4.5, H + 1.2, sunDir.z * 4.5), "#60a5fa");
      createTempLabel(`T_air: ${T_air_val.toFixed(1)}°C`, new THREE.Vector3(0, H/2 + 0.3, 0), "#f87171");
      if (thermalMassType !== "none") {
        createTempLabel(`T_mass: ${T_mass_val.toFixed(1)}°C`, new THREE.Vector3(-L/4, 1.1, -W/4), "#34d399");
      }
      if (visibilityStates.walls) {
        createTempLabel(`Roof: ${roofTemp.toFixed(1)}°C`, new THREE.Vector3(0, H + 0.6, 0), "#fbbf24");
        createTempLabel(`Floor: ${(T_mass_val - 2.0).toFixed(1)}°C`, new THREE.Vector3(0, -0.2, 0), "#94a3b8");
        createTempLabel(`Wall S: ${t_S.toFixed(1)}°C`, new THREE.Vector3(0, H/2, W/2 + 0.3).applyMatrix4(shelterGroup.matrixWorld), "#ffffff");
        createTempLabel(`Wall N: ${t_N.toFixed(1)}°C`, new THREE.Vector3(0, H/2, -W/2 - 0.3).applyMatrix4(shelterGroup.matrixWorld), "#ffffff");
      }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div 
        ref={tooltipRef}
        style={{ display: 'none' }}
        className="absolute bg-zinc-950/95 border border-blue-500 p-3 rounded-xl text-[11px] leading-relaxed z-30 pointer-events-none w-[220px] shadow-xl text-white"
      />
    </div>
  );
};
