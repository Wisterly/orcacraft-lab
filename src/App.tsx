import React, { useEffect } from 'react';
import { Topbar } from './components/Topbar';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { SummaryPanel } from './components/SummaryPanel';
import { SettingsView } from './components/SettingsView';
import { WbsInspectionDrawer } from './components/WbsInspectionDrawer';
import { ModularConstructorDrawer } from './components/ModularConstructorDrawer';
import { ContractSelectorModal } from './components/ContractSelectorModal';
import { InconsistencyResolverModal } from './components/InconsistencyResolverModal';
import { ExportReportModal } from './components/ExportReportModal';
import { useBudgetStore } from './store/useBudgetStore';

export const App: React.FC = () => {
  const { activeTab, fetchFromCloud } = useBudgetStore();

  // Ao abrir o app em qualquer computador ou navegador, carrega automaticamente o estado persistido na nuvem
  useEffect(() => {
    fetchFromCloud();
  }, [fetchFromCloud]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0D0F13] text-[#F8FAFC] flex flex-col">
      {/* 1. Topbar Global (com identidade institucional SEDUC / Governo do Piauí e fachada perfeitamente enquadrada) */}
      <Topbar />

      {/* App Shell de 3 Colunas: Sidebar (240px) + Workspace Central + Summary Panel (340px) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {activeTab === 'HOME' ? (
          <>
            <HomeView />
            <SummaryPanel />
          </>
        ) : (
          <SettingsView />
        )}
      </div>

      {/* Drawers e Modais Globais */}
      <WbsInspectionDrawer />
      <ModularConstructorDrawer />
      <ContractSelectorModal />
      <InconsistencyResolverModal />
      <ExportReportModal />
    </div>
  );
};

export default App;
