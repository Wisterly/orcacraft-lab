import React from 'react';
import { X, CheckSquare, Square, AlertTriangle, RotateCcw, Layers } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import { ChronoGroup } from '../types/budget';
import { computeBudgetLines, formatCurrencyBRL, formatNumberBR } from '../utils/mathEngine';

const CHRONO_GROUPS: { key: ChronoGroup; title: string; subtitle: string }[] = [
  {
    key: 'SERVICOS_PRELIMINARES',
    title: '1. Serviços Preliminares',
    subtitle: 'Locação, demolições, escavações e preparação de canteiro',
  },
  {
    key: 'SERVICOS_DURANTE_OBRA',
    title: '2. Serviços Durante a Obra (Infraestrutura, Alvenaria, Instalações, Coberta)',
    subtitle: 'Estrutura de concreto, vedações, redes técnicas e telhamento',
  },
  {
    key: 'ACABAMENTOS_POS_OBRA',
    title: '3. Acabamentos & Pós-Obra',
    subtitle: 'Revestimentos cerâmicos, pintura, louças, metais e entrega final',
  },
];

export const WbsInspectionDrawer: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    inspectingDemandId,
    setInspectingDemandId,
    togglePackageServiceItemEnabled,
    updatePackageServiceItemCustomQty,
    setResolvingInconsistency,
  } = useBudgetStore();

  if (!inspectingDemandId) return null;

  const demand = demands.find((d) => d.id === inspectingDemandId);
  const config = selectedDemands[inspectingDemandId];
  if (!demand || !config) return null;

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const allLines = computeBudgetLines(demands, selectedDemands, activeContract);
  const demandLines = allLines.filter((l) => l.demandId === demand.id);
  const activeSubtotal = demandLines
    .filter((l) => l.enabled)
    .reduce((acc, l) => acc + l.totalPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl h-full bg-[#131720] border-l border-[#262C3A] flex flex-col justify-between shadow-2xl">
        {/* Header do Drawer */}
        <div className="p-6 bg-[#191D26] border-b border-[#262C3A] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#D4A359]/15 text-[#D4A359] text-[11px] font-bold uppercase tracking-wider">
                Inspeção Granular WBS
              </span>
              {activeContract && (
                <span className="px-2 py-0.5 rounded bg-[#212632] border border-[#262C3A] text-[#94A3B8] text-[11px] tabular-nums">
                  {activeContract.ataNumber} • BDI {activeContract.bdiPercent.toFixed(2)}%
                </span>
              )}
            </div>
            <h2 className="font-heading text-xl font-bold text-[#F8FAFC] mt-1">
              {demand.title}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Ative/desative composições unitárias ou edite quantitativos pontuais antes de exportar a planilha final.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setInspectingDemandId(null)}
            className="p-2 rounded-lg bg-[#212632] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#262C3A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Drawer dividido cronologicamente nas 3 macro-fases */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {CHRONO_GROUPS.map((group) => {
            const groupLines = demandLines.filter((l) => l.chronoGroup === group.key);
            if (groupLines.length === 0) return null;

            const groupSubtotal = groupLines
              .filter((l) => l.enabled)
              .reduce((acc, l) => acc + l.totalPrice, 0);

            return (
              <div
                key={group.key}
                className="rounded-xl bg-[#191D26] border border-[#262C3A] overflow-hidden"
              >
                <div className="px-4 py-3 bg-[#212632]/70 border-b border-[#262C3A] flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#D4A359]">
                      {group.title}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">{group.subtitle}</p>
                  </div>
                  <span className="font-heading text-sm font-bold text-[#F8FAFC] tabular-nums">
                    {formatCurrencyBRL(groupSubtotal)}
                  </span>
                </div>

                <div className="divide-y divide-[#262C3A]">
                  {groupLines.map((line) => {
                    const override = config.itemOverrides[line.serviceId];
                    const hasCustomQty =
                      override && typeof override.customQty === 'number';

                    return (
                      <div
                        key={line.lineId}
                        className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          line.enabled ? 'bg-[#191D26]' : 'bg-[#131720]/60 opacity-50'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              togglePackageServiceItemEnabled(demand.id, line.serviceId)
                            }
                            className="mt-0.5 text-[#D4A359] hover:scale-105 transition-transform"
                            title={line.enabled ? 'Desativar serviço' : 'Ativar serviço'}
                          >
                            {line.enabled ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5 text-[#94A3B8]" />
                            )}
                          </button>

                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#131720] border border-[#262C3A] font-mono text-xs font-semibold text-[#D4A359]">
                                {line.effectiveCode}
                              </span>
                              <span className="text-[11px] text-[#94A3B8] font-medium">
                                Unid: {line.unit}
                              </span>

                              {line.contractStatus === 'UNMATCHED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setResolvingInconsistency({
                                      demandId: line.demandId,
                                      serviceId: line.serviceId,
                                      originalCode: line.originalCode,
                                      description: line.description,
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-[#D97724]/20 border border-[#D97724] text-[#D97724] text-[10px] font-bold flex items-center gap-1 hover:bg-[#D97724]/30"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Sem código no Contrato (Mapear De-Para)</span>
                                </button>
                              )}

                              {line.contractStatus === 'MAPPED' && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                                  De-Para: {line.originalCode} → {line.effectiveCode}
                                </span>
                              )}

                              {line.contractStatus === 'OWN_COMPOSITION' && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
                                  Composição Própria
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#F8FAFC] leading-relaxed">
                              {line.description}
                            </p>

                            <div className="text-[11px] text-[#94A3B8] tabular-nums flex items-center gap-3">
                              <span>
                                Unit. Base: {formatCurrencyBRL(line.baseUnitPrice)}
                              </span>
                              <span>•</span>
                              <span className="text-[#D4A359] font-medium">
                                Unit. c/ BDI (Trunc.): {formatCurrencyBRL(line.unitPriceWithBdi)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Edição Inline de Quantitativo + Subtotal do Item */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex flex-col items-end">
                            <label className="text-[10px] text-[#94A3B8] uppercase">
                              Quantitativo ({line.unit})
                            </label>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!line.enabled}
                                value={line.quantity}
                                onChange={(e) =>
                                  updatePackageServiceItemCustomQty(
                                    demand.id,
                                    line.serviceId,
                                    parseFloat(e.target.value)
                                  )
                                }
                                className={`w-24 px-2.5 py-1.5 rounded bg-[#131720] border text-right text-xs font-bold tabular-nums focus:outline-none ${
                                  hasCustomQty
                                    ? 'border-[#D4A359] text-[#D4A359]'
                                    : 'border-[#262C3A] text-[#F8FAFC]'
                                }`}
                              />
                              {hasCustomQty && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePackageServiceItemCustomQty(
                                      demand.id,
                                      line.serviceId,
                                      undefined
                                    )
                                  }
                                  className="p-1 text-[#94A3B8] hover:text-[#D4A359]"
                                  title="Restaurar quantitativo automático escalado"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="w-28 text-right">
                            <span className="block text-[10px] text-[#94A3B8] uppercase">
                              Total Truncado
                            </span>
                            <span className="font-heading text-sm font-bold text-[#F8FAFC] tabular-nums">
                              {formatCurrencyBRL(line.totalPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer do Drawer */}
        <div className="p-5 bg-[#191D26] border-t border-[#262C3A] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Layers className="w-4 h-4 text-[#D4A359]" />
            <span>
              Total Consolidado desta Demanda ({demandLines.filter((l) => l.enabled).length} itens ativos):
            </span>
            <strong className="text-base font-heading font-bold text-[#D4A359] tabular-nums ml-1">
              {formatCurrencyBRL(activeSubtotal)}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setInspectingDemandId(null)}
            className="px-5 py-2.5 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs transition-colors"
          >
            Concluir Inspeção WBS
          </button>
        </div>
      </div>
    </div>
  );
};
