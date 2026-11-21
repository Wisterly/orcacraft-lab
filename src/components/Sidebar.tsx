import React from 'react';
import { Home, Settings, Layers, RotateCcw, Cpu } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, demands, contracts, resetDemoData, isAiAllocating } = useBudgetStore();

  return (
    <aside className="w-[240px] h-full bg-[#131720] border-r border-[#1F2430] flex flex-col justify-between p-4 select-none shrink-0">
      <div className="space-y-2">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/70">
          Navegação Principal
        </div>

        {/* Módulo Home (Montador de Orçamentos) */}
        <button
          onClick={() => setActiveTab('HOME')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'HOME'
              ? 'sidebar-active-pill text-[#FFFFFF] shadow-md'
              : 'text-[#94A3B8] hover:bg-[#212632] hover:text-[#F8FAFC]'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Home</span>
        </button>

        {/* Módulo Configurações (Gestão de Bases & Templates) */}
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'SETTINGS'
              ? 'sidebar-active-pill text-[#FFFFFF] shadow-md'
              : 'text-[#94A3B8] hover:bg-[#212632] hover:text-[#F8FAFC]'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Configurações</span>
        </button>
      </div>

      {/* Status do Motor IA na Base do Projeto + Bases Indexadas */}
      <div className="space-y-3 pt-4 border-t border-[#1F2430]">
        <div className="p-2.5 rounded-lg bg-emerald-950/35 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className={`w-3.5 h-3.5 text-emerald-400 ${isAiAllocating ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-bold text-emerald-200">Cérebro IA Gemini</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isAiAllocating ? 'Alocando...' : 'Ativo'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#191D26] border border-[#262C3A] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC]">
            <Layers className="w-3.5 h-3.5 text-[#D4A359]" />
            <span>Bases Indexadas</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Kits de Demanda:</span>
            <span className="font-semibold text-[#D4A359] tabular-nums">{demands.length}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Contratos / Atas:</span>
            <span className="font-semibold text-[#D4A359] tabular-nums">{contracts.length}</span>
          </div>
        </div>

        <button
          onClick={resetDemoData}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#212632] transition-colors"
          title="Restaurar estado inicial de demonstração"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restaurar Padrão Demo</span>
        </button>
      </div>
    </aside>
  );
};
