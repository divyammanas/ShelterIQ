import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { LineChart, CloudSun, Home, Database, Play, Columns, Sparkles, ShieldCheck, Sun, Moon, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
export const Layout = () => {
  const { isDarkMode, setIsDarkMode, isSimulating } = useApp();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
                title: "Design Compare",
                subtitle: "Compare material assemblies under the active climate profile"
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
        { path: '/comparison', label: 'Design Compare', icon: Columns },
        { path: '/optimization', label: 'Auto-Optimizer', icon: Sparkles },
        { path: '/validation', label: 'ANSYS Validation', icon: ShieldCheck },
    ];
    const headerMeta = getPageHeader();
    return (<div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0c0c0f] border-r border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-800">
          <img src={logoImg} alt="ShelterIQ" className="w-10 h-10 rounded-xl object-cover shadow-md"/>
          <div>
            <span className="font-extrabold text-lg tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
            <div className="text-[10px] text-zinc-400 font-medium leading-none">Passive Heat Lab</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (<NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 border border-transparent'}`}>
                <Icon size={18}/>
                {item.label}
              </NavLink>);
        })}
        </nav>

      </aside>

      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0c0c0f] border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="ShelterIQ" className="w-8 h-8 rounded-lg object-cover"/>
          <span className="font-extrabold text-md tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <Menu size={20}/>
        </button>
      </div>

      {mobileMenuOpen && (<div className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex flex-col w-64 bg-white dark:bg-[#0c0c0f] p-6 border-r border-zinc-200 dark:border-zinc-800 animate-slide-in">
            <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <img src={logoImg} alt="ShelterIQ" className="w-8 h-8 rounded-lg object-cover"/>
                <span className="font-extrabold tracking-tight">Shelter<span className="text-blue-500">IQ</span></span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg">
                <X size={20}/>
              </button>
            </div>
            
            <nav className="flex-1 py-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (<NavLink key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}>
                    <Icon size={18}/>
                    {item.label}
                  </NavLink>);
            })}
            </nav>

          </div>
        </div>)}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}/>
              <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
            </div>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
              {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

    </div>);
};
