import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { 
  LineChart, 
  CloudSun, 
  Home, 
  Database, 
  Play, 
  Columns, 
  Sliders, 
  ShieldCheck, 
  Save, 
  Sun, 
  Moon, 
  Menu, 
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Layout: React.FC = () => {
  const { isDarkMode, setIsDarkMode, addDesignToPortfolio, isSimulating } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designName, setDesignName] = useState('');
  const location = useLocation();

  const getPageHeader = () => {
    switch (location.pathname) {
      case '/dashboard':
        return {
          title: "Passive Shelter Design – Extreme Climate",
          subtitle: "Physics-based thermal comfort predictions and passive envelope optimizer"
        };
      case '/climate':
        return {
          title: "Climate Profile Configurations",
          subtitle: "Define solar radiation, ambient temperatures, and local weather patterns"
        };
      case '/design':
        return {
          title: "Parametric Envelope Assembly",
          subtitle: "Tailor shelter shape, windows configuration, and wall layer composites"
        };
      case '/materials':
        return {
          title: "Envelope Construction Materials",
          subtitle: "Inspect properties and register customized thermal/PCM specifications"
        };
      case '/simulation':
        return {
          title: "Numerical Simulation Setup",
          subtitle: "Configure boundary parameters and run transient solvers"
        };
      case '/comparison':
        return {
          title: "Portfolio Design Comparisons",
          subtitle: "Evaluate comfort ratings and energy performance across alternative assemblies"
        };
      case '/optimization':
        return {
          title: "Parametric Envelope Optimizer",
          subtitle: "Evaluate multi-parameter combinations to maximize passive thermal performance"
        };
      case '/validation':
        return {
          title: "ANSYS CHT Fluent Validation",
          subtitle: "Compare network calculations with high-resolution CFD simulation residuals"
        };
      default:
        return {
          title: "Passive Shelter Design – Extreme Climate",
          subtitle: "Physics-based thermal comfort predictions and passive envelope optimizer"
        };
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LineChart },
    { path: '/climate', label: 'Climate Data', icon: CloudSun },
    { path: '/design', label: 'Shelter Design', icon: Home },
    { path: '/materials', label: 'Materials Catalog', icon: Database },
    { path: '/simulation', label: 'Simulation Setup', icon: Play },
    { path: '/comparison', label: 'Portfolio Compare', icon: Columns },
    { path: '/optimization', label: 'Parametric Optimizer', icon: Sliders },
    { path: '/validation', label: 'ANSYS Validation', icon: ShieldCheck },
  ];

  const handleSaveDesign = () => {
    addDesignToPortfolio(designName.trim() || undefined);
    setDesignName('');
    setShowSaveModal(false);
  };

  const headerMeta = getPageHeader();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0c0f17] text-slate-950 dark:text-slate-100 transition-colors duration-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#121622] border-r border-slate-200 dark:border-[#1e2638] shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-[#1e2638]">
          <img src={logoImg} alt="ShelterIQ" className="w-9 h-9 rounded-lg object-cover shadow-xs border border-slate-200 dark:border-[#1e2638]" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Shelter<span className="text-blue-500">IQ</span></span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 font-semibold">LAB</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">Passive Envelope Simulator</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-100 dark:bg-[#182030] text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-blue-500/30 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-[#151a28] border border-transparent'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#1e2638] text-[10px] font-mono text-slate-400 space-y-0.5">
          <p className="font-medium text-slate-500 dark:text-slate-400">ShelterIQ v1.2.0 • SIH</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500">Transient Thermal Solver</p>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white dark:bg-[#121622] border-b border-slate-200 dark:border-[#1e2638]">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="ShelterIQ" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-extrabold text-sm tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#182030] text-slate-600 dark:text-slate-300"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile Drawer Modal Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-xs">
          <div className="flex flex-col w-64 bg-white dark:bg-[#121622] p-5 border-r border-slate-200 dark:border-[#1e2638] animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1e2638]">
              <div className="flex items-center gap-2">
                <img src={logoImg} alt="ShelterIQ" className="w-7 h-7 rounded-lg object-cover" />
                <span className="font-extrabold tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#182030] rounded-lg">
                <X size={18} />
              </button>
            </div>
            
            <nav className="flex-1 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-slate-100 dark:bg-[#182030] text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151a28]'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="text-[10px] font-mono text-slate-400 mt-auto border-t border-slate-200 dark:border-[#1e2638] pt-4">
              <p>ShelterIQ v1.2.0 • SIH</p>
              <p className="text-[9px] text-slate-500">Transient Thermal Solver</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-[#1e2638] bg-white/70 dark:bg-[#0c0f17]/80 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {headerMeta.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {headerMeta.subtitle}
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#121622] text-xs font-mono text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[11px] font-medium tracking-tight">{isSimulating ? 'SOLVER ACTIVE' : 'ENGINE: READY'}</span>
            </div>

            {/* Save Design */}
            <button 
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all duration-150 shadow-2xs"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save Portfolio</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-[#121622] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#182030] transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Dashboard Body Page router */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Save Design Modal Dialog */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#121622] rounded-xl border border-slate-200 dark:border-[#1e2638] shadow-2xl w-full max-w-md p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Save size={16} className="text-blue-500" /> Save Design to Portfolio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Add your current customized insulation, structural cores, and openings assembly to the portfolio matrix for side-by-side rankings.
            </p>
            <div className="mt-4">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Design Identifier Name</label>
              <input 
                type="text" 
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g. Slate + XPS 15cm, Triple Glaze"
                className="w-full mt-1.5 bg-slate-50 dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1e2638] rounded-lg px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDesign()}
              />
            </div>
            <div className="flex gap-2.5 justify-end mt-5">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1e2638] bg-white dark:bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#182030]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDesign}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
              >
                Save Assembly
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
