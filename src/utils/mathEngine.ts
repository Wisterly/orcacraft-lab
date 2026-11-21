import {
  ComputedBudgetLine,
  ContractTemplate,
  DemandCard,
  SelectedDemandConfig,
  WBSStage,
} from '../types/budget';

/**
 * Truncamento estrito na 2ª casa decimal (Padrão Engenharia Pública / TCU / SINAPI)
 */
export function trunc2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  return (sign * Math.trunc(abs * 100 + 1e-9)) / 100;
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(trunc2(value));
}

export function formatNumberBR(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Gera o texto do resumo dinâmico de 1 linha para o Card de Demanda:
 * - Se inativo: exibe o subtítulo curto.
 * - Se ativo e for Pacote Fechado: exibe "X UN no orçamento".
 * - Se ativo e for Modular/Personalizável: exibe os itens marcados (ex: "2 Salas, 8 Janelas, 35m Calçada").
 */
export function getCardActiveConfigSummary(
  demand: DemandCard,
  config: SelectedDemandConfig | undefined
): string {
  if (!config) return demand.subtitle;

  if (demand.type === 'PACKAGE') {
    return `${config.quantityUn} UN no orçamento (${demand.subtitle})`;
  }

  if (demand.type === 'MODULAR' && config.labSelectorParams) {
    const p = config.labSelectorParams;
    const totalBenches = p.row1Benches + p.row2Benches;
    return `${totalBenches} Bancadas (F1: ${p.row1Benches}×${p.row1Pcs}PCs | F2: ${p.row2Benches}×${p.row2Pcs}PCs) • ${p.luminarias} Luminárias • ${p.janelas} Janelas • Sala ${formatNumberBR(p.salaAreaM2, 2)} m²`;
  }

  if (demand.type === 'MODULAR' && config.classroomSelectorParams) {
    const c = config.classroomSelectorParams;
    const revLabel = c.temRevestimento
      ? 'Com Revestimento 1,60m (1,50m Branco + 0,10m Verde)'
      : 'Parede Só Emassada e Pintada';
    const roofLabel = c.coberturaFolhas === 2 ? 'Cobertura 2 Folhas' : 'Cobertura 1 Folha';
    return `${revLabel} • ${roofLabel} • ${c.janelas} Janelas Vidro 2F • ${Math.round(c.luminarias)} Luminárias • ${c.portas} Porta Ferro • Piso Cerâmico ${formatNumberBR(c.salaAreaM2, 2)} m²`;
  }

  if (demand.type === 'MODULAR' && demand.subItems && config.selectedSubItems) {
    const parts: string[] = [];
    for (const sub of demand.subItems) {
      const sel = config.selectedSubItems[sub.id];
      if (sel && sel.enabled && sel.qty > 0) {
        const unitSuffix = sub.unit === 'm' || sub.unit === 'm²' ? sub.unit : '';
        parts.push(`${sel.qty}${unitSuffix ? ` ${unitSuffix}` : ''} ${sub.title}`);
      }
    }
    return parts.length > 0 ? parts.join(', ') : 'Nenhum ambiente configurado';
  }

  return demand.subtitle;
}

/**
 * Calcula o valor base estimado de um Card de Demanda:
 * - Se for PACKAGE: soma os itens para 1 UN (ou multiplicado pela quantidade ativa).
 * - Se for MODULAR: soma os sub-itens marcados (ou os defaultQty se ainda não selecionado).
 */
export function getCardBaseEstimate(
  demand: DemandCard,
  activeContract: ContractTemplate | null,
  activeConfig?: SelectedDemandConfig
): number {
  let sum = 0;
  const bdi = activeContract ? activeContract.bdiPercent : 0;

  if (demand.type === 'PACKAGE' && demand.items) {
    const multiplier = activeConfig ? activeConfig.quantityUn : 1;
    for (const item of demand.items) {
      let unitBase = item.estimatedUnitPrice;
      if (activeContract) {
        const found = activeContract.priceTable.find(
          (p) => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
        );
        if (found) unitBase = found.unitPrice;
      }
      const unitWithBdi = activeContract ? trunc2(unitBase * (1 + bdi / 100)) : trunc2(unitBase);
      const itemTotal = trunc2(item.baseCoef * multiplier * unitWithBdi);
      sum = trunc2(sum + itemTotal);
    }
  } else if (demand.type === 'MODULAR' && demand.subItems) {
    for (const sub of demand.subItems) {
      const sel = activeConfig?.selectedSubItems?.[sub.id];
      const isEnabled = sel ? sel.enabled : true;
      const qty = sel ? sel.qty : activeConfig ? 0 : sub.defaultQty;

      if (!isEnabled || qty <= 0) continue;

      for (const item of sub.services) {
        let unitBase = item.estimatedUnitPrice;
        if (activeContract) {
          const found = activeContract.priceTable.find(
            (p) => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
          );
          if (found) unitBase = found.unitPrice;
        }
        const unitWithBdi = activeContract ? trunc2(unitBase * (1 + bdi / 100)) : trunc2(unitBase);
        const itemTotal = trunc2(item.baseCoef * qty * unitWithBdi);
        sum = trunc2(sum + itemTotal);
      }
    }
  }

  return sum;
}

/**
 * Motor de Compatibilização Contratual (INNER/LEFT JOIN) entre o catálogo e a planilha oficial
 */
export function computeBudgetLines(
  demands: DemandCard[],
  selectedConfigs: Record<string, SelectedDemandConfig>,
  activeContract: ContractTemplate | null
): ComputedBudgetLine[] {
  const lines: ComputedBudgetLine[] = [];
  const bdiPercent = activeContract ? activeContract.bdiPercent : 0;

  for (const demand of demands) {
    const config = selectedConfigs[demand.id];
    if (!config) continue;

    // 1. PROCESSA PACOTE FECHADO
    if (demand.type === 'PACKAGE' && demand.items) {
      const scaleFactor = config.quantityUn;

      for (const item of demand.items) {
        const override = config.itemOverrides[item.id];
        const enabled = override ? override.enabled : true;
        const scaledQty = trunc2(item.baseCoef * scaleFactor);
        const effectiveQty =
          override && typeof override.customQty === 'number' ? trunc2(override.customQty) : scaledQty;

        let effectiveCode = item.code;
        let effectiveDesc = item.description;
        let effectiveUnit = item.unit;
        let effectiveSource: string = item.source;
        let baseUnitPrice = item.estimatedUnitPrice;
        let contractStatus: ComputedBudgetLine['contractStatus'] = 'CATALOG_DEFAULT';

        if (activeContract) {
          if (override?.resolutionType === 'MAPPED' && override.mappedContractCode) {
            const mappedMatch = activeContract.priceTable.find(
              (p) => p.code.trim().toUpperCase() === override.mappedContractCode!.trim().toUpperCase()
            );
            if (mappedMatch) {
              effectiveCode = mappedMatch.code;
              effectiveDesc = mappedMatch.description;
              effectiveUnit = mappedMatch.unit;
              effectiveSource = mappedMatch.source || item.source;
              baseUnitPrice = mappedMatch.unitPrice;
              contractStatus = 'MAPPED';
            }
          } else if (
            override?.resolutionType === 'OWN_COMPOSITION' &&
            typeof override.customOwnPrice === 'number'
          ) {
            baseUnitPrice = override.customOwnPrice;
            effectiveSource = 'COMP. PRÓPRIA';
            contractStatus = 'OWN_COMPOSITION';
          } else {
            const exactMatch = activeContract.priceTable.find(
              (p) => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
            );
            if (exactMatch) {
              baseUnitPrice = exactMatch.unitPrice;
              effectiveUnit = exactMatch.unit || item.unit;
              effectiveSource = exactMatch.source || item.source;
              contractStatus = 'MATCHED';
            } else {
              contractStatus = 'UNMATCHED';
            }
          }
        }

        const unitPriceWithBdi = activeContract
          ? trunc2(baseUnitPrice * (1 + bdiPercent / 100))
          : trunc2(baseUnitPrice);

        const totalPrice = enabled ? trunc2(effectiveQty * unitPriceWithBdi) : 0;

        lines.push({
          lineId: `${demand.id}__${item.id}`,
          demandId: demand.id,
          demandTitle: demand.title,
          serviceId: item.id,
          originalCode: item.code,
          effectiveCode,
          source: effectiveSource,
          description: effectiveDesc,
          unit: effectiveUnit,
          enabled,
          wbsStage: item.wbsStage,
          chronoGroup: item.chronoGroup,
          quantity: effectiveQty,
          baseUnitPrice: trunc2(baseUnitPrice),
          unitPriceWithBdi,
          totalPrice,
          contractStatus,
          aiMemoryText: override?.aiMemoryText,
          aiJustification: override?.aiJustification,
          aiAllocationType: override?.aiAllocationType,
        });
      }
    }

    // 2. PROCESSA CONSTRUTOR MODULAR (VARIÁVEL POR AMBIENTE)
    else if (demand.type === 'MODULAR' && demand.subItems && config.selectedSubItems) {
      for (const sub of demand.subItems) {
        const subConfig = config.selectedSubItems[sub.id];
        if (!subConfig || !subConfig.enabled || subConfig.qty <= 0) continue;

        for (const item of sub.services) {
          const lineId = `${demand.id}__${sub.id}__${item.id}`;
          const sOverride = subConfig.serviceOverrides?.[item.id];
          const globalOverride = config.itemOverrides?.[lineId] || config.itemOverrides?.[item.id];
          const enabled = sOverride ? sOverride.enabled : globalOverride ? globalOverride.enabled : true;
          const scaledQty = trunc2(item.baseCoef * subConfig.qty);
          const effectiveQty =
            sOverride && typeof sOverride.customQty === 'number'
              ? trunc2(sOverride.customQty)
              : globalOverride && typeof globalOverride.customQty === 'number'
              ? trunc2(globalOverride.customQty)
              : scaledQty;

          let effectiveCode = item.code;
          let effectiveDesc = item.description;
          let effectiveUnit = item.unit;
          let effectiveSource: string = item.source;
          let baseUnitPrice = item.estimatedUnitPrice;
          let contractStatus: ComputedBudgetLine['contractStatus'] = 'CATALOG_DEFAULT';

          if (activeContract) {
            if (globalOverride?.resolutionType === 'MAPPED' && globalOverride.mappedContractCode) {
              const mappedMatch = activeContract.priceTable.find(
                (p) => p.code.trim().toUpperCase() === globalOverride.mappedContractCode!.trim().toUpperCase()
              );
              if (mappedMatch) {
                effectiveCode = mappedMatch.code;
                effectiveDesc = mappedMatch.description;
                effectiveUnit = mappedMatch.unit;
                effectiveSource = mappedMatch.source || item.source;
                baseUnitPrice = mappedMatch.unitPrice;
                contractStatus = 'MAPPED';
              }
            } else if (
              globalOverride?.resolutionType === 'OWN_COMPOSITION' &&
              typeof globalOverride.customOwnPrice === 'number'
            ) {
              baseUnitPrice = globalOverride.customOwnPrice;
              effectiveSource = 'COMP. PRÓPRIA';
              contractStatus = 'OWN_COMPOSITION';
            } else {
              const exactMatch = activeContract.priceTable.find(
                (p) => p.code.trim().toUpperCase() === item.code.trim().toUpperCase()
              );
              if (exactMatch) {
                baseUnitPrice = exactMatch.unitPrice;
                effectiveUnit = exactMatch.unit || item.unit;
                effectiveSource = exactMatch.source || item.source;
                contractStatus = 'MATCHED';
              } else {
                contractStatus = 'UNMATCHED';
              }
            }
          }

          const unitPriceWithBdi = activeContract
            ? trunc2(baseUnitPrice * (1 + bdiPercent / 100))
            : trunc2(baseUnitPrice);

          const totalPrice = enabled ? trunc2(effectiveQty * unitPriceWithBdi) : 0;

          lines.push({
            lineId,
            demandId: demand.id,
            demandTitle: demand.title,
            subItemId: sub.id,
            subItemTitle: sub.title,
            serviceId: item.id,
            originalCode: item.code,
            effectiveCode,
            source: effectiveSource,
            description: effectiveDesc,
            unit: effectiveUnit,
            enabled,
            wbsStage: item.wbsStage,
            chronoGroup: item.chronoGroup,
            quantity: effectiveQty,
            baseUnitPrice: trunc2(baseUnitPrice),
            unitPriceWithBdi,
            totalPrice,
            contractStatus,
            aiMemoryText: globalOverride?.aiMemoryText,
            aiJustification: globalOverride?.aiJustification,
            aiAllocationType: globalOverride?.aiAllocationType,
          });
        }
      }
    }
  }

  return lines;
}

export interface WBSBreakdownSummary {
  stage: WBSStage;
  label: string;
  amount: number;
  percentage: number;
}

export const WBS_LABELS: Record<WBSStage, string> = {
  PRELIMINARES: 'Serviços Preliminares',
  ESTRUTURA_ALVENARIA: 'Estrutura/Alvenaria',
  COBERTA_FORRO: 'Coberta/Forro',
  ACABAMENTOS: 'Acabamentos',
};

export function computeWBSSummary(lines: ComputedBudgetLine[]): {
  total: number;
  stages: WBSBreakdownSummary[];
} {
  const activeLines = lines.filter((l) => l.enabled);
  const total = activeLines.reduce((acc, l) => trunc2(acc + l.totalPrice), 0);

  const stageTotals: Record<WBSStage, number> = {
    PRELIMINARES: 0,
    ESTRUTURA_ALVENARIA: 0,
    COBERTA_FORRO: 0,
    ACABAMENTOS: 0,
  };

  for (const line of activeLines) {
    stageTotals[line.wbsStage] = trunc2(stageTotals[line.wbsStage] + line.totalPrice);
  }

  const order: WBSStage[] = [
    'PRELIMINARES',
    'ESTRUTURA_ALVENARIA',
    'COBERTA_FORRO',
    'ACABAMENTOS',
  ];

  const stages: WBSBreakdownSummary[] = order.map((st) => {
    const amount = stageTotals[st];
    const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
    return {
      stage: st,
      label: WBS_LABELS[st],
      amount,
      percentage,
    };
  });

  return { total, stages };
}
