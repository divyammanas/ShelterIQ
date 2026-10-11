import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { LineChart, CloudSun, Home, Database, Play, Columns, Sparkles, ShieldCheck, Sun, Moon, Menu, X, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CinematicIntroModal } from './CinematicIntroModal';


export const Layout = () => {
  const { isDarkMode, setIsDarkMode, isSimulating } = useApp();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showIntro, setShowIntro] = useState(() => {
      return sessionStorage.getItem('shelteriq_intro_seen') !== 'true';
    });
    const location = useLocation();

    const handleCloseIntro = () => {
      sessionStorage.setItem('shelteriq_intro_seen', 'true');
      setShowIntro(false);
    };
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
        { path: '/validation', label: 'ANSYS Validation', icon: ShieldCheck },
    ];
    const headerMeta = getPageHeader();
    return (<div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 transition-colors duration-200">
      
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-[#0c0c0f] border-r border-zinc-200 dark:border-zinc-800 shrink-0">
        <div id="shelteriq-sidebar-logo" className="flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-800">
          <img id="shelteriq-sidebar-logo-img" src={logoImg} alt="ShelterIQ" className="w-10 h-10 rounded-xl object-cover shadow-md transition-transform duration-300"/>
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

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#0c0c0f]/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <Link id="shelteriq-mobile-brand-logo" to="/dashboard" className="flex items-center gap-2.5 cursor-pointer">
          <img
            id="shelteriq-mobile-brand-logo-img"
            src={logoImg}
            alt="ShelterIQ"
            className="w-8 h-8 rounded-lg object-cover shadow-xs transition-transform duration-300"
          />
          <div>
            <span className="font-extrabold text-base tracking-tight leading-none block">
              Shelter<span className="text-blue-500">IQ</span>
            </span>
            <span className="text-[9px] text-zinc-400 font-medium leading-none block mt-0.5">Passive Heat Lab</span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowIntro(true)}
            title="App Tour"
            className="p-2 rounded-lg text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <Compass size={18} className="text-blue-500" />
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer with Backdrop Click */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-zinc-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="flex flex-col w-72 max-w-[85vw] bg-white dark:bg-[#0c0c0f] p-5 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl animate-slide-in h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="ShelterIQ" className="w-8 h-8 rounded-lg object-cover" />
                <div>
                  <span className="font-extrabold tracking-tight text-base leading-none block">
                    Shelter<span className="text-blue-500">IQ</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Engineering Suite</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-fit">
                <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
              </div>
            </div>

            <nav className="flex-1 py-4 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pb-2">
                All Modules
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/30'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`
                    }
                  >
                    <Icon size={17} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowIntro(true);
                }}
                className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 font-medium py-1.5"
              >
                <Compass size={16} className="text-blue-500" />
                <span>Interactive Tour</span>
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 py-1.5"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#0c0c0f]/70 backdrop-blur-md sticky top-0 md:top-0 z-30">
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
              {headerMeta.title}
            </h1>
            <p className="text-[11px] sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 line-clamp-2">
              {headerMeta.subtitle}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
            </div>

            <button
              onClick={() => setShowIntro(true)}
              title="View Interactive Guide & Tour"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Compass size={16} className="text-blue-500" />
              <span className="hidden xl:inline">App Guide</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Sleek Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] safe-area-bottom">
        {[
          { path: '/dashboard', label: 'Dashboard', icon: LineChart },
          { path: '/climate', label: 'Climate', icon: CloudSun },
          { path: '/design', label: 'Design', icon: Home },
          { path: '/materials', label: 'Materials', icon: Database },
          { path: '/comparison', label: 'Compare', icon: Columns },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`
              }
            >
              <Icon size={19} className="stroke-[2.2]" />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
        >
          <Menu size={19} className="stroke-[2.2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Cinematic Intro Animation with Netflix-Dark Theme & Minimization into ShelterIQ Logo */}
      <CinematicIntroModal
        isOpen={showIntro}
        onClose={handleCloseIntro}
      />

    </div>);
};
