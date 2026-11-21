import React from 'react';
import {
  Building2,
  Bath,
  PaintRoller,
  Zap,
  Warehouse,
  LayoutGrid,
  Hammer,
  Wrench,
  Laptop,
  Check,
  Plus,
  Minus,
  SlidersHorizontal,
  Settings2,
} from 'lucide-react';
import { DemandCard } from '../types/budget';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  formatCurrencyBRL,
  getCardActiveConfigSummary,
  getCardBaseEstimate,
} from '../utils/mathEngine';

const ICON_MAP: Record<DemandCard['iconName'], React.ComponentType<{ className?: string }>> = {
  Building2,
  Bath,
  PaintRoller,
  Zap,
  Warehouse,
  LayoutGrid,
  Hammer,
  Wrench,
  Laptop,
};

interface DemandCardItemProps {
  demand: DemandCard;
}

export const DemandCardItem: React.FC<DemandCardItemProps> = ({ demand }) => {
  const {
    contracts,
    selectedDemands,
    activeContractId,
    togglePackageSelection,
    updatePackageQuantity,
    openModularDrawer,
    setInspectingDemandId,
  } = useBudgetStore();

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const selectedConfig = selectedDemands[demand.id];
  const isSelected = Boolean(selectedConfig);
  const IconComponent = ICON_MAP[demand.iconName] || Building2;

  // Resumo dinâmico de 1 linha
  const summaryLine = getCardActiveConfigSummary(demand, selectedConfig);

  // Valor estimado
  const displayedPrice = getCardBaseEstimate(demand, activeContract, selectedConfig);

  const handleCardClick = () => {
    if (demand.type === 'PACKAGE') {
      togglePackageSelection(demand.id);
    } else {
      openModularDrawer(demand.id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[190px] select-none ${
        isSelected
          ? 'card-selected-overlay border-[1.5px] border-[#D4A359] shadow-gold-glow'
          : 'bg-[#191D26] border border-[#262C3A] hover:border-[#D4A359]/45 hover:bg-[#212632]/70'
      }`}
    >
      <div>
        {/* Informação 1: Ícone + Badge de Tipo (Pacote Fechado ou Personalizável) */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-[#D4A359]/20 border border-[#D4A359]/50 text-[#D4A359]'
                : 'bg-[#212632] border border-[#262C3A] text-[#94A3B8] group-hover:text-[#F8FAFC]'
            }`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            {demand.type === 'PACKAGE' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#212632] border border-[#262C3A] text-[#D4A359]">
                Pacote Fechado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D97724]/15 border border-[#D97724]/40 text-[#D97724]">
                Personalizável
              </span>
            )}

            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-[#D4A359] text-[#0D0F13] flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        {/* Informação 2: Título da Demanda (16px Bold) */}
        <h3
          className={`font-heading text-[16px] font-bold leading-snug transition-colors ${
            isSelected ? 'text-[#D4A359]' : 'text-[#F8FAFC]'
          }`}
        >
          {demand.title}
        </h3>

        {/* Informação 3: Resumo Dinâmico (1 linha) */}
        <p
          className={`text-[12px] mt-1.5 line-clamp-1 transition-colors ${
            isSelected ? 'text-[#F8FAFC] font-medium' : 'text-[#94A3B8]'
          }`}
          title={summaryLine}
        >
          {summaryLine}
        </p>
      </div>

      {/* Informação 4: Rodapé do Card (Valor Estimado + Ação Contextual) */}
      <div className="pt-3.5 mt-2 border-t border-[#262C3A]/70 flex items-end justify-between gap-2">
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-[#94A3B8]">
            {isSelected ? 'Subtotal Orçado' : 'Valor Estimado'}
          </span>
          <span
            className={`font-heading text-[18px] font-bold tabular-nums leading-tight ${
              isSelected ? 'text-[#D4A359]' : 'text-[#F8FAFC]'
            }`}
          >
            {formatCurrencyBRL(displayedPrice)}
          </span>
        </div>

        {/* Ação Contextual */}
        <div>
          {demand.type === 'PACKAGE' ? (
            isSelected && selectedConfig ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-[#131720] border border-[#D4A359]/60 rounded-lg px-1.5 py-1 shadow-inner"
              >
                <button
                  type="button"
                  onClick={() => updatePackageQuantity(demand.id, -1, true)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#212632] transition-colors"
                  title="Diminuir"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-1.5 text-xs font-bold text-[#F8FAFC] tabular-nums">
                  {selectedConfig.quantityUn} UN
                </span>
                <button
                  type="button"
                  onClick={() => updatePackageQuantity(demand.id, 1, true)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[#D4A359] hover:bg-[#212632] transition-colors"
                  title="Aumentar"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setInspectingDemandId(demand.id)}
                  className="ml-1 p-1 rounded bg-[#212632] hover:bg-[#D4A359]/20 text-[#D4A359] text-[10px]"
                  title="Inspecionar Itens do Pacote"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[#212632] group-hover:bg-[#D4A359] text-xs font-heading font-semibold text-[#F8FAFC] group-hover:text-[#0D0F13] transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            )
          ) : isSelected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModularDrawer(demand.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#D4A359]/20 border border-[#D4A359] text-xs font-heading font-semibold text-[#D4A359] hover:bg-[#D4A359] hover:text-[#0D0F13] transition-colors flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openModularDrawer(demand.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#D97724]/20 border border-[#D97724]/60 text-xs font-heading font-semibold text-[#D97724] hover:bg-[#D97724] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Configurar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
