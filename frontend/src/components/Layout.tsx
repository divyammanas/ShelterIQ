import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LineChart, 
  CloudSun, 
  Home, 
  Database, 
  Play, 
  Columns, 
  Sparkles, 
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
          title: "Design Space Auto-Optimizer",
          subtitle: "Evaluate multi-parameter combinations to maximize passive performance"
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
    { path: '/optimization', label: 'Auto-Optimizer', icon: Sparkles },
    { path: '/validation', label: 'ANSYS Validation', icon: ShieldCheck },
  ];

  const handleSaveDesign = () => {
    addDesignToPortfolio(designName.trim() || undefined);
    setDesignName('');
    setShowSaveModal(false);
  };

  const headerMeta = getPageHeader();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0c0c0f] border-r border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold text-lg shadow-md shadow-blue-500/20">
            IQ
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
            <div className="text-[10px] text-zinc-400 font-medium leading-none">Passive Heat Lab</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30'
                      : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 border border-transparent'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-medium">
          <p>ShelterIQ v1.2.0-Alpha</p>
          <p>© 2026 Passive Heat Lab</p>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0c0c0f] border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold text-sm">
            IQ
          </div>
          <span className="font-extrabold text-md tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Drawer Modal Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex flex-col w-64 bg-white dark:bg-[#0c0c0f] p-6 border-r border-zinc-200 dark:border-zinc-800 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm">IQ</div>
                <span className="font-extrabold tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <nav className="flex-1 py-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="text-[10px] text-zinc-400 mt-auto border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <p>ShelterIQ v1.2.0-Alpha</p>
              <p>© 2026 Passive Heat Lab</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-[#0c0c0f]/50 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {headerMeta.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {headerMeta.subtitle}
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
            {/* Status indicators */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
            </div>

            {/* Save Design */}
            <button 
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150 shadow-sm shadow-blue-500/10"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save Portfolio</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0c0c0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
              <Save className="text-blue-500" /> Save Design to Portfolio
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Add your current customized insulation, structural cores, and openings assembly to the portfolio matrix for side-by-side rankings.
            </p>
            <div className="mt-4">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Design Identifier Name</label>
              <input 
                type="text" 
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g. Slate + XPS 15cm, Triple Glaze"
                className="w-full mt-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-zinc-950 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDesign()}
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDesign}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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
