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
    return (<div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      
      <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] shrink-0">
        <div id="shelteriq-sidebar-logo" className="flex items-center gap-3 p-6 border-b border-[var(--border-subtle)]">
          <img id="shelteriq-sidebar-logo-img" src={logoImg} alt="ShelterIQ" className="w-10 h-10 rounded-[10px] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-300"/>
          <div>
            <span className="font-serif font-semibold text-xl tracking-tight text-[var(--text-primary)]">Shelter<span style={{ color: 'var(--accent-primary)' }}>IQ</span></span>
            <div className="text-[10px] text-[var(--text-muted)] font-medium leading-none mt-0.5">Passive Heat Lab</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (<NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium transition-colors duration-150 ${isActive
                    ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-transparent'}`}>
                <Icon size={18} style={{ color: undefined }} />
                {item.label}
              </NavLink>);
        })}
        </nav>

      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] sticky top-0 z-40">
        <Link id="shelteriq-mobile-brand-logo" to="/dashboard" className="flex items-center gap-2.5 cursor-pointer">
          <img
            id="shelteriq-mobile-brand-logo-img"
            src={logoImg}
            alt="ShelterIQ"
            className="w-8 h-8 rounded-[8px] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-300"
          />
          <div>
            <span className="font-serif font-semibold text-lg tracking-tight leading-none block text-[var(--text-primary)]">
              Shelter<span style={{ color: 'var(--accent-primary)' }}>IQ</span>
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-medium leading-none block mt-0.5">Passive Heat Lab</span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowIntro(true)}
            title="App Tour"
            className="p-2 rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface-raised)] transition-colors"
          >
            <Compass size={18} style={{ color: 'var(--accent-primary)' }} />
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition-colors"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="p-2 rounded-[8px] hover:bg-[var(--bg-surface-raised)] text-[var(--text-primary)]"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer with Backdrop Click */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="flex flex-col w-72 max-w-[85vw] bg-[var(--bg-surface)] p-5 border-r border-[var(--border-subtle)] shadow-2xl animate-slide-in h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="ShelterIQ" className="w-8 h-8 rounded-[8px] object-cover" />
                <div>
                  <span className="font-serif font-semibold tracking-tight text-base leading-none block text-[var(--text-primary)]">
                    Shelter<span style={{ color: 'var(--accent-primary)' }}>IQ</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Engineering Suite</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 hover:bg-[var(--bg-surface-raised)] rounded-[8px] text-[var(--text-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] w-fit">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSimulating ? 'var(--accent-primary)' : 'var(--comfort)' }} />
                <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
              </div>
            </div>

            <nav className="flex-1 py-4 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 pb-2">
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
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] font-semibold border border-[var(--accent-primary)]/20'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]'
                      }`
                    }
                  >
                    <Icon size={17} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowIntro(true);
                }}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] font-medium py-1.5"
              >
                <Compass size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Interactive Tour</span>
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5"
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
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md sticky top-0 md:top-0 z-30">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {headerMeta.title}
            </h1>
            <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] mt-0.5 sm:mt-1 line-clamp-2">
              {headerMeta.subtitle}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-xs font-semibold text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSimulating ? 'var(--accent-primary)' : 'var(--comfort)' }} />
              <span>{isSimulating ? 'Simulating...' : 'Passive Model Ready'}</span>
            </div>

            <button
              onClick={() => setShowIntro(true)}
              title="View Interactive Guide & Tour"
              className="p-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface-raised)] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Compass size={16} style={{ color: 'var(--accent-primary)' }} />
              <span className="hidden xl:inline">App Guide</span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] transition-colors cursor-pointer"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] px-2 py-1.5 flex items-center justify-around shadow-[0_-1px_3px_rgba(0,0,0,0.3)] safe-area-bottom">
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
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-[10px] transition-colors ${
                  isActive
                    ? 'text-[var(--accent-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon size={19} className="stroke-[2]" />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Menu size={19} className="stroke-[2]" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Cinematic Intro Animation */}
      <CinematicIntroModal
        isOpen={showIntro}
        onClose={handleCloseIntro}
      />

    </div>);
};
