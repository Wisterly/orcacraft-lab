import React, { useState } from 'react';
import {
  Layers,
  Package,
  Sliders,
  Briefcase,
  Sparkles,
  Send,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import { DemandCardItem } from './DemandCardItem';
import { computeBudgetLines, computeWBSSummary, formatCurrencyBRL } from '../utils/mathEngine';

export const HomeView: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    isAiAllocating,
    catalogFilter,
    setCatalogFilter,
    setContractModalOpen,
    generateDemandFromFreePromptWithIA,
  } = useBudgetStore();

  const [aiPromptText, setAiPromptText] = useState('');
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(null);

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const lines = computeBudgetLines(demands, selectedDemands, activeContract);
  const wbs = computeWBSSummary(lines);

  const activeDemandCount = Object.keys(selectedDemands).length;

  // Filtro de catálogo
  const filteredDemands = demands.filter((d) => {
    if (catalogFilter === 'PACKAGE') return d.type === 'PACKAGE';
    if (catalogFilter === 'MODULAR') return d.type === 'MODULAR';
    return true;
  });

  const packageCount = demands.filter((d) => d.type === 'PACKAGE').length;
  const modularCount = demands.filter((d) => d.type === 'MODULAR').length;

  const handleAiPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPromptText.trim() || isAiAllocating) return;
    const res = await generateDemandFromFreePromptWithIA(aiPromptText);
    setAiStatusMsg(res.message);
    if (res.success) {
      setAiPromptText('');
      setTimeout(() => setAiStatusMsg(null), 5000);
    }
  };

  return (
    <main className="flex-1 h-full overflow-y-auto px-7 py-6 flex flex-col justify-between">
      <div className="space-y-5">
        {/* Dynamic Header & Filtro Rápido */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262C3A] pb-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              Montagem de Orçamento
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Selecione kits parametrizados, ajuste variáveis por ambiente ou digite os serviços na caixa da IA para alocar direto na planilha do contrato.
            </p>
          </div>

          {/* Pills de Filtro Rápido */}
          <div className="flex items-center bg-[#161A22] p-1 rounded-xl border border-[#262C3A]">
            <button
              type="button"
              onClick={() => setCatalogFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
                catalogFilter === 'ALL'
                  ? 'bg-[#D4A359] text-[#0D0F13] shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos ({demands.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCatalogFilter('PACKAGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
                catalogFilter === 'PACKAGE'
                  ? 'bg-[#D4A359] text-[#0D0F13] shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pacotes Fechados ({packageCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCatalogFilter('MODULAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition-all ${
                catalogFilter === 'MODULAR'
                  ? 'bg-[#D97724] text-[#FFFFFF] shadow-xs'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Serviços Variáveis ({modularCount})</span>
            </button>
          </div>
        </div>

        {/* Caixa de Diálogo Direta do Motor IA (Gemini) na Aba Home */}
        <form
          onSubmit={handleAiPromptSubmit}
          className="p-4 rounded-xl bg-gradient-to-r from-[#161A22] via-[#1C222E] to-[#161A22] border border-[#D4A359]/40 shadow-lg space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#D4A359]">
              <Sparkles className="w-4 h-4" />
              <span>Montar Demanda por Comando de Texto (IA Gemini)</span>
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              A IA decompõe preliminares, estrutura e acabamentos e aloca os quantitativos na planilha de{' '}
              <strong className="text-[#F8FAFC]">
                {activeContract ? activeContract.name : 'seu contrato selecionado'}
              </strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={aiPromptText}
              onChange={(e) => setAiPromptText(e.target.value)}
              placeholder="Digite o que deseja executar (ex: Montar caixa d'água com castelo d'água e base estrutural, ou Pintar 4 salas de aula 6x5m e muro 150m²)..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#0D0F13] border border-[#262C3A] focus:border-[#D4A359] text-xs text-[#F8FAFC] placeholder-[#94A3B8]/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAiAllocating || !aiPromptText.trim()}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4A359] to-[#D97724] text-[#0D0F13] font-heading font-extrabold text-xs hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
            >
              {isAiAllocating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Montando na Planilha...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Montar e Alocar na Planilha</span>
                </>
              )}
            </button>
          </div>

          {aiStatusMsg && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{aiStatusMsg}</span>
            </div>
          )}
        </form>

        {/* Telemetry Pill Bar */}
        <div className="w-full bg-[#161A22] border border-[#262C3A] rounded-[8px] px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-sm shadow-sm select-none">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Demandas Ativas:</span>
              <strong className="font-heading font-bold text-[#D4A359] tabular-nums">
                {activeDemandCount}
              </strong>
            </div>

            <span className="text-[#262C3A] select-none hidden sm:inline">|</span>

            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Valor Estimado:</span>
              <strong className="font-heading font-bold text-[#D4A359] tabular-nums">
                {formatCurrencyBRL(wbs.total)}
              </strong>
            </div>

            <span className="text-[#262C3A] select-none hidden sm:inline">|</span>

            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">Planilha Base / Contrato:</span>
              {activeContract ? (
                <span className="font-heading font-semibold text-[#D4A359] truncate max-w-[260px]">
                  {activeContract.name} ({activeContract.ataNumber})
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setContractModalOpen(true)}
                  className="text-xs text-[#94A3B8] hover:text-[#D4A359] underline font-medium"
                >
                  Não selecionado (Vincular Ata)
                </button>
              )}
            </div>
          </div>

          {activeContract && (
            <button
              type="button"
              onClick={() => setContractModalOpen(true)}
              className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1 bg-[#191D26] px-2.5 py-1 rounded border border-[#262C3A]"
            >
              <Briefcase className="w-3 h-3 text-[#D4A359]" />
              <span>Trocar Planilha / Contrato</span>
            </button>
          )}
        </div>

        {/* Catálogo de Demandas (Responsive Grid 3 colunas) */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDemands.map((demand) => (
              <DemandCardItem key={demand.id} demand={demand} />
            ))}
          </div>
        </section>
      </div>

      {/* Footer Discreto */}
      <footer className="pt-8 pb-2 text-center text-xs text-[#94A3B8]/70 select-none">
        Copyright © 2026 OrçaCraft.lab | Versão 1.2.0
      </footer>
    </main>
  );
};
