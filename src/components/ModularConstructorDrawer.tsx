import React, { useState } from 'react';
import {
  X,
  Layers,
  Monitor,
  LampCeiling,
  Grid2X2,
  Maximize2,
  Pencil,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  PaintRoller,
  Home,
  DoorClosed,
} from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatCurrencyBRL, formatNumberBR, trunc2 } from '../utils/mathEngine';

export const ModularConstructorDrawer: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    activeModularDrawerDemandId,
    setActiveModularDrawerDemandId,
    toggleModularSubItem,
    updateModularSubItemQty,
    toggleModularSubItemService,
    updateLabSelectorParams,
    updateClassroomSelectorParams,
    confirmModularDemand,
  } = useBudgetStore();

  const [editingWindowDim, setEditingWindowDim] = useState(false);
  const [editingClassroomWindowDim, setEditingClassroomWindowDim] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [expandedSubItemId, setExpandedSubItemId] = useState<string | null>(null);

  if (!activeModularDrawerDemandId) return null;

  const demand = demands.find((d) => d.id === activeModularDrawerDemandId);
  if (!demand || demand.type !== 'MODULAR' || !demand.subItems) return null;

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const config = selectedDemands[demand.id];
  const bdiPercent = activeContract ? activeContract.bdiPercent : 0;

  // Calcula subtotal dinâmico em tempo real
  let drawerTotal = 0;
  let activeSubCount = 0;

  if (config && config.selectedSubItems) {
    for (const sub of demand.subItems) {
      const sel = config.selectedSubItems[sub.id];
      if (sel && sel.enabled && sel.qty > 0) {
        activeSubCount++;
        for (const item of sub.services) {
          const sOverride = sel.serviceOverrides?.[item.id];
          const isEnabled = sOverride ? sOverride.enabled : true;
          if (!isEnabled) continue;

          let unitBase = item.estimatedUnitPrice;
          if (activeContract) {
            const match = activeContract.priceTable.find(
              (p) => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
            );
            if (match) unitBase = match.unitPrice;
          }

          const unitWithBdi = activeContract
            ? trunc2(unitBase * (1 + bdiPercent / 100))
            : trunc2(unitBase);
          const itemTotal = trunc2(item.baseCoef * sel.qty * unitWithBdi);
          drawerTotal = trunc2(drawerTotal + itemTotal);
        }
      }
    }
  }

  const isLabInfo = demand.id === 'dem-lab-info';
  const isClassroom = demand.id === 'dem-sala-aula';
  const labParams = config?.labSelectorParams || {
    row1Pcs: 3,
    row1Benches: 3,
    row2Pcs: 3,
    row2Benches: 3,
    luminarias: 9,
    janelas: 4,
    janelaComp: 2.16,
    janelaAlt: 1.0,
    salaAreaM2: 56.0,
  };
  const classroomParams = config?.classroomSelectorParams || {
    temRevestimento: false,
    coberturaFolhas: 2,
    luminarias: 28,
    janelas: 3,
    janelaComp: 2.5,
    janelaAlt: 1.5,
    portas: 1,
    salaAreaM2: 42.48,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none overflow-y-auto">
      <div className="w-full max-w-[680px] rounded-[28px] bg-[#0B0C0E] border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-6 space-y-4 my-auto relative">
        {/* Barra Superior Discreta com Título da Demanda, Valor em Tempo Real e Fechar */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F58220]">
              Menu Seletor Paramétrico • OrçaCraft.lab
            </span>
            <h2 className="font-heading text-lg font-extrabold text-white">
              {demand.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right px-3.5 py-1.5 rounded-xl bg-[#14161B] border border-[#F58220]/40">
              <span className="block text-[10px] text-[#94A3B8] uppercase">Orçamento Calculado</span>
              <strong className="font-heading text-sm font-black text-[#F58220] tabular-nums">
                {formatCurrencyBRL(drawerTotal)}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setActiveModularDrawerDemandId(null)}
              className="p-2 rounded-xl bg-[#16181D] text-neutral-400 hover:text-white border border-white/10 transition-colors"
              title="Fechar Menu Seletor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* LAYOUT FIEL À IMAGEM DE REFERÊNCIA: LABORATÓRIO DE INFORMÁTICA        */}
        {/* ===================================================================== */}
        {isLabInfo ? (
          <div className="space-y-3.5">
            {/* 1. CARD BANCADAS (FILEIRA 1 E FILEIRA 2) */}
            <div className="rounded-[22px] bg-[#121419] border border-white/10 p-4 space-y-4 shadow-inner">
              {/* Topo do Card Bancadas */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  {/* Ícone de Bancada */}
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 7h18v3H3z" />
                    <path d="M5 10v8M19 10v8M5 14h14" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-extrabold text-white tracking-tight">
                    Bancadas
                  </h3>
                  <div className="h-[3px] w-28 rounded-full bg-gradient-to-r from-[#F58220] via-[#F5A623] to-transparent mt-1" />
                </div>
              </div>

              {/* Grid Fileira 1 e Fileira 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* FILEIRA 1 */}
                <div className="rounded-2xl bg-[#171A21] border border-white/10 p-3.5 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#2D1E12] to-[#1E1610] border border-[#F58220]/50 text-[#F8FAFC] text-xs font-bold shadow-sm">
                    <Layers className="w-3.5 h-3.5 text-[#F58220]" />
                    <span>Fileira 1</span>
                  </div>

                  {/* Linha PCs - Fileira 1 */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-5 h-5 text-[#F58220]" />
                      <span className="text-xs font-bold text-white">PCs</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row1Pcs: Math.max(0, labParams.row1Pcs - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-base flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={labParams.row1Pcs}
                        onChange={(e) =>
                          updateLabSelectorParams(demand.id, {
                            row1Pcs: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-12 h-8 rounded-lg bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-sm text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row1Pcs: labParams.row1Pcs + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-base flex items-center justify-center shadow-[0_0_12px_rgba(245,130,32,0.4)] transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Linha Bancadas de Computadores - Fileira 1 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 text-[#F58220] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="4" width="7" height="5" rx="1" />
                        <rect x="14" y="4" width="7" height="5" rx="1" />
                        <path d="M2 13h20v2H2zM4 15v5M20 15v5" />
                      </svg>
                      <span className="text-[11px] font-bold text-white leading-tight">
                        Bancadas de
                        <br />
                        Computadores
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row1Benches: Math.max(0, labParams.row1Benches - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-base flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={labParams.row1Benches}
                        onChange={(e) =>
                          updateLabSelectorParams(demand.id, {
                            row1Benches: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-12 h-8 rounded-lg bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-sm text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row1Benches: labParams.row1Benches + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-base flex items-center justify-center shadow-[0_0_12px_rgba(245,130,32,0.4)] transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* FILEIRA 2 */}
                <div className="rounded-2xl bg-[#171A21] border border-white/10 p-3.5 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#2D1E12] to-[#1E1610] border border-[#F58220]/50 text-[#F8FAFC] text-xs font-bold shadow-sm">
                    <Layers className="w-3.5 h-3.5 text-[#F58220]" />
                    <span>Fileira 2</span>
                  </div>

                  {/* Linha PCs - Fileira 2 */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-5 h-5 text-[#F58220]" />
                      <span className="text-xs font-bold text-white">PCs</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row2Pcs: Math.max(0, labParams.row2Pcs - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-base flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={labParams.row2Pcs}
                        onChange={(e) =>
                          updateLabSelectorParams(demand.id, {
                            row2Pcs: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-12 h-8 rounded-lg bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-sm text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row2Pcs: labParams.row2Pcs + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-base flex items-center justify-center shadow-[0_0_12px_rgba(245,130,32,0.4)] transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Linha Bancadas de Computadores - Fileira 2 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 text-[#F58220] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="4" width="7" height="5" rx="1" />
                        <rect x="14" y="4" width="7" height="5" rx="1" />
                        <path d="M2 13h20v2H2zM4 15v5M20 15v5" />
                      </svg>
                      <span className="text-[11px] font-bold text-white leading-tight">
                        Bancadas de
                        <br />
                        Computadores
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row2Benches: Math.max(0, labParams.row2Benches - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-base flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={labParams.row2Benches}
                        onChange={(e) =>
                          updateLabSelectorParams(demand.id, {
                            row2Benches: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-12 h-8 rounded-lg bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-sm text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateLabSelectorParams(demand.id, {
                            row2Benches: labParams.row2Benches + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-base flex items-center justify-center shadow-[0_0_12px_rgba(245,130,32,0.4)] transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CARD LUMINÁRIAS */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  <LampCeiling className="w-6 h-6" />
                </div>
                <span className="font-heading text-lg font-extrabold text-white">
                  Luminárias
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-2" />
                <button
                  type="button"
                  onClick={() =>
                    updateLabSelectorParams(demand.id, {
                      luminarias: Math.max(0, labParams.luminarias - 1),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={labParams.luminarias}
                  onChange={(e) =>
                    updateLabSelectorParams(demand.id, {
                      luminarias: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-16 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateLabSelectorParams(demand.id, {
                      luminarias: labParams.luminarias + 1,
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                >
                  +
                </button>

                <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                  UND
                </span>
              </div>
            </div>

            {/* 3. CARD JANELAS (COM C x H EDITÁVEL) */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                    <Grid2X2 className="w-6 h-6" />
                  </div>
                  <span className="font-heading text-lg font-extrabold text-white">
                    Janelas
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-2" />
                  <button
                    type="button"
                    onClick={() =>
                      updateLabSelectorParams(demand.id, {
                        janelas: Math.max(0, labParams.janelas - 1),
                      })
                    }
                    className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={labParams.janelas}
                    onChange={(e) =>
                      updateLabSelectorParams(demand.id, {
                        janelas: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-16 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateLabSelectorParams(demand.id, {
                        janelas: labParams.janelas + 1,
                      })
                    }
                    className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                  >
                    +
                  </button>

                  <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                    UND
                  </span>
                </div>
              </div>

              {/* Linha Inferior: C x H (m) */}
              <div className="pl-16 flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-[#1A1D24] border border-white/10 text-xs font-bold text-[#F58220]">
                  C × H (m)
                </span>

                {editingWindowDim ? (
                  <div className="flex-1 flex items-center gap-2 bg-[#0E1014] border border-[#F58220] rounded-xl px-3 py-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      value={labParams.janelaComp}
                      onChange={(e) =>
                        updateLabSelectorParams(demand.id, {
                          janelaComp: parseFloat(e.target.value) || 2.1,
                        })
                      }
                      className="w-20 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                    />
                    <span className="text-[#F58220] font-bold">×</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      value={labParams.janelaAlt}
                      onChange={(e) =>
                        updateLabSelectorParams(demand.id, {
                          janelaAlt: parseFloat(e.target.value) || 1.0,
                        })
                      }
                      className="w-20 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingWindowDim(false)}
                      className="ml-auto text-xs font-bold text-[#F58220] hover:underline"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingWindowDim(true)}
                    className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#171A21] hover:bg-[#1E222B] border border-white/10 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-white tabular-nums">
                      {formatNumberBR(labParams.janelaComp, 2)} × {formatNumberBR(labParams.janelaAlt, 2)}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-[#F58220]" />
                  </div>
                )}
              </div>
            </div>

            {/* 4. CARD SALA (ÁREA EM m²) */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  <Maximize2 className="w-6 h-6" />
                </div>
                <span className="font-heading text-lg font-extrabold text-white">
                  Sala
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-1" />
                <span className="px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-[#F58220]">
                  Área
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateLabSelectorParams(demand.id, {
                      salaAreaM2: Math.max(0, trunc2(labParams.salaAreaM2 - 1)),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={labParams.salaAreaM2}
                  onChange={(e) =>
                    updateLabSelectorParams(demand.id, {
                      salaAreaM2: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-20 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateLabSelectorParams(demand.id, {
                      salaAreaM2: trunc2(labParams.salaAreaM2 + 1),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                >
                  +
                </button>

                <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                  m²
                </span>
              </div>
            </div>

            {/* Expansor Discreto para Auditar as Composições Técnicas da Sala */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full py-1.5 text-[11px] text-neutral-400 hover:text-[#F58220] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>
                  {showTechnicalDetails
                    ? 'Ocultar detalhamento das composições SINAPI/SEDUC'
                    : `Ver detalhamento técnico automático (${activeSubCount} grupos de serviço ativos)`}
                </span>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 max-h-[200px] overflow-y-auto space-y-2 pr-1 bg-[#121419] p-3 rounded-xl border border-white/10">
                  {demand.subItems.map((sub) => {
                    const sel = config?.selectedSubItems?.[sub.id];
                    const isChecked = Boolean(sel && sel.enabled);
                    const qty = sel ? sel.qty : sub.defaultQty;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-[#171A21] border border-white/5"
                      >
                        <div
                          onClick={() => toggleModularSubItem(demand.id, sub.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#F58220]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-500" />
                          )}
                          <span className={isChecked ? 'text-white font-medium' : 'text-neutral-500'}>
                            {sub.title}
                          </span>
                        </div>
                        <span className="font-mono text-[#F58220] font-bold tabular-nums">
                          {formatNumberBR(qty, 2)} {sub.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : isClassroom ? (
          /* ===================================================================== */
          /* MENU SELETOR PARAMÉTRICO: CONSTRUÇÃO DE SALA DE AULA                  */
          /* ===================================================================== */
          <div className="space-y-3.5">
            {/* 1. CARD ACABAMENTO DAS PAREDES (SÓ PINTURA vs REVESTIMENTO ATÉ 1,60m) */}
            <div className="rounded-[22px] bg-[#121419] border border-white/10 p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                    <PaintRoller className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-extrabold text-white tracking-tight">
                      Paredes e Revestimento
                    </h3>
                    <div className="h-[3px] w-32 rounded-full bg-gradient-to-r from-[#F58220] via-[#F5A623] to-transparent mt-1" />
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#171A21] border border-white/10 text-[11px] font-bold text-[#F5A623]">
                  {classroomParams.temRevestimento ? 'Com Cerâmica h=1,60m' : 'Padrão: Só Pintura'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Opção 1: Sem Revestimento (Só Emassada e Pintada) */}
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, { temRevestimento: false })
                  }
                  className={`rounded-2xl p-3.5 text-left border transition-all flex flex-col justify-between gap-2 ${
                    !classroomParams.temRevestimento
                      ? 'bg-gradient-to-b from-[#2D1E12] to-[#181410] border-[#F58220] shadow-[0_0_18px_rgba(245,130,32,0.25)]'
                      : 'bg-[#171A21] border-white/10 hover:border-white/25 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E1014] border border-[#F58220]/40 text-[11px] font-bold text-[#F58220]">
                      Sem Revestimento
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        !classroomParams.temRevestimento
                          ? 'border-[#F58220] bg-[#F58220]'
                          : 'border-white/30'
                      }`}
                    >
                      {!classroomParams.temRevestimento && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-white block">
                      Parede Emassada e Pintada
                    </strong>
                    <span className="text-[11px] text-neutral-400 leading-tight block mt-0.5">
                      Selador + Massa Látex + Acrílica Premium (Orçamento base: R$ 138.002,21)
                    </span>
                  </div>
                </button>

                {/* Opção 2: Com Revestimento até 1,60m (1,50m Branco + 0,10m Fileira Verde) */}
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, { temRevestimento: true })
                  }
                  className={`rounded-2xl p-3.5 text-left border transition-all flex flex-col justify-between gap-2 ${
                    classroomParams.temRevestimento
                      ? 'bg-gradient-to-b from-[#2D1E12] to-[#181410] border-[#F58220] shadow-[0_0_18px_rgba(245,130,32,0.25)]'
                      : 'bg-[#171A21] border-white/10 hover:border-white/25 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E1014] border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
                      Revestimento h = 1,60 m
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        classroomParams.temRevestimento
                          ? 'border-[#F58220] bg-[#F58220]'
                          : 'border-white/30'
                      }`}
                    >
                      {classroomParams.temRevestimento && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-white block">
                      1,50m Branco + Fileira Verde (0,10m)
                    </strong>
                    <span className="text-[11px] text-neutral-400 leading-tight block mt-0.5">
                      Adiciona Cerâmica 10×10cm SEDUC (S9.1: 132,15 m²) e deduz pintura na faixa
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. CARD COBERTURA (UMA FOLHA / 1 ÁGUA vs DUAS FOLHAS / 2 ÁGUAS) */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-heading text-lg font-extrabold text-white block">
                    Cobertura
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Telha Cerâmica + Pintura Imunizante + Calha Galv. 50cm
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, { coberturaFolhas: 1 })
                  }
                  className={`px-4 py-2 rounded-xl font-heading text-xs font-extrabold border transition-all ${
                    classroomParams.coberturaFolhas === 1
                      ? 'bg-gradient-to-b from-[#FF9429] to-[#D9650B] text-white border-[#FFB057] shadow-[0_0_14px_rgba(245,130,32,0.4)]'
                      : 'bg-[#171A21] text-neutral-300 border-white/10 hover:bg-[#22252D]'
                  }`}
                >
                  Uma Folha (1 Água)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, { coberturaFolhas: 2 })
                  }
                  className={`px-4 py-2 rounded-xl font-heading text-xs font-extrabold border transition-all ${
                    classroomParams.coberturaFolhas === 2
                      ? 'bg-gradient-to-b from-[#FF9429] to-[#D9650B] text-white border-[#FFB057] shadow-[0_0_14px_rgba(245,130,32,0.4)]'
                      : 'bg-[#171A21] text-neutral-300 border-white/10 hover:bg-[#22252D]'
                  }`}
                >
                  Duas Folhas (2 Águas)
                </button>
              </div>
            </div>

            {/* 3. CARD LUMINÁRIAS (LÂMPADAS TUBULARES LED 2x18W DENTRO DA SALA) */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  <LampCeiling className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-heading text-lg font-extrabold text-white block">
                    Luminárias / Lâmpadas
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Luminária Lâmpada Tubular LED 2×18W (SEDUC E 201) + Caixa Laje
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-2" />
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, {
                      luminarias: Math.max(0, Math.round(classroomParams.luminarias) - 1),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={Math.round(classroomParams.luminarias)}
                  onChange={(e) =>
                    updateClassroomSelectorParams(demand.id, {
                      luminarias: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  className="w-16 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, {
                      luminarias: Math.round(classroomParams.luminarias) + 1,
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                >
                  +
                </button>

                <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                  UND
                </span>
              </div>
            </div>

            {/* 4. CARD JANELAS (VIDRO DE CORRER 2 FOLHAS + DIMENSÕES C x H) E PORTA DE CHAPA DE FERRO */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                    <Grid2X2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-heading text-lg font-extrabold text-white block">
                      Janelas (Vidro 2 Folhas)
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Alumínio de Correr 2 Folhas p/ Vidro (94570) + Verga/Contraverga
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-2" />
                  <button
                    type="button"
                    onClick={() =>
                      updateClassroomSelectorParams(demand.id, {
                        janelas: Math.max(0, classroomParams.janelas - 1),
                      })
                    }
                    className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={classroomParams.janelas}
                    onChange={(e) =>
                      updateClassroomSelectorParams(demand.id, {
                        janelas: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-16 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateClassroomSelectorParams(demand.id, {
                        janelas: classroomParams.janelas + 1,
                      })
                    }
                    className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                  >
                    +
                  </button>

                  <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                    UND
                  </span>
                </div>
              </div>

              {/* Linha Inferior: C x H (m) + Porta de Chapa de Ferro */}
              <div className="pl-16 flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
                <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                  <span className="px-3 py-1 rounded-lg bg-[#1A1D24] border border-white/10 text-xs font-bold text-[#F58220]">
                    C × H (m)
                  </span>

                  {editingClassroomWindowDim ? (
                    <div className="flex-1 flex items-center gap-2 bg-[#0E1014] border border-[#F58220] rounded-xl px-3 py-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.2"
                        value={classroomParams.janelaComp}
                        onChange={(e) =>
                          updateClassroomSelectorParams(demand.id, {
                            janelaComp: parseFloat(e.target.value) || 2.5,
                          })
                        }
                        className="w-16 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                      />
                      <span className="text-[#F58220] font-bold">×</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.2"
                        value={classroomParams.janelaAlt}
                        onChange={(e) =>
                          updateClassroomSelectorParams(demand.id, {
                            janelaAlt: parseFloat(e.target.value) || 1.5,
                          })
                        }
                        className="w-16 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingClassroomWindowDim(false)}
                        className="ml-auto text-xs font-bold text-[#F58220] hover:underline"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingClassroomWindowDim(true)}
                      className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#171A21] hover:bg-[#1E222B] border border-white/10 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-white tabular-nums">
                        {formatNumberBR(classroomParams.janelaComp, 2)} ×{' '}
                        {formatNumberBR(classroomParams.janelaAlt, 2)}
                      </span>
                      <Pencil className="w-3.5 h-3.5 text-[#F58220]" />
                    </div>
                  )}
                </div>

                {/* Seletor compacto Porta de Chapa de Ferro */}
                <div className="flex items-center gap-2 bg-[#171A21] px-3 py-1 rounded-xl border border-white/10">
                  <DoorClosed className="w-4 h-4 text-[#F58220]" />
                  <span className="text-xs font-bold text-neutral-300">Porta Chapa Ferro:</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateClassroomSelectorParams(demand.id, {
                        portas: Math.max(0, classroomParams.portas - 1),
                      })
                    }
                    className="w-6 h-6 rounded bg-[#22252D] text-white font-bold text-xs flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-xs font-extrabold text-white w-5 text-center tabular-nums">
                    {classroomParams.portas}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateClassroomSelectorParams(demand.id, {
                        portas: classroomParams.portas + 1,
                      })
                    }
                    className="w-6 h-6 rounded bg-[#F58220] text-white font-bold text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 5. CARD SALA (ÁREA EM m² - PISO CERÂMICO 45x45, FORRO PVC E ESTRUTURA) */}
            <div className="rounded-[20px] bg-[#121419] border border-white/10 px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_15px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                  <Maximize2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-heading text-lg font-extrabold text-white block">
                    Sala (Piso Cerâmico 45×45)
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Fundação, Superestrutura, Alvenaria, Piso Cerâmico e Forro PVC
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-1" />
                <span className="px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-[#F58220]">
                  Área
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, {
                      salaAreaM2: Math.max(0, trunc2(classroomParams.salaAreaM2 - 1)),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={classroomParams.salaAreaM2}
                  onChange={(e) =>
                    updateClassroomSelectorParams(demand.id, {
                      salaAreaM2: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-20 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateClassroomSelectorParams(demand.id, {
                      salaAreaM2: trunc2(classroomParams.salaAreaM2 + 1),
                    })
                  }
                  className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                >
                  +
                </button>

                <span className="px-4 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300">
                  m²
                </span>
              </div>
            </div>

            {/* Expansor Discreto para Auditar as Composições Técnicas da Sala de Aula */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full py-1.5 text-[11px] text-neutral-400 hover:text-[#F58220] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>
                  {showTechnicalDetails
                    ? 'Ocultar detalhamento das composições SINAPI/SEDUC da Sala de Aula'
                    : `Ver detalhamento técnico na planilha (${activeSubCount} grupos de serviço ativos)`}
                </span>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 max-h-[200px] overflow-y-auto space-y-2 pr-1 bg-[#121419] p-3 rounded-xl border border-white/10">
                  {demand.subItems.map((sub) => {
                    const sel = config?.selectedSubItems?.[sub.id];
                    const isChecked = Boolean(sel && sel.enabled);
                    const qty = sel ? sel.qty : sub.defaultQty;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-[#171A21] border border-white/5"
                      >
                        <div
                          onClick={() => toggleModularSubItem(demand.id, sub.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#F58220]" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-500" />
                          )}
                          <span className={isChecked ? 'text-white font-medium' : 'text-neutral-500'}>
                            {sub.title}
                          </span>
                        </div>
                        <span className="font-mono text-[#F58220] font-bold tabular-nums">
                          {formatNumberBR(qty, 2)} {sub.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===================================================================== */
          /* MESMO PADRÃO VISUAL DA IMAGEM PARA AS DEMAIS DEMANDAS DO SISTEMA      */
          /* ===================================================================== */
          <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
            {demand.subItems.map((sub) => {
              const sel = config?.selectedSubItems?.[sub.id];
              const isChecked = Boolean(sel && sel.enabled);
              const qty = sel && isChecked ? sel.qty : 0;
              const isExpanded = expandedSubItemId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`rounded-[20px] border transition-all px-4 py-3.5 space-y-2.5 ${
                    isChecked
                      ? 'bg-[#121419] border-[#F58220]/50 shadow-md'
                      : 'bg-[#121419]/70 border-white/10 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div
                      onClick={() => toggleModularSubItem(demand.id, sub.id)}
                      className="flex items-center gap-3.5 cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#2A1C11] to-[#17110C] border border-[#F58220]/50 shadow-[0_0_12px_rgba(245,130,32,0.2)] flex items-center justify-center text-[#F5A623]">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-heading text-base font-extrabold text-white block">
                          {sub.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSubItemId(isExpanded ? null : sub.id);
                          }}
                          className="text-[11px] text-[#94A3B8] hover:text-[#F58220] flex items-center gap-1"
                        >
                          <span>{sub.services.length} composições vinculadas</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-[1px] bg-white/15 hidden sm:block mr-1" />
                      <button
                        type="button"
                        onClick={() =>
                          updateModularSubItemQty(demand.id, sub.id, Math.max(0, qty - 1))
                        }
                        className="w-9 h-9 rounded-xl bg-[#22252D] hover:bg-[#2C303A] border border-white/10 text-white font-bold text-lg flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) =>
                          updateModularSubItemQty(
                            demand.id,
                            sub.id,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          )
                        }
                        className="w-16 h-9 rounded-xl bg-[#0E1014] border border-white/15 text-center font-heading font-extrabold text-base text-white tabular-nums focus:outline-none focus:border-[#F58220]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateModularSubItemQty(
                            demand.id,
                            sub.id,
                            qty === 0 ? sub.defaultQty || 1 : qty + 1
                          )
                        }
                        className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#FF9429] to-[#D9650B] hover:brightness-110 text-white font-bold text-lg flex items-center justify-center shadow-[0_0_14px_rgba(245,130,32,0.45)] transition-all"
                      >
                        +
                      </button>

                      <span className="px-3.5 py-1.5 rounded-xl bg-[#1A1D24] border border-white/10 text-xs font-bold text-neutral-300 uppercase">
                        {sub.unit === 'un' ? 'UND' : sub.unit}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      {sub.services.map((srv) => {
                        const sOverride = sel?.serviceOverrides?.[srv.id];
                        const sEnabled = sOverride ? sOverride.enabled : true;
                        return (
                          <div
                            key={srv.id}
                            onClick={() => toggleModularSubItemService(demand.id, sub.id, srv.id)}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#171A21] cursor-pointer hover:bg-[#1E222B]"
                          >
                            <div className="flex items-center gap-2">
                              {sEnabled ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#F58220]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                              <span className={sEnabled ? 'text-white' : 'text-neutral-500 line-through'}>
                                <strong className="text-[#F58220] font-mono mr-1.5">{srv.code}</strong>
                                {srv.description}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* BOTÃO INFERIOR LARANJA: CONFIRMAR SELEÇÃO -> */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => confirmModularDemand(demand.id)}
            className="w-full max-w-[420px] py-3.5 px-8 rounded-full bg-gradient-to-b from-[#FF9224] via-[#E8710C] to-[#C65604] hover:brightness-110 active:scale-[0.99] text-white font-heading font-extrabold text-base shadow-[0_10px_30px_rgba(245,130,32,0.45)] border border-[#FFB057]/50 flex items-center justify-center gap-3 transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>Confirmar Seleção</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
