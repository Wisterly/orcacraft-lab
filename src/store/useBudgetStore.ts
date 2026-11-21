import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ClassroomSelectorParams,
  ContractTemplate,
  DemandCard,
  DemandServiceItem,
  LabSelectorParams,
  ModularSubItem,
  SelectedDemandConfig,
} from '../types/budget';
import { INITIAL_CONTRACTS, INITIAL_DEMANDS } from '../data/initialData';
import { computeBudgetLines, trunc2 } from '../utils/mathEngine';

interface BudgetStoreState {
  activeTab: 'HOME' | 'SETTINGS';
  catalogFilter: 'ALL' | 'PACKAGE' | 'MODULAR';
  demands: DemandCard[];
  contracts: ContractTemplate[];
  selectedDemands: Record<string, SelectedDemandConfig>;
  activeContractId: string | null;

  // Estado do Cérebro de Alocação IA (Base Geral do Projeto)
  isAiAllocating: boolean;
  aiAllocationSummary: string | null;
  aiAllocationStats: {
    directCount: number;
    reallocatedCount: number;
    modelUsed: string;
  } | null;

  // Modais e Drawers ativos
  inspectingDemandId: string | null; // Drawer de inspeção de itens (Pacotes Fechados)
  activeModularDrawerDemandId: string | null; // Slide-over Drawer em 3 Passos (Construtor Modular)
  isContractModalOpen: boolean;
  isExportModalOpen: boolean;
  resolvingInconsistency: {
    demandId: string;
    serviceId: string;
    originalCode: string;
    description: string;
  } | null;

  // Ações de navegação
  setActiveTab: (tab: 'HOME' | 'SETTINGS') => void;
  setCatalogFilter: (filter: 'ALL' | 'PACKAGE' | 'MODULAR') => void;
  setInspectingDemandId: (demandId: string | null) => void;
  setActiveModularDrawerDemandId: (demandId: string | null) => void;
  setContractModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setResolvingInconsistency: (
    payload: {
      demandId: string;
      serviceId: string;
      originalCode: string;
      description: string;
    } | null
  ) => void;

  // Ações de seleção de Pacotes Fechados (Tipo A)
  togglePackageSelection: (demandId: string) => void;
  updatePackageQuantity: (demandId: string, deltaOrExact: number, isDelta?: boolean) => void;

  // Ações de Construtor Modular / Variável (Tipo B)
  openModularDrawer: (demandId: string) => void;
  toggleModularSubItem: (demandId: string, subItemId: string) => void;
  updateModularSubItemQty: (demandId: string, subItemId: string, qty: number) => void;
  toggleModularSubItemService: (demandId: string, subItemId: string, serviceId: string) => void;
  updateLabSelectorParams: (demandId: string, patch: Partial<LabSelectorParams>) => void;
  updateClassroomSelectorParams: (demandId: string, patch: Partial<ClassroomSelectorParams>) => void;
  confirmModularDemand: (demandId: string) => void;

  // Ações genéricas de remoção e inspeção
  removeDemand: (demandId: string) => void;
  togglePackageServiceItemEnabled: (demandId: string, serviceId: string) => void;
  updatePackageServiceItemCustomQty: (demandId: string, serviceId: string, customQty?: number) => void;

  // Ações de contrato, De-Para e Alocação Cognitiva IA na Planilha do Contrato
  selectContract: (contractId: string | null) => void;
  runAiContractAllocation: (contractIdOverride?: string | null) => Promise<void>;
  generateDemandFromFreePromptWithIA: (
    promptText: string
  ) => Promise<{ success: boolean; count: number; message: string }>;
  resolveServiceInconsistency: (
    demandId: string,
    serviceId: string,
    resolution:
      | { type: 'MAPPED'; mappedContractCode: string }
      | { type: 'OWN_COMPOSITION'; customOwnPrice: number }
  ) => void;

  // CRUD de Configurações (3 Abas)
  addDemandCard: (card: DemandCard) => void;
  updateDemandCard: (card: DemandCard) => void;
  deleteDemandCard: (demandId: string) => void;
  importDemandItems: (demandId: string, items: DemandServiceItem[]) => void;
  addModularSubItem: (demandId: string, subItem: ModularSubItem) => void;

  addContractTemplate: (contract: ContractTemplate) => void;
  updateContractTemplate: (contract: ContractTemplate) => void;
  deleteContractTemplate: (contractId: string) => void;
  resetDemoData: () => void;

  // Persistência em Nuvem Global (Cross-Browser / Cross-Device 24h)
  isCloudSyncing: boolean;
  lastCloudSync: string | null;
  cloudSyncStatus: 'synced' | 'syncing' | 'error' | 'idle';
  cloudSyncError: string | null;
  fetchFromCloud: () => Promise<boolean>;
  saveToCloud: () => Promise<boolean>;
}

let cloudSyncDebounceTimer: any = null;
const scheduleCloudSync = (getState: () => BudgetStoreState) => {
  if (typeof window === 'undefined') return;
  if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
  cloudSyncDebounceTimer = setTimeout(() => {
    getState().saveToCloud();
  }, 900);
};

export const useBudgetStore = create<BudgetStoreState>()(
  persist(
    (set, get) => ({
      activeTab: 'HOME',
      catalogFilter: 'ALL',
      demands: INITIAL_DEMANDS,
      contracts: INITIAL_CONTRACTS,
      // Inicia com "Construção Sala de Aula" (Modular com Menu Seletor Paramétrico) selecionada por padrão
      selectedDemands: {
        'dem-sala-aula': {
          demandId: 'dem-sala-aula',
          demandType: 'MODULAR',
          quantityUn: 1,
          itemOverrides: {},
          selectedSubItems: {
            'sub-sala-fundacao-estrutura': { enabled: true, qty: 42.48 },
            'sub-sala-cobertura': { enabled: true, qty: 49.855 },
            'sub-sala-janelas': { enabled: true, qty: 3 },
            'sub-sala-porta-ferro': { enabled: true, qty: 1 },
            'sub-sala-pintura': { enabled: true, qty: 339.84 },
            'sub-sala-revestimento-160': { enabled: false, qty: 0 },
            'sub-sala-luminarias': { enabled: true, qty: 28.0368 },
            'sub-sala-eletrica-completa': { enabled: true, qty: 1 },
          },
          classroomSelectorParams: {
            temRevestimento: false,
            coberturaFolhas: 2,
            luminarias: 28,
            janelas: 3,
            janelaComp: 2.5,
            janelaAlt: 1.5,
            portas: 1,
            salaAreaM2: 42.48,
          },
        },
      },
      activeContractId: 'cnt-seduc-lote1-cerrados',
      isCloudSyncing: false,
      lastCloudSync: null,
      cloudSyncStatus: 'idle',
      cloudSyncError: null,
      isAiAllocating: false,
      aiAllocationSummary: null,
      aiAllocationStats: null,
      inspectingDemandId: null,
      activeModularDrawerDemandId: null,
      isContractModalOpen: false,
      isExportModalOpen: false,
      resolvingInconsistency: null,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setCatalogFilter: (filter) => set({ catalogFilter: filter }),
      setInspectingDemandId: (demandId) => set({ inspectingDemandId: demandId }),
      setActiveModularDrawerDemandId: (demandId) => set({ activeModularDrawerDemandId: demandId }),
      setContractModalOpen: (open) => set({ isContractModalOpen: open }),
      setExportModalOpen: (open) => set({ isExportModalOpen: open }),
      setResolvingInconsistency: (payload) => set({ resolvingInconsistency: payload }),

      togglePackageSelection: (demandId) => {
        const current = { ...get().selectedDemands };
        if (current[demandId]) {
          delete current[demandId];
        } else {
          current[demandId] = {
            demandId,
            demandType: 'PACKAGE',
            quantityUn: 1,
            itemOverrides: {},
          };
        }
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      updatePackageQuantity: (demandId, deltaOrExact, isDelta = true) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg) return;

        const nextUn = isDelta ? Math.max(1, cfg.quantityUn + deltaOrExact) : Math.max(1, deltaOrExact);
        current[demandId] = {
          ...cfg,
          quantityUn: nextUn,
        };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      openModularDrawer: (demandId) => {
        const current = { ...get().selectedDemands };
        const demand = get().demands.find((d) => d.id === demandId);
        if (!demand || demand.type !== 'MODULAR') return;

        const defaultLabParams: LabSelectorParams = {
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

        const defaultClassroomParams: ClassroomSelectorParams = {
          temRevestimento: false,
          coberturaFolhas: 2,
          luminarias: 28,
          janelas: 3,
          janelaComp: 2.5,
          janelaAlt: 1.5,
          portas: 1,
          salaAreaM2: 42.48,
        };

        // Se ainda não existir configuração para essa demanda, inicializa marcando todos os sub-itens padrão (defaultQty > 0)
        if (!current[demandId]) {
          const initialSubs: Record<string, { enabled: boolean; qty: number }> = {};
          if (demand.subItems) {
            demand.subItems.forEach((sub) => {
              initialSubs[sub.id] = {
                enabled: sub.defaultQty > 0,
                qty: sub.defaultQty,
              };
            });
          }
          current[demandId] = {
            demandId,
            demandType: 'MODULAR',
            quantityUn: 1,
            itemOverrides: {},
            selectedSubItems: initialSubs,
            labSelectorParams: demandId === 'dem-lab-info' ? defaultLabParams : undefined,
            classroomSelectorParams: demandId === 'dem-sala-aula' ? defaultClassroomParams : undefined,
          };
          set({ selectedDemands: current, activeModularDrawerDemandId: demandId });
        } else {
          if (demandId === 'dem-lab-info' && !current[demandId].labSelectorParams) {
            current[demandId] = {
              ...current[demandId],
              labSelectorParams: defaultLabParams,
            };
            set({ selectedDemands: current, activeModularDrawerDemandId: demandId });
          } else if (demandId === 'dem-sala-aula' && !current[demandId].classroomSelectorParams) {
            current[demandId] = {
              ...current[demandId],
              classroomSelectorParams: defaultClassroomParams,
            };
            set({ selectedDemands: current, activeModularDrawerDemandId: demandId });
          } else {
            set({ activeModularDrawerDemandId: demandId });
          }
        }
      },

      toggleModularSubItem: (demandId, subItemId) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg || !cfg.selectedSubItems) return;

        const subObj = cfg.selectedSubItems[subItemId];
        const demand = get().demands.find((d) => d.id === demandId);
        const subDef = demand?.subItems?.find((s) => s.id === subItemId);
        const defaultQty = subDef ? subDef.defaultQty : 1;

        if (subObj) {
          cfg.selectedSubItems[subItemId] = {
            ...subObj,
            enabled: !subObj.enabled,
            qty: !subObj.enabled && subObj.qty === 0 ? defaultQty : subObj.qty,
          };
        } else {
          cfg.selectedSubItems[subItemId] = {
            enabled: true,
            qty: defaultQty,
          };
        }
        current[demandId] = { ...cfg };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      updateModularSubItemQty: (demandId, subItemId, qty) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg || !cfg.selectedSubItems) return;

        const subObj = cfg.selectedSubItems[subItemId];
        const safeQty = Math.max(0, qty || 0);

        cfg.selectedSubItems[subItemId] = {
          enabled: safeQty > 0,
          qty: safeQty,
          serviceOverrides: subObj?.serviceOverrides,
        };

        // Quando alterar a quantidade de bancadas de 3 ou 4 PCs no Laboratório, sincroniza automaticamente os pontos lógicos e tomadas
        if (
          demandId === 'dem-lab-info' &&
          (subItemId === 'sub-lab-bancadas-3pc' || subItemId === 'sub-lab-bancadas-4pc')
        ) {
          const qtd3 =
            subItemId === 'sub-lab-bancadas-3pc'
              ? safeQty
              : cfg.selectedSubItems['sub-lab-bancadas-3pc']?.enabled
              ? cfg.selectedSubItems['sub-lab-bancadas-3pc'].qty
              : 0;
          const qtd4 =
            subItemId === 'sub-lab-bancadas-4pc'
              ? safeQty
              : cfg.selectedSubItems['sub-lab-bancadas-4pc']?.enabled
              ? cfg.selectedSubItems['sub-lab-bancadas-4pc'].qty
              : 0;

          // Na base da SEDUC: 6 bancadas = 35 pontos (~5,833 por bancada de 3 PCs) ou 3*qtd3 + 4*qtd4
          const totalPontos =
            qtd3 === 6 && qtd4 === 0 ? 35 : Math.max(0, Math.round(qtd3 * 3 + qtd4 * 4));

          if (cfg.selectedSubItems['sub-lab-logica-rj45']) {
            cfg.selectedSubItems['sub-lab-logica-rj45'] = {
              ...cfg.selectedSubItems['sub-lab-logica-rj45'],
              enabled: totalPontos > 0,
              qty: totalPontos,
            };
          }
          if (cfg.selectedSubItems['sub-lab-tomadas-eletrica']) {
            cfg.selectedSubItems['sub-lab-tomadas-eletrica'] = {
              ...cfg.selectedSubItems['sub-lab-tomadas-eletrica'],
              enabled: totalPontos > 0,
              qty: totalPontos,
            };
          }
        }

        current[demandId] = { ...cfg };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      toggleModularSubItemService: (demandId, subItemId, serviceId) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg || !cfg.selectedSubItems) return;

        const subObj = cfg.selectedSubItems[subItemId];
        if (!subObj) return;

        const sOverrides = { ...(subObj.serviceOverrides || {}) };
        const prev = sOverrides[serviceId] || { enabled: true };
        sOverrides[serviceId] = {
          ...prev,
          enabled: !prev.enabled,
        };

        cfg.selectedSubItems[subItemId] = {
          ...subObj,
          serviceOverrides: sOverrides,
        };
        current[demandId] = { ...cfg };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      updateLabSelectorParams: (demandId, patch) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg || !cfg.selectedSubItems) return;

        const prevParams: LabSelectorParams = cfg.labSelectorParams || {
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

        const next: LabSelectorParams = {
          row1Pcs: Math.max(0, patch.row1Pcs !== undefined ? patch.row1Pcs : prevParams.row1Pcs),
          row1Benches: Math.max(0, patch.row1Benches !== undefined ? patch.row1Benches : prevParams.row1Benches),
          row2Pcs: Math.max(0, patch.row2Pcs !== undefined ? patch.row2Pcs : prevParams.row2Pcs),
          row2Benches: Math.max(0, patch.row2Benches !== undefined ? patch.row2Benches : prevParams.row2Benches),
          luminarias: Math.max(0, patch.luminarias !== undefined ? patch.luminarias : prevParams.luminarias),
          janelas: Math.max(0, patch.janelas !== undefined ? patch.janelas : prevParams.janelas),
          janelaComp: Math.max(0.1, patch.janelaComp !== undefined ? patch.janelaComp : prevParams.janelaComp),
          janelaAlt: Math.max(0.1, patch.janelaAlt !== undefined ? patch.janelaAlt : prevParams.janelaAlt),
          salaAreaM2: Math.max(0, patch.salaAreaM2 !== undefined ? patch.salaAreaM2 : prevParams.salaAreaM2),
        };

        const subs = { ...cfg.selectedSubItems };

        // 1. Cálculo das Bancadas por Fileira (Fileira 1 e Fileira 2)
        // Uma bancada base de 3 PCs tem fator 1.0 (2,464 m² granito, 1,3125 m² alvenaria h=75cm).
        // Se uma fileira tiver 4 PCs por bancada (ou mais/menos), aplica o acréscimo de +0,68m de comprimento por PC extra.
        const calcEquivBenches3 = (benches: number, pcsPerBench: number) => {
          if (benches <= 0 || pcsPerBench <= 0) return 0;
          // Base 3 PCs = 2,50m comprimento. Cada PC extra/menos = +-0,68m -> razão (2.50 + (pcs - 3)*0.68) / 2.50
          const factor = Math.max(0.4, (2.5 + (pcsPerBench - 3) * 0.68) / 2.5);
          return trunc2(benches * factor);
        };

        // Se ambas fileiras estiverem no padrão (3 PCs x 3 Bancadas + 3 PCs x 3 Bancadas = 6 bancadas), mantém 6.00 exato
        const isDefaultBenches =
          next.row1Pcs === 3 &&
          next.row1Benches === 3 &&
          next.row2Pcs === 3 &&
          next.row2Benches === 3;

        const equivBenchesTotal = isDefaultBenches
          ? 6
          : trunc2(
              calcEquivBenches3(next.row1Benches, next.row1Pcs) +
                calcEquivBenches3(next.row2Benches, next.row2Pcs)
            );

        subs['sub-lab-bancadas-3pc'] = {
          ...(subs['sub-lab-bancadas-3pc'] || {}),
          enabled: equivBenchesTotal > 0,
          qty: equivBenchesTotal,
        };
        if (subs['sub-lab-bancadas-4pc']) {
          subs['sub-lab-bancadas-4pc'] = {
            ...subs['sub-lab-bancadas-4pc'],
            enabled: false,
            qty: 0,
          };
        }

        // 2. Pontos de Lógica RJ45 e Tomadas Elétricas automáticos pelas Bancadas e PCs
        const totalPcs = next.row1Benches * next.row1Pcs + next.row2Benches * next.row2Pcs;
        const effectivePoints = isDefaultBenches ? 35 : totalPcs;

        subs['sub-lab-logica-rj45'] = {
          ...(subs['sub-lab-logica-rj45'] || {}),
          enabled: effectivePoints > 0,
          qty: effectivePoints,
        };
        subs['sub-lab-tomadas-eletrica'] = {
          ...(subs['sub-lab-tomadas-eletrica'] || {}),
          enabled: effectivePoints > 0,
          qty: effectivePoints,
        };

        // 3. Luminárias (UND)
        subs['sub-lab-iluminacao'] = {
          ...(subs['sub-lab-iluminacao'] || {}),
          enabled: next.luminarias > 0,
          qty: next.luminarias,
        };

        // 4. Janelas (UND + Dimensões C x H em metros)
        // Na planilha padrão: 4 janelas de 2,16 x 1,00 = 8,64 m² (baseCoef = 2.16 para qty = 4).
        // Se o usuário alterar C x H, escala proporcionalmente a quantidade equivalente para refletir C * H exato em m²!
        const singleWinArea = next.janelaComp * next.janelaAlt;
        const equivJanelaQty = trunc2((next.janelas * singleWinArea) / 2.16);
        subs['sub-lab-janelas'] = {
          ...(subs['sub-lab-janelas'] || {}),
          enabled: next.janelas > 0,
          qty: equivJanelaQty,
        };

        // 5. Sala (Área em m²) -> Recalcula Revestimento 10x10cm (Paredes h=1,60m + Bancadas h=0,75m), Pintura, Forro e Limpeza
        const areaRatio = next.salaAreaM2 > 0 ? next.salaAreaM2 / 56.0 : 0;
        const perimeterRatio = next.salaAreaM2 > 0 ? Math.sqrt(next.salaAreaM2 / 56.0) : 0;

        // Revestimento 10x10cm (Padrão 148 m² = ~103,6 m² das paredes h=1,60m + ~44,4 m² das 6 bancadas h=0,75m)
        const revestParedeM2 = 103.6 * perimeterRatio;
        const revestBancadasM2 = (equivBenchesTotal / 6.0) * 44.4;
        const totalRevestM2 =
          next.salaAreaM2 === 56 && isDefaultBenches
            ? 148
            : trunc2(revestParedeM2 + revestBancadasM2);

        subs['sub-lab-revestimento'] = {
          ...(subs['sub-lab-revestimento'] || {}),
          enabled: totalRevestM2 > 0,
          qty: totalRevestM2,
        };

        // Pintura Interna acima de 1,60m (Padrão 96,6 m² para sala de 56 m²)
        const totalPinturaM2 =
          next.salaAreaM2 === 56 ? 96.6 : trunc2(96.6 * perimeterRatio);
        subs['sub-lab-pintura'] = {
          ...(subs['sub-lab-pintura'] || {}),
          enabled: totalPinturaM2 > 0,
          qty: totalPinturaM2,
        };

        // Forro, Climatização e Limpeza da Sala proporcionais à área
        subs['sub-lab-forro-limpeza'] = {
          ...(subs['sub-lab-forro-limpeza'] || {}),
          enabled: next.salaAreaM2 > 0,
          qty: next.salaAreaM2 === 56 ? 1 : trunc2(areaRatio),
        };
        subs['sub-lab-climatizacao'] = {
          ...(subs['sub-lab-climatizacao'] || {}),
          enabled: next.salaAreaM2 > 0,
          qty: next.salaAreaM2 === 56 ? 35 : Math.max(1, Math.round(35 * areaRatio)),
        };

        current[demandId] = {
          ...cfg,
          selectedSubItems: subs,
          labSelectorParams: next,
        };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      updateClassroomSelectorParams: (demandId, patch) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg || !cfg.selectedSubItems) return;

        const prevParams: ClassroomSelectorParams = cfg.classroomSelectorParams || {
          temRevestimento: false,
          coberturaFolhas: 2,
          luminarias: 28,
          janelas: 3,
          janelaComp: 2.5,
          janelaAlt: 1.5,
          portas: 1,
          salaAreaM2: 42.48,
        };

        const next: ClassroomSelectorParams = {
          temRevestimento:
            patch.temRevestimento !== undefined ? patch.temRevestimento : prevParams.temRevestimento,
          coberturaFolhas:
            patch.coberturaFolhas !== undefined ? patch.coberturaFolhas : prevParams.coberturaFolhas,
          luminarias: Math.max(
            0,
            patch.luminarias !== undefined ? patch.luminarias : prevParams.luminarias
          ),
          janelas: Math.max(0, patch.janelas !== undefined ? patch.janelas : prevParams.janelas),
          janelaComp: Math.max(
            0.2,
            patch.janelaComp !== undefined ? patch.janelaComp : prevParams.janelaComp
          ),
          janelaAlt: Math.max(
            0.2,
            patch.janelaAlt !== undefined ? patch.janelaAlt : prevParams.janelaAlt
          ),
          portas: Math.max(0, patch.portas !== undefined ? patch.portas : prevParams.portas),
          salaAreaM2: Math.max(
            0,
            patch.salaAreaM2 !== undefined ? patch.salaAreaM2 : prevParams.salaAreaM2
          ),
        };

        const subs = { ...cfg.selectedSubItems };
        const areaRatio = next.salaAreaM2 > 0 ? next.salaAreaM2 / 42.48 : 0;
        const perimeterRatio = next.salaAreaM2 > 0 ? Math.sqrt(next.salaAreaM2 / 42.48) : 0;

        // 1. Estrutura, Fundação, Piso Cerâmico 45x45, Forro PVC e Calçada de Acesso
        subs['sub-sala-fundacao-estrutura'] = {
          ...(subs['sub-sala-fundacao-estrutura'] || {}),
          enabled: next.salaAreaM2 > 0,
          qty: next.salaAreaM2 === 42.48 ? 42.48 : trunc2(next.salaAreaM2),
        };

        // 2. Cobertura (Duas Folhas / 2 Águas vs Uma Folha / 1 Água)
        // Na planilha padrão: 2 Folhas (2 Águas) = 49,855 m² (inclui declividade das duas águas e 19,175 m de calha galv. 50cm).
        // Se o usuário escolher Uma Folha (1 Água), o desenvolvimento de cobertura + calha reduz em ~12% (fator 0.88).
        const roofSheetFactor = next.coberturaFolhas === 2 ? 1.0 : 0.88;
        const totalRoofM2 =
          next.salaAreaM2 === 42.48 && next.coberturaFolhas === 2
            ? 49.855
            : trunc2(49.855 * areaRatio * roofSheetFactor);

        subs['sub-sala-cobertura'] = {
          ...(subs['sub-sala-cobertura'] || {}),
          enabled: totalRoofM2 > 0,
          qty: totalRoofM2,
        };

        // 3. Janelas de Vidro de Correr 2 Folhas em Alumínio (Padrão: 3 janelas de 2,50 x 1,50m)
        const isDefaultWindowDim =
          Math.abs(next.janelaComp - 2.5) < 0.01 && Math.abs(next.janelaAlt - 1.5) < 0.01;
        const winAreaRatio = isDefaultWindowDim ? 1.0 : (next.janelaComp * next.janelaAlt) / 3.75;
        const equivWindows = isDefaultWindowDim ? next.janelas : trunc2(next.janelas * winAreaRatio);

        subs['sub-sala-janelas'] = {
          ...(subs['sub-sala-janelas'] || {}),
          enabled: next.janelas > 0,
          qty: equivWindows,
        };

        // 4. Porta de Chapa de Ferro Dupla MSG 14 (Padrão: 1 UN -> 3,9648 m²)
        subs['sub-sala-porta-ferro'] = {
          ...(subs['sub-sala-porta-ferro'] || {}),
          enabled: next.portas > 0,
          qty: next.portas,
        };

        // 5. Revestimento nas Paredes até 1,60m (1,50m Branco + 0,10m Fileira Verde) vs Somente Emassamento e Pintura
        if (next.temRevestimento) {
          const totalRevestM2 =
            next.salaAreaM2 === 42.48 ? 132.146784 : trunc2(132.146784 * perimeterRatio);
          subs['sub-sala-revestimento-160'] = {
            ...(subs['sub-sala-revestimento-160'] || {}),
            enabled: totalRevestM2 > 0,
            qty: totalRevestM2,
          };

          // Deduz a faixa revestida (132,15 m²) da área total de emassamento/pintura (339,84 m² -> 207,69 m² na parte superior e externa)
          const reducedPaintM2 = trunc2(Math.max(60, (339.84 - 132.146784) * perimeterRatio));
          subs['sub-sala-pintura'] = {
            ...(subs['sub-sala-pintura'] || {}),
            enabled: reducedPaintM2 > 0,
            qty: reducedPaintM2,
          };
        } else {
          // Sem revestimento cerâmico: parede é 100% emassada e pintada (339,84 m² selador/acrílica e 169,92 m² massa látex)
          subs['sub-sala-revestimento-160'] = {
            ...(subs['sub-sala-revestimento-160'] || {}),
            enabled: false,
            qty: 0,
          };
          const fullPaintM2 =
            next.salaAreaM2 === 42.48 ? 339.84 : trunc2(339.84 * perimeterRatio);
          subs['sub-sala-pintura'] = {
            ...(subs['sub-sala-pintura'] || {}),
            enabled: fullPaintM2 > 0,
            qty: fullPaintM2,
          };
        }

        // 6. Luminárias / Lâmpadas dentro da Sala (Padrão planilha: 28 -> 28,0368 UN)
        const effectiveLuminarias =
          next.luminarias === 28 ? 28.0368 : next.luminarias;
        subs['sub-sala-luminarias'] = {
          ...(subs['sub-sala-luminarias'] || {}),
          enabled: next.luminarias > 0,
          qty: effectiveLuminarias,
        };

        // 7. Instalações Elétricas Completas da Sala
        subs['sub-sala-eletrica-completa'] = {
          ...(subs['sub-sala-eletrica-completa'] || {}),
          enabled: next.salaAreaM2 > 0,
          qty: next.salaAreaM2 === 42.48 ? 1 : trunc2(areaRatio),
        };

        current[demandId] = {
          ...cfg,
          selectedSubItems: subs,
          classroomSelectorParams: next,
        };
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      confirmModularDemand: (demandId) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        // Se nenhum sub-item estiver ativo ou com qty > 0, remove a demanda do carrinho
        if (cfg && cfg.selectedSubItems) {
          const hasAny = Object.values(cfg.selectedSubItems).some((s) => s.enabled && s.qty > 0);
          if (!hasAny) {
            delete current[demandId];
          }
        }
        set({ selectedDemands: current, activeModularDrawerDemandId: null });
        scheduleCloudSync(get);
      },

      removeDemand: (demandId) => {
        const current = { ...get().selectedDemands };
        delete current[demandId];
        set({ selectedDemands: current });
        scheduleCloudSync(get);
      },

      togglePackageServiceItemEnabled: (demandId, serviceId) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg) return;

        const prevOverride = cfg.itemOverrides[serviceId] || { enabled: true };
        current[demandId] = {
          ...cfg,
          itemOverrides: {
            ...cfg.itemOverrides,
            [serviceId]: {
              ...prevOverride,
              enabled: !prevOverride.enabled,
            },
          },
        };
        set({ selectedDemands: current });
      },

      updatePackageServiceItemCustomQty: (demandId, serviceId, customQty) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg) return;

        const prevOverride = cfg.itemOverrides[serviceId] || { enabled: true };
        current[demandId] = {
          ...cfg,
          itemOverrides: {
            ...cfg.itemOverrides,
            [serviceId]: {
              ...prevOverride,
              customQty: customQty !== undefined && !Number.isNaN(customQty) ? Math.max(0, customQty) : undefined,
            },
          },
        };
        set({ selectedDemands: current });
      },

      selectContract: (contractId) => {
        set({ activeContractId: contractId });
        if (contractId) {
          get().runAiContractAllocation(contractId);
        } else {
          set({ aiAllocationSummary: null, aiAllocationStats: null });
        }
      },

      runAiContractAllocation: async (contractIdOverride) => {
        const targetId = contractIdOverride !== undefined ? contractIdOverride : get().activeContractId;
        if (!targetId) return;

        const contract = get().contracts.find((c) => c.id === targetId);
        if (!contract) return;

        const { demands, selectedDemands } = get();
        const rawLines = computeBudgetLines(demands, selectedDemands, null).filter((l) => l.enabled);
        if (rawLines.length === 0) return;

        set({ isAiAllocating: true });

        try {
          const response = await fetch('/api/orcamentos/alocar-contrato-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomeContrato: contract.name,
              bdiPercentual: contract.bdiPercent,
              servicosSelecionados: rawLines.map((l) => ({
                lineId: l.lineId,
                demandId: l.demandId,
                demandTitle: l.demandTitle,
                subItemTitle: l.subItemTitle,
                serviceId: l.serviceId,
                originalCode: l.originalCode,
                description: l.description,
                unit: l.unit,
                quantity: l.quantity,
                wbsStage: l.wbsStage,
              })),
              catalogoContrato: contract.priceTable,
            }),
          });

          const data = await response.json();
          if (data && Array.isArray(data.alocacoes)) {
            const nextSelected = { ...get().selectedDemands };

            for (const aloc of data.alocacoes) {
              const cfg = nextSelected[aloc.demandId];
              if (!cfg) continue;

              const key = cfg.demandType === 'MODULAR' ? aloc.lineId : aloc.serviceId;
              const prevOv = cfg.itemOverrides?.[key] || { enabled: true };

              nextSelected[aloc.demandId] = {
                ...cfg,
                itemOverrides: {
                  ...(cfg.itemOverrides || {}),
                  [key]: {
                    ...prevOv,
                    resolutionType: 'MAPPED',
                    mappedContractCode: aloc.codigo_contrato_alocado,
                    aiMemoryText: aloc.memoria_de_calculo,
                    aiJustification: aloc.justificativa_ia,
                    aiAllocationType: aloc.tipo_alocacao,
                  },
                },
              };
            }

            set({
              selectedDemands: nextSelected,
              aiAllocationSummary: data.resumo_parecer_ia,
              aiAllocationStats: {
                directCount: data.total_alocados_direto || 0,
                reallocatedCount: data.total_realocados_ia || 0,
                modelUsed: data.motor_utilizado || 'gemini-3.8-flash',
              },
            });
          }
        } catch (err) {
          console.error('Erro na alocação cognitiva IA:', err);
        } finally {
          set({ isAiAllocating: false });
        }
      },

      generateDemandFromFreePromptWithIA: async (promptText) => {
        const cleanText = promptText.trim();
        if (!cleanText) {
          return { success: false, count: 0, message: 'Digite os serviços desejados.' };
        }

        const { contracts, activeContractId, demands, selectedDemands } = get();
        const contract =
          contracts.find((c) => c.id === activeContractId) || contracts[0];
        if (!contract) {
          return { success: false, count: 0, message: 'Nenhum contrato base disponível.' };
        }

        set({ isAiAllocating: true });
        try {
          const response = await fetch('/api/orcamentos/gerar-ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomeContrato: contract.name,
              bdiPercentual: contract.bdiPercent,
              escopoUsuario: {
                contrato_id: contract.id,
                servicos_selecionados: [],
                descricao_livre: cleanText,
              },
              catalogoContrato: contract.priceTable,
            }),
          });

          const data = await response.json();
          const generatedItems = Array.isArray(data?.itens_orcamento)
            ? data.itens_orcamento
            : [];

          if (generatedItems.length === 0) {
            return {
              success: false,
              count: 0,
              message: 'A IA não encontrou composições compatíveis para esse pedido.',
            };
          }

          const demandId = `dem-ia-${Date.now()}`;
          const itemOverrides: SelectedDemandConfig['itemOverrides'] = {};

          const demandServiceItems: DemandServiceItem[] = generatedItems.map(
            (item: any, idx: number) => {
              const srvId = `srv-ia-${Date.now()}-${idx}`;
              const grupoUpper = String(item.grupo_servico || '').toUpperCase();
              const wbsStage =
                grupoUpper.includes('PRELIMINAR') ||
                grupoUpper.includes('DEMOLI') ||
                grupoUpper.includes('LIMPEZA') ||
                grupoUpper.includes('ESCAVA')
                  ? 'PRELIMINARES'
                  : grupoUpper.includes('COBERT') || grupoUpper.includes('FORRO') || grupoUpper.includes('TELHA')
                  ? 'COBERTA_FORRO'
                  : grupoUpper.includes('ESTRUT') ||
                    grupoUpper.includes('ALVENARIA') ||
                    grupoUpper.includes('CONCRETO') ||
                    grupoUpper.includes('ELÉTRIC') ||
                    grupoUpper.includes('HIDRÁULIC')
                  ? 'ESTRUTURA_ALVENARIA'
                  : 'ACABAMENTOS';

              itemOverrides[srvId] = {
                enabled: true,
                customQty: Number(item.quantidade) || 1,
                resolutionType: 'MAPPED',
                mappedContractCode: item.codigo_contrato,
                aiMemoryText: item.memoria_de_calculo,
                aiJustification: item.justificativa_tecnica,
                aiAllocationType: 'ALOCACAO_DIRETA',
              };

              return {
                id: srvId,
                code: item.codigo_contrato,
                source: 'SINAPI',
                description: item.descricao_contrato,
                unit: item.unidade,
                baseCoef: Number(item.quantidade) || 1,
                estimatedUnitPrice: Number(item.preco_unitario) || 0,
                wbsStage,
                chronoGroup:
                  wbsStage === 'PRELIMINARES'
                    ? 'SERVICOS_PRELIMINARES'
                    : wbsStage === 'ACABAMENTOS'
                    ? 'ACABAMENTOS_POS_OBRA'
                    : 'SERVICOS_DURANTE_OBRA',
              };
            }
          );

          const shortTitle =
            cleanText.length > 42 ? `${cleanText.slice(0, 42)}...` : cleanText;

          const newDemandCard: DemandCard = {
            id: demandId,
            type: 'PACKAGE',
            title: `Demanda IA: ${shortTitle}`,
            subtitle: `${demandServiceItems.length} composições alocadas em ${contract.ataNumber}`,
            iconName: 'Hammer',
            baseUnit: 'UN',
            defaultAreaM2: 50,
            items: demandServiceItems,
          };

          const nextDemands = [newDemandCard, ...demands];
          const nextSelected: Record<string, SelectedDemandConfig> = {
            ...selectedDemands,
            [demandId]: {
              demandId,
              demandType: 'PACKAGE',
              quantityUn: 1,
              itemOverrides,
            },
          };

          set({
            demands: nextDemands,
            selectedDemands: nextSelected,
            activeContractId: contract.id,
            aiAllocationSummary: `Demanda montada pela IA com ${demandServiceItems.length} composições da planilha "${contract.name}".`,
          });

          return {
            success: true,
            count: demandServiceItems.length,
            message: `Orçamento montado com ${demandServiceItems.length} composições oficiais da planilha "${contract.name}"!`,
          };
        } catch (err: any) {
          return {
            success: false,
            count: 0,
            message: String(err?.message || 'Erro ao processar demanda com IA.'),
          };
        } finally {
          set({ isAiAllocating: false });
        }
      },

      resolveServiceInconsistency: (demandId, serviceId, resolution) => {
        const current = { ...get().selectedDemands };
        const cfg = current[demandId];
        if (!cfg) return;

        const prevOverride = cfg.itemOverrides[serviceId] || { enabled: true };
        if (resolution.type === 'MAPPED') {
          current[demandId] = {
            ...cfg,
            itemOverrides: {
              ...cfg.itemOverrides,
              [serviceId]: {
                ...prevOverride,
                resolutionType: 'MAPPED',
                mappedContractCode: resolution.mappedContractCode,
              },
            },
          };
        } else {
          current[demandId] = {
            ...cfg,
            itemOverrides: {
              ...cfg.itemOverrides,
              [serviceId]: {
                ...prevOverride,
                resolutionType: 'OWN_COMPOSITION',
                customOwnPrice: resolution.customOwnPrice,
              },
            },
          };
        }
        set({ selectedDemands: current, resolvingInconsistency: null });
      },

      addDemandCard: (card) => {
        set((state) => ({
          demands: [...state.demands, card],
        }));
        scheduleCloudSync(get);
      },

      updateDemandCard: (card) => {
        set((state) => ({
          demands: state.demands.map((d) => (d.id === card.id ? card : d)),
        }));
        scheduleCloudSync(get);
      },

      deleteDemandCard: (demandId) => {
        set((state) => {
          const nextSelected = { ...state.selectedDemands };
          delete nextSelected[demandId];
          return {
            demands: state.demands.filter((d) => d.id !== demandId),
            selectedDemands: nextSelected,
          };
        });
        scheduleCloudSync(get);
      },

      importDemandItems: (demandId, items) => {
        set((state) => ({
          demands: state.demands.map((d) => (d.id === demandId ? { ...d, items } : d)),
        }));
        scheduleCloudSync(get);
      },

      addModularSubItem: (demandId, subItem) => {
        set((state) => ({
          demands: state.demands.map((d) =>
            d.id === demandId ? { ...d, subItems: [...(d.subItems || []), subItem] } : d
          ),
        }));
        scheduleCloudSync(get);
      },

      addContractTemplate: (contract) => {
        set((state) => ({
          contracts: [contract, ...state.contracts],
        }));
        scheduleCloudSync(get);
      },

      updateContractTemplate: (contract) => {
        set((state) => ({
          contracts: state.contracts.map((c) => (c.id === contract.id ? contract : c)),
        }));
        scheduleCloudSync(get);
      },

      deleteContractTemplate: (contractId) => {
        set((state) => ({
          contracts: state.contracts.filter((c) => c.id !== contractId),
          activeContractId: state.activeContractId === contractId ? null : state.activeContractId,
        }));
        scheduleCloudSync(get);
      },

      saveToCloud: async () => {
        const { demands, contracts, selectedDemands, activeContractId } = get();
        set({ isCloudSyncing: true, cloudSyncStatus: 'syncing', cloudSyncError: null });
        try {
          const res = await fetch('/api/cloud-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              demands,
              contracts,
              selectedDemands,
              activeContractId,
            }),
          });
          const result = await res.json();
          if (result && result.success) {
            set({
              isCloudSyncing: false,
              cloudSyncStatus: 'synced',
              lastCloudSync: result.updatedAt || new Date().toISOString(),
            });
            return true;
          } else {
            set({
              isCloudSyncing: false,
              cloudSyncStatus: 'error',
              cloudSyncError: result.error || 'Erro ao sincronizar na nuvem.',
            });
            return false;
          }
        } catch (err: any) {
          set({
            isCloudSyncing: false,
            cloudSyncStatus: 'error',
            cloudSyncError: String(err?.message || err),
          });
          return false;
        }
      },

      fetchFromCloud: async () => {
        set({ isCloudSyncing: true, cloudSyncStatus: 'syncing', cloudSyncError: null });
        try {
          const res = await fetch('/api/cloud-sync');
          const result = await res.json();
          if (result && result.success && result.data) {
            const d = result.data;
            if (Array.isArray(d.demands) && d.demands.length > 0) {
              set({
                demands: d.demands,
                contracts:
                  Array.isArray(d.contracts) && d.contracts.length > 0
                    ? d.contracts
                    : get().contracts,
                selectedDemands: d.selectedDemands || get().selectedDemands,
                activeContractId:
                  d.activeContractId !== undefined ? d.activeContractId : get().activeContractId,
                isCloudSyncing: false,
                cloudSyncStatus: 'synced',
                lastCloudSync: d.updatedAt || new Date().toISOString(),
              });
              return true;
            }
          }
          // Nuvem vazia ou primeira inicialização: salva o estado padrão atual
          await get().saveToCloud();
          set({ isCloudSyncing: false, cloudSyncStatus: 'synced' });
          return true;
        } catch (err: any) {
          set({
            isCloudSyncing: false,
            cloudSyncStatus: 'error',
            cloudSyncError: String(err?.message || err),
          });
          return false;
        }
      },

      resetDemoData: () =>
        set({
          demands: INITIAL_DEMANDS,
          contracts: INITIAL_CONTRACTS,
          activeContractId: 'cnt-seduc-lote1-cerrados',
          catalogFilter: 'ALL',
          selectedDemands: {
            'dem-sala-aula': {
              demandId: 'dem-sala-aula',
              demandType: 'MODULAR',
              quantityUn: 1,
              itemOverrides: {},
              selectedSubItems: {
                'sub-sala-fundacao-estrutura': { enabled: true, qty: 42.48 },
                'sub-sala-cobertura': { enabled: true, qty: 49.855 },
                'sub-sala-janelas': { enabled: true, qty: 3 },
                'sub-sala-porta-ferro': { enabled: true, qty: 1 },
                'sub-sala-pintura': { enabled: true, qty: 339.84 },
                'sub-sala-revestimento-160': { enabled: false, qty: 0 },
                'sub-sala-luminarias': { enabled: true, qty: 28.0368 },
                'sub-sala-eletrica-completa': { enabled: true, qty: 1 },
              },
              classroomSelectorParams: {
                temRevestimento: false,
                coberturaFolhas: 2,
                luminarias: 28,
                janelas: 3,
                janelaComp: 2.5,
                janelaAlt: 1.5,
                portas: 1,
                salaAreaM2: 42.48,
              },
            },
          },
        }),
    }),
    {
      name: 'orcacraft-lab-storage-v9',
    }
  )
);
