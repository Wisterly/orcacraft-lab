import React from 'react';
import { X, Briefcase, CheckCircle2, ShieldAlert, ArrowRight, Layers, PlusCircle } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import { computeBudgetLines, computeWBSSummary, formatCurrencyBRL } from '../utils/mathEngine';

export const ContractSelectorModal: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    isContractModalOpen,
    setContractModalOpen,
    selectContract,
    setActiveTab,
    setResolvingInconsistency,
  } = useBudgetStore();

  if (!isContractModalOpen) return null;

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const currentLines = computeBudgetLines(demands, selectedDemands, activeContract);
  const unmatchedLines = currentLines.filter(
    (l) => l.enabled && l.contractStatus === 'UNMATCHED'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-[#131720] border border-[#262C3A] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-6 bg-[#191D26] border-b border-[#262C3A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4A359]/15 border border-[#D4A359]/40 flex items-center justify-center text-[#D4A359]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-[#F8FAFC]">
                Engine de Compatibilização Contratual (INNER/LEFT JOIN)
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Selecione uma Ata ou Contrato cadastrado para substituir preços estimados pelos unitários oficiais e aplicar o BDI vigente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setContractModalOpen(false)}
            className="p-2 rounded-lg bg-[#212632] text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Contratos */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Opção Sem Contrato (Catálogo Base) */}
          <div
            onClick={() => selectContract(null)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              activeContractId === null
                ? 'card-selected-overlay border-[#D4A359] shadow-gold-glow'
                : 'bg-[#191D26] border-[#262C3A] hover:border-[#D4A359]/40'
            }`}
          >
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#94A3B8]">
                Referência Paramétrica Interna
              </span>
              <h3 className="font-heading text-base font-bold text-[#F8FAFC] mt-0.5">
                Orçamento Base de Catálogo (Sem Contrato Vinculado)
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Utiliza os preços médios estimados do catálogo SINAPI/SEINFRA sem aplicação de BDI contratual específico.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#94A3B8] block">Total Estimado</span>
              <span className="font-heading text-base font-bold text-[#D4A359] tabular-nums">
                {formatCurrencyBRL(
                  computeWBSSummary(computeBudgetLines(demands, selectedDemands, null)).total
                )}
              </span>
            </div>
          </div>

          {/* Contratos Cadastrados */}
          {contracts.map((contract) => {
            const isSelected = activeContractId === contract.id;
            const simulatedLines = computeBudgetLines(demands, selectedDemands, contract);
            const simulatedTotal = computeWBSSummary(simulatedLines).total;
            const simulatedUnmatched = simulatedLines.filter(
              (l) => l.enabled && l.contractStatus === 'UNMATCHED'
            );
            const matchedCount = simulatedLines.filter(
              (l) => l.enabled && l.contractStatus !== 'UNMATCHED'
            ).length;

            return (
              <div
                key={contract.id}
                onClick={() => selectContract(contract.id)}
                className={`p-5 rounded-xl border cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? 'card-selected-overlay border-[1.5px] border-[#D4A359] shadow-gold-glow'
                    : 'bg-[#191D26] border-[#262C3A] hover:border-[#D4A359]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#D4A359]/20 text-[#D4A359] text-[11px] font-bold">
                        {contract.ataNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#131720] border border-[#262C3A] text-[#94A3B8] text-[11px] font-medium">
                        {contract.taxRegime === 'DESONERADO' ? 'Desonerado' : 'Não Desonerado'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#131720] border border-[#262C3A] text-[#D4A359] text-[11px] font-bold tabular-nums">
                        BDI {contract.bdiPercent.toFixed(2)}%
                      </span>
                    </div>

                    <h3 className="font-heading text-base font-bold text-[#F8FAFC] mt-1.5">
                      {contract.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8]">{contract.agency}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-[#94A3B8] block">
                      Total Compatibilizado (c/ BDI)
                    </span>
                    <span className="font-heading text-lg font-bold text-[#D4A359] tabular-nums">
                      {formatCurrencyBRL(simulatedTotal)}
                    </span>
                  </div>
                </div>

                {/* Telemetria do Cruzamento (JOIN) */}
                <div className="pt-3 border-t border-[#262C3A]/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="tabular-nums">
                        {matchedCount} itens localizados na planilha ({contract.priceTable.length} preços indexados)
                      </span>
                    </span>

                    {simulatedUnmatched.length > 0 && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#D97724]/20 border border-[#D97724]/50 text-[#D97724] font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="tabular-nums">
                          {simulatedUnmatched.length} inconsistência(s) De-Para
                        </span>
                      </span>
                    )}
                  </div>

                  {contract.templateFileName && (
                    <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#D4A359]" />
                      Template: {contract.templateFileName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Painel Rápido de Inconsistências do Contrato Selecionado */}
          {activeContract && unmatchedLines.length > 0 && (
            <div className="p-4 rounded-xl bg-[#D97724]/10 border border-[#D97724] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-[#D97724]">
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    Itens da Demanda ausentes na Planilha do Contrato ({unmatchedLines.length})
                  </span>
                </div>
                <span className="text-[11px] text-[#94A3B8]">
                  Clique em um item para mapear código equivalente ou composição própria
                </span>
              </div>

              <div className="space-y-2">
                {unmatchedLines.map((item) => (
                  <div
                    key={item.lineId}
                    className="p-3 rounded-lg bg-[#131720] border border-[#262C3A] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#D97724]/20 text-[#D97724] font-mono text-xs font-bold">
                          {item.originalCode}
                        </span>
                        <span className="text-xs font-semibold text-[#F8FAFC]">
                          {item.demandTitle}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">{item.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setResolvingInconsistency({
                          demandId: item.demandId,
                          serviceId: item.serviceId,
                          originalCode: item.originalCode,
                          description: item.description,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#D97724] hover:bg-[#D97724]/90 text-[#FFFFFF] text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <span>Resolver De-Para</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-[#191D26] border-t border-[#262C3A] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setContractModalOpen(false);
              setActiveTab('SETTINGS');
            }}
            className="text-xs text-[#D4A359] hover:underline flex items-center gap-1.5 font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Novo Contrato / Subir Planilha Mestra (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setContractModalOpen(false)}
            className="px-6 py-2.5 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs transition-colors"
          >
            Confirmar e Aplicar Contrato
          </button>
        </div>
      </div>
    </div>
  );
};
