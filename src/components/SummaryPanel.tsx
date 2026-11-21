import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Briefcase,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  computeBudgetLines,
  computeWBSSummary,
  formatCurrencyBRL,
} from '../utils/mathEngine';
import { exportBudgetToPdf, exportBudgetToXlsx } from '../utils/exportEngine';

export const SummaryPanel: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    isAiAllocating,
    aiAllocationSummary,
    aiAllocationStats,
    runAiContractAllocation,
    setContractModalOpen,
    setExportModalOpen,
    setResolvingInconsistency,
    setInspectingDemandId,
    openModularDrawer,
    removeDemand,
  } = useBudgetStore();

  const [expandedDemandId, setExpandedDemandId] = useState<string | null>(null);

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const lines = computeBudgetLines(demands, selectedDemands, activeContract);
  const wbs = computeWBSSummary(lines);

  const selectedDemandList = demands.filter((d) => Boolean(selectedDemands[d.id]));
  const unmatchedLines = lines.filter((l) => l.enabled && l.contractStatus === 'UNMATCHED');

  const scopeTitle =
    selectedDemandList.length === 1
      ? selectedDemandList[0].title
      : selectedDemandList.length > 1
      ? `${selectedDemandList[0].title} + ${selectedDemandList.length - 1} Escopo(s)`
      : 'Orçamento Vazio';

  const totalEstimatedArea = selectedDemandList.reduce((acc, d) => {
    return acc + (d.defaultAreaM2 || 40);
  }, 0);

  return (
    <aside className="w-[340px] h-full bg-[#131720] border-l border-[#1F2430] flex flex-col justify-between p-5 shrink-0 select-none overflow-y-auto">
      <div className="space-y-4">
        {/* Card Resumo do Orçamento Atual */}
        <div className="rounded-xl bg-[#191D26] border border-[#262C3A] p-4 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#262C3A] pb-3">
            <h2 className="font-heading text-[15px] font-bold text-[#F8FAFC]">
              Resumo do Orçamento Atual
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#D4A359]/15 text-[#D4A359] font-semibold tabular-nums">
              {selectedDemandList.length} escopo(s)
            </span>
          </div>

          {/* Lista Agrupada por Demanda / Ambiente (Visão Limpa) */}
          {selectedDemandList.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[#94A3B8]">
                Nenhuma demanda ativa no orçamento.
              </p>
              <p className="text-[11px] text-[#94A3B8]/70">
                Selecione um pacote fechado ou configure serviços variáveis no catálogo.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {selectedDemandList.map((demand) => {
                const cfg = selectedDemands[demand.id];
                const demandLines = lines.filter((l) => l.demandId === demand.id && l.enabled);
                const demandSubtotal = demandLines.reduce((acc, l) => acc + l.totalPrice, 0);
                const isExpanded = expandedDemandId === demand.id;

                // Para serviços variáveis, lista os sub-itens marcados
                const subItemSummaryParts: string[] = [];
                if (demand.type === 'MODULAR' && demand.subItems && cfg?.selectedSubItems) {
                  for (const sub of demand.subItems) {
                    const sel = cfg.selectedSubItems[sub.id];
                    if (sel && sel.enabled && sel.qty > 0) {
                      subItemSummaryParts.push(`${sel.qty}x ${sub.title}`);
                    }
                  }
                }

                return (
                  <div
                    key={demand.id}
                    className="p-3 rounded-lg bg-[#212632]/70 border border-[#262C3A] hover:border-[#D4A359]/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {demand.type === 'PACKAGE' ? (
                            <Package className="w-3.5 h-3.5 text-[#D4A359]" />
                          ) : (
                            <Layers className="w-3.5 h-3.5 text-[#D97724]" />
                          )}
                          <p className="text-xs font-bold text-[#F8FAFC] leading-snug">
                            {demand.title}
                          </p>
                        </div>

                        {demand.type === 'PACKAGE' ? (
                          <p className="text-[11px] text-[#94A3B8] tabular-nums mt-0.5">
                            Multiplicador: {cfg?.quantityUn || 1} UN
                          </p>
                        ) : (
                          <p className="text-[11px] text-[#D4A359] mt-0.5 font-medium line-clamp-1">
                            {subItemSummaryParts.length > 0
                              ? subItemSummaryParts.join(' • ')
                              : 'Configuração modular'}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#D4A359] tabular-nums block">
                          {formatCurrencyBRL(demandSubtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDemand(demand.id)}
                          className="text-[#94A3B8] hover:text-red-400 p-0.5 mt-0.5"
                          title="Remover do orçamento"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Botão discreto Ver Composição */}
                    <div className="pt-2 border-t border-[#262C3A]/70 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setExpandedDemandId(isExpanded ? null : demand.id)}
                        className="text-[#94A3B8] hover:text-[#D4A359] flex items-center gap-1 font-medium transition-colors"
                      >
                        <span>Ver composição ({demandLines.length} itens)</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {demand.type === 'PACKAGE' ? (
                        <button
                          type="button"
                          onClick={() => setInspectingDemandId(demand.id)}
                          className="text-[#D4A359] hover:underline"
                        >
                          Auditar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModularDrawer(demand.id)}
                          className="text-[#D97724] hover:underline font-medium"
                        >
                          Editar Ambientes
                        </button>
                      )}
                    </div>

                    {/* Visualização expandida dos serviços unitários */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-[#262C3A] space-y-1.5 text-[10px] text-[#94A3B8]">
                        {demandLines.map((line) => (
                          <div
                            key={line.lineId}
                            className="flex items-center justify-between gap-2 py-0.5"
                          >
                            <span className="truncate max-w-[170px]" title={line.description}>
                              <strong className="text-[#D4A359] font-mono mr-1">
                                {line.effectiveCode}
                              </strong>
                              {line.description}
                            </span>
                            <span className="font-mono text-[#F8FAFC] tabular-nums shrink-0">
                              {formatCurrencyBRL(line.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Status da Alocação Cognitiva IA no Contrato */}
          {isAiAllocating && (
            <div className="p-3 rounded-lg bg-[#D4A359]/15 border border-[#D4A359]/50 flex items-center gap-2.5 text-xs text-[#D4A359]">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>IA Gemini: Alocando e adequando composições na planilha do contrato...</span>
            </div>
          )}

          {activeContract && !isAiAllocating && unmatchedLines.length > 0 && (
            <div className="p-3 rounded-lg bg-[#D97724]/12 border border-[#D97724]/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#D97724]">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{unmatchedLines.length} item(ns) aguardando alocação</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => runAiContractAllocation()}
                className="w-full py-1.5 px-2.5 rounded bg-gradient-to-r from-[#D4A359] to-[#D97724] text-[#0D0F13] font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Alocar & Adequar na Planilha com IA</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setResolvingInconsistency({
                    demandId: unmatchedLines[0].demandId,
                    serviceId: unmatchedLines[0].serviceId,
                    originalCode: unmatchedLines[0].originalCode,
                    description: unmatchedLines[0].description,
                  })
                }
                className="w-full text-center py-1 rounded bg-[#212632] hover:bg-[#262C3A] text-[#94A3B8] hover:text-white font-semibold text-[10px]"
              >
                Ou mapear manualmente
              </button>
            </div>
          )}

          {activeContract && !isAiAllocating && unmatchedLines.length === 0 && selectedDemandList.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>Planilha 100% Adequada pela IA</span>
                </div>
                <button
                  type="button"
                  onClick={() => runAiContractAllocation()}
                  className="text-[10px] text-[#D4A359] hover:underline flex items-center gap-1"
                  title="Recalcular alocação com a IA"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Readequar</span>
                </button>
              </div>
              <p className="text-[10px] text-emerald-200/80 leading-relaxed">
                {aiAllocationStats
                  ? `${aiAllocationStats.directCount} alocado(s) direto e ${aiAllocationStats.reallocatedCount} realocado(s)/adequado(s) pela IA na planilha ${activeContract.ataNumber}.`
                  : `Todos os serviços alocados nos itens de ${activeContract.ataNumber}.`}
              </p>
            </div>
          )}

          {/* Subtotal Consolidado */}
          <div className="pt-3 border-t border-[#262C3A] flex items-baseline justify-between">
            <div>
              <span className="text-sm font-semibold text-[#94A3B8]">Total Parcial</span>
              {activeContract && (
                <span className="block text-[10px] text-[#D4A359] tabular-nums">
                  BDI {activeContract.bdiPercent.toFixed(2)}% (Truncado no centavo)
                </span>
              )}
            </div>
            <span className="font-heading text-[18px] font-bold text-[#F8FAFC] tabular-nums">
              {formatCurrencyBRL(wbs.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Stack (CTAs) */}
      <div className="space-y-3 pt-4">
        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => setContractModalOpen(true)}
          className="w-full py-3 px-4 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Briefcase className="w-4 h-4 stroke-[2.2]" />
          <span>{activeContract ? 'Trocar Contrato / Planilha' : 'Selecionar Contrato de Destino'}</span>
        </button>

        {/* Secondary CTA */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={selectedDemandList.length === 0 || isAiAllocating}
            onClick={async () => {
              if (activeContract) {
                await runAiContractAllocation();
              }
              setExportModalOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-[#191D26] hover:bg-[#212632] disabled:opacity-40 disabled:pointer-events-none border border-[#D4A359] text-[#F8FAFC] font-heading font-semibold text-sm transition-all flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#D4A359]" />
              <span>Gerar Planilha Final (IA)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3" />
                XLSX
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                <FileText className="w-3 h-3" />
                PDF
              </span>
            </div>
          </button>

          {/* Atalhos diretos de 1 clique com Alocação IA */}
          {selectedDemandList.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isAiAllocating}
                onClick={async () => {
                  if (activeContract) {
                    await runAiContractAllocation();
                  }
                  const updatedLines = computeBudgetLines(
                    useBudgetStore.getState().demands,
                    useBudgetStore.getState().selectedDemands,
                    activeContract
                  );
                  exportBudgetToXlsx(updatedLines, activeContract, scopeTitle, totalEstimatedArea);
                }}
                className="py-1.5 px-2.5 rounded bg-[#191D26] hover:bg-[#212632] border border-[#262C3A] hover:border-emerald-500/50 text-[11px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Baixar .XLSX (IA)</span>
              </button>
              <button
                type="button"
                disabled={isAiAllocating}
                onClick={async () => {
                  if (activeContract) {
                    await runAiContractAllocation();
                  }
                  const updatedLines = computeBudgetLines(
                    useBudgetStore.getState().demands,
                    useBudgetStore.getState().selectedDemands,
                    activeContract
                  );
                  exportBudgetToPdf(updatedLines, activeContract, scopeTitle, totalEstimatedArea);
                }}
                className="py-1.5 px-2.5 rounded bg-[#191D26] hover:bg-[#212632] border border-[#262C3A] hover:border-rose-500/50 text-[11px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Baixar .PDF (IA)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
