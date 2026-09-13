import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  CloudSun,
  Home,
  Database,
  Play,
  Columns,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Pause,
  Compass
} from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'dashboard',
    route: '/dashboard',
    label: 'Dashboard',
    icon: LineChart,
    badge: 'Page 1 // Real-Time Telemetry',
    title: 'Thermal Comfort & Passive Predictions',
    description: 'Monitor live interior temperature predictions and passive thermal stabilization against sub-zero Leh weather.',
    features: [
      'Hourly indoor vs. ambient temperature curve (+18°C comfort threshold vs. -28°C baseline)',
      'Diurnal sol-air flux, solar gains, and envelope transmission heat loss breakdowns',
      'Real-time thermal mass storage charge/discharge cycles and comfort zone duration'
    ],
    actionTip: 'Inspect the diurnal temperature swing to verify passive solar heat retention during cold nights.'
  },
  {
    id: 'climate',
    route: '/climate',
    label: 'Climate Data',
    icon: CloudSun,
    badge: 'Page 2 // Weather & Solar Profiles',
    title: 'Extreme Climate & Sol-Air Boundaries',
    description: 'Analyze verified high-altitude cold desert weather data from Ladakh (3,500m ASL).',
    features: [
      '5-year verified Leh meteorological dataset (43,824 hourly records)',
      'Stress-test scenarios: Extreme Cold Winter, Severe Blizzard, and High Solar Clearness',
      'Custom CSV weather profile upload for localized geographic site analysis'
    ],
    actionTip: 'Toggle scenarios (e.g. Extreme Winter Blizzard) to evaluate your shelter under worst-case weather.'
  },
  {
    id: 'design',
    route: '/design',
    label: 'Shelter Design',
    icon: Home,
    badge: 'Page 3 // 3D Parametric CAD',
    title: 'Envelope Geometry & Solar Glazing',
    description: 'Configure physical geometry, orientation, south-facing window-to-wall ratios (WWR), and composite wall assemblies.',
    features: [
      'Interactive 3D WebGL shelter visualizer with dynamic orbital camera and sunlight raycasting',
      'South-facing direct solar gain window optimization with multi-pane low-E glazing controls',
      'Full layer-by-layer composite stack configuration for roof, floor, and directional walls'
    ],
    actionTip: 'Rotate the 3D model to inspect envelope insulation layers and solar ingress angles.'
  },
  {
    id: 'materials',
    route: '/materials',
    label: 'Materials Catalog',
    icon: Database,
    badge: 'Page 4 // Thermophysical Database',
    title: 'Thermal Mass, Insulation & PCMs',
    description: 'Select and customize building envelope materials engineered for high-altitude cold climate protection.',
    features: [
      'Thermophysical properties: thermal conductivity (k), density (ρ), and specific heat capacity (Cp)',
      'Phase Change Materials (PCM) with latent enthalpy phase transition curves for nighttime heat release',
      'Indigenous high-altitude materials: local rammed earth, straw-clay composite, and aerogel blankets'
    ],
    actionTip: 'Select high thermal capacitance materials for interior walls to buffer sub-zero temperature drops.'
  },
  {
    id: 'simulation',
    route: '/simulation',
    label: 'Simulation Setup',
    icon: Play,
    badge: 'Page 5 // Numerical Solvers',
    title: 'Transient Solvers & Boundary Setup',
    description: 'Configure numerical computation timesteps, convective boundary films, ground coupling, and execute transient runs.',
    features: [
      'Adjustable finite-difference timesteps (1m - 60m), numerical tolerance, and solver convergence limits',
      'Air infiltration rates (ACH), internal heat gain loads, and ground contact boundary models',
      'Execute multi-day transient RC simulations with real-time computation status'
    ],
    actionTip: 'Click "Run Simulation" to solve transient temperature curves across the full annual cycle.'
  },
  {
    id: 'comparison',
    route: '/comparison',
    label: 'Design Compare',
    icon: Columns,
    badge: 'Page 6 // Benchmark Analysis',
    title: 'Assembly Comparison & Benchmarking',
    description: 'Compare multiple shelter envelope configurations side-by-side to evaluate thermal efficiency and cost metrics.',
    features: [
      'Side-by-side comparison of peak indoor temperatures, heating degree days, and comfort percentages',
      'Total composite assembly U-values and thermal lag metrics',
      'Material cost vs. passive performance optimization matrix'
    ],
    actionTip: 'Use the comparison view to select the most cost-effective insulation and glazing configuration.'
  },
  {
    id: 'validation',
    route: '/validation',
    label: 'ANSYS Validation',
    icon: ShieldCheck,
    badge: 'Page 7 // CFD Verification',
    title: 'CFD Fluid Flow & Residual Verification',
    description: 'Correlate simplified fast 1D RC nodal calculations against high-fidelity 3D ANSYS Fluent CHT simulations.',
    features: [
      'Direct comparison of RC network predictions with high-mesh ANSYS CHT temperature residuals',
      'Verified accuracy showing < 1.2°C mean temperature deviation across extreme freeze-thaw cycles',
      'Scientific validation for zero-auxiliary-fuel passive habitat survival'
    ],
    actionTip: 'Inspect CFD residuals to confirm engineering reliability before physical shelter construction.'
  }
];

const STEP_DURATION_MS = 4500;

export const CinematicIntroModal = ({ isOpen, onClose, targetLogoId = 'shelteriq-sidebar-logo-img' }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [minimizingStyle, setMinimizingStyle] = useState({});

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef([]);
  const targetPosRef = useRef({ x: 50, y: 50 });
  const isVortexRef = useRef(false);
  const timerRef = useRef(null);

  // Auto-advance timer with delay
  useEffect(() => {
    if (!isOpen || isMinimizing) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % TOUR_STEPS.length);
    }, STEP_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPaused, isMinimizing]);

  // Canvas particle constellation in ShelterIQ theme (deep navy/slate void with subtle blue/cyan nodes)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const pCount = Math.min(55, Math.floor((width * height) / 18000));
    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.45 + 0.2,
        pulseOffset: Math.random() * Math.PI * 2,
        isHighlight: Math.random() > 0.75
      });
    }
    particlesRef.current = particles;

    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Deep dark navy vignette matching ShelterIQ dark theme
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        60,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85
      );
      bgGrad.addColorStop(0, '#0c101d');
      bgGrad.addColorStop(0.55, '#070a12');
      bgGrad.addColorStop(1, '#030407');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle engineering grid circles
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(time * 0.04);
      const ringRadius = Math.min(width, height) * 0.32;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.arc(0, 0, ringRadius * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const isVortex = isVortexRef.current;
      const target = targetPosRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isVortex) {
          // Gravitational acceleration directly into the ShelterIQ logo!
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = Math.min(26, 480 / (dist + 30));
          p.vx += (dx / dist) * force * 0.38;
          p.vy += (dy / dist) * force * 0.38;
          p.x += p.vx;
          p.y += p.vy;
          p.radius = Math.max(0.2, p.radius * 0.98);
        } else {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          // Interactive mouse cursor push
          if (mouseRef.current.active) {
            const mdx = mouseRef.current.x - p.x;
            const mdy = mouseRef.current.y - p.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 120) {
              const mForce = (120 - mDist) / 120;
              p.x -= (mdx / mDist) * mForce * 1.4;
              p.y -= (mdy / mDist) * mForce * 1.4;

              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
              ctx.strokeStyle = `rgba(59, 130, 246, ${mForce * 0.35})`;
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }
        }

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const cdx = p.x - p2.x;
          const cdy = p.y - p2.y;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
          const maxDist = isVortex ? 70 : 120;

          if (cDist < maxDist) {
            const alpha = (1 - cDist / maxDist) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.isHighlight || p2.isHighlight
              ? `rgba(96, 165, 250, ${alpha * 1.4})`
              : `rgba(71, 85, 105, ${alpha * 0.8})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Draw particle node
        const pulse = Math.sin(time * 2 + p.pulseOffset) * 0.15;
        const currentAlpha = Math.min(1, Math.max(0.1, p.baseAlpha + pulse));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        if (p.isHighlight) {
          ctx.fillStyle = `rgba(147, 197, 253, ${currentAlpha})`;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.7)';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${currentAlpha})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const handleMouseMove = (e) => {
    mouseRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: true
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  // Trigger minimization directly into the ShelterIQ brand logo
  const handleMinimizeIntoLogo = () => {
    const isMobile = window.innerWidth < 768;
    const targetEl =
      document.getElementById(targetLogoId) ||
      document.getElementById(isMobile ? 'shelteriq-mobile-brand-logo-img' : 'shelteriq-sidebar-logo-img') ||
      document.getElementById('shelteriq-sidebar-logo');

    let targetX = 40;
    let targetY = 40;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }

    targetPosRef.current = { x: targetX, y: targetY };
    isVortexRef.current = true;
    setIsMinimizing(true);

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const deltaX = targetX - screenCenterX;
    const deltaY = targetY - screenCenterY;

    setMinimizingStyle({
      transform: `translate(${deltaX}px, ${deltaY}px) scale(0.04) rotate(-6deg)`,
      opacity: 0,
      filter: 'blur(3px) brightness(2.2)',
      transition: 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.85s ease-out, filter 0.85s ease-out'
    });

    setTimeout(() => {
      if (targetEl) {
        targetEl.classList.add('shelteriq-logo-pulsing');
        setTimeout(() => {
          targetEl.classList.remove('shelteriq-logo-pulsing');
        }, 1500);
      }
    }, 850);

    setTimeout(() => {
      onClose();
    }, 950);
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[activeStep];
  const StepIcon = currentStep.icon;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-0 z-[9999] flex items-center justify-center select-none overflow-hidden transition-opacity duration-700 ${
        isMinimizing ? 'pointer-events-none' : ''
      }`}
      style={{
        backgroundColor: isMinimizing ? 'transparent' : 'rgba(3, 5, 10, 0.95)',
        transition: 'background-color 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Background Interactive Particle Web */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700"
        style={{ opacity: isMinimizing ? 0.2 : 1 }}
      />

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

      {/* Main Tour Card (Matches ShelterIQ Theme) */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative z-10 w-full max-w-2xl mx-4 bg-[#0c1017]/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.85)] p-6 sm:p-7 text-zinc-100 flex flex-col will-change-transform"
        style={minimizingStyle}
      >
        {/* Subtle accent highlight line */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Top Header & Auto-Play Status */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2">
            <Compass size={15} className="text-blue-400" />
            <span className="font-bold tracking-tight text-white">
              Shelter<span className="text-blue-500">IQ</span>
            </span>
            <span className="text-zinc-500 font-mono text-[11px]">// Interactive Feature Tour</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
              {isPaused ? (
                <>
                  <Pause size={10} className="text-amber-400" />
                  <span className="text-amber-400">Paused</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-blue-400">Auto-Advancing</span>
                </>
              )}
            </span>
            <span className="text-zinc-500">
              {activeStep + 1}/{TOUR_STEPS.length}
            </span>
          </div>
        </div>

        {/* Continuous Progress Indicator Bar */}
        <div className="grid grid-cols-7 gap-1.5 my-3.5">
          {TOUR_STEPS.map((step, idx) => {
            const isCurrent = idx === activeStep;
            const isPassed = idx < activeStep;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className="group relative h-1.5 rounded-full bg-zinc-800/80 overflow-hidden cursor-pointer"
                title={`Step ${idx + 1}: ${step.label}`}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isPassed
                      ? 'w-full bg-blue-500'
                      : isCurrent
                      ? 'w-full bg-blue-400'
                      : 'w-0 bg-transparent'
                  }`}
                  style={{
                    transitionDuration: isCurrent && !isPaused ? `${STEP_DURATION_MS}ms` : '200ms',
                    transitionTimingFunction: 'linear'
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Page Step Header */}
        <div className="flex items-start justify-between gap-4 mt-1 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
              <StepIcon size={20} />
            </div>
            <div>
              <div className="text-[11px] font-mono font-medium text-blue-400 uppercase tracking-wider">
                {currentStep.badge}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {currentStep.title}
              </h3>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 shrink-0">
            {currentStep.route}
          </span>
        </div>

        {/* Description & Key Features */}
        <p className="text-xs sm:text-sm text-zinc-300 mb-3.5 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Feature Highlights Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-3.5 sm:p-4 mb-4 space-y-2">
          {currentStep.features.map((feature, fIdx) => (
            <div key={fIdx} className="flex items-start gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Tip */}
        <div className="px-3 py-2 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 flex items-center gap-2 mb-5">
          <Sparkles size={13} className="text-blue-400 shrink-0" />
          <span>
            <strong className="font-semibold text-blue-200">How to use:</strong> {currentStep.actionTip}
          </span>
        </div>

        {/* Navigation & Minimization Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setActiveStep((prev) => (prev === 0 ? TOUR_STEPS.length - 1 : prev - 1))
              }
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Page Guide"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setActiveStep((prev) => (prev + 1) % TOUR_STEPS.length)}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Next Page Guide"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={handleMinimizeIntoLogo}
              className="ml-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2 py-1"
            >
              Skip Tour
            </button>
          </div>

          <button
            type="button"
            disabled={isMinimizing}
            onClick={handleMinimizeIntoLogo}
            className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>ENTER SHELTER IQ LAB</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
