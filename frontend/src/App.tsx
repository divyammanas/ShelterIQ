import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ClimateData } from './pages/ClimateData';
import { ShelterDesign } from './pages/ShelterDesign';
import { MaterialsCatalog } from './pages/MaterialsCatalog';
import { SimulationSetup } from './pages/SimulationSetup';
import { PortfolioCompare } from './pages/PortfolioCompare';
import { AutoOptimizer } from './pages/AutoOptimizer';
import { AnsysValidation } from './pages/AnsysValidation';

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="climate" element={<ClimateData />} />
            <Route path="design" element={<ShelterDesign />} />
            <Route path="materials" element={<MaterialsCatalog />} />
            <Route path="simulation" element={<SimulationSetup />} />
            <Route path="comparison" element={<PortfolioCompare />} />
            <Route path="optimization" element={<AutoOptimizer />} />
            <Route path="validation" element={<AnsysValidation />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}

export default App;
