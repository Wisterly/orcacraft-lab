export type WBSStage =
  | 'PRELIMINARES'
  | 'ESTRUTURA_ALVENARIA'
  | 'COBERTA_FORRO'
  | 'ACABAMENTOS';

export type ChronoGroup =
  | 'SERVICOS_PRELIMINARES'
  | 'SERVICOS_DURANTE_OBRA'
  | 'ACABAMENTOS_POS_OBRA';

export type DemandType = 'PACKAGE' | 'MODULAR';

export interface DemandServiceItem {
  id: string;
  code: string; // Ex: SINAPI-93358, SEINFRA-C0842
  source: 'SINAPI' | 'SEINFRA' | 'PRÓPRIO';
  description: string;
  unit: string;
  baseCoef: number; // Quantitativo padrão para 1 UN da demanda ou 1 unidade do sub-item
  estimatedUnitPrice: number; // Preço base do catálogo (sem contrato selecionado)
  wbsStage: WBSStage;
  chronoGroup: ChronoGroup;
}

export interface ModularSubItem {
  id: string;
  title: string; // Ex: "Salas de Aula", "Refeitório", "Janelas", "Calçada"
  unit: 'un' | 'm²' | 'm';
  defaultQty: number; // Ex: 1 ou 2
  services: DemandServiceItem[];
}

export interface DemandCard {
  id: string;
  type: DemandType; // 'PACKAGE' (Pacote Fechado) ou 'MODULAR' (Personalizável)
  title: string;
  subtitle: string;
  iconName: 'Building2' | 'Bath' | 'PaintRoller' | 'Zap' | 'Warehouse' | 'LayoutGrid' | 'Hammer' | 'Wrench' | 'Laptop';
  baseUnit: 'UN' | 'm²' | 'm';
  defaultAreaM2?: number;
  items?: DemandServiceItem[]; // Para demandas do tipo 'PACKAGE'
  subItems?: ModularSubItem[]; // Para demandas do tipo 'MODULAR'
}

export interface ModularSubItemSelection {
  enabled: boolean;
  qty: number;
  serviceOverrides?: Record<
    string,
    {
      enabled: boolean;
      customQty?: number;
    }
  >;
}

export interface LabSelectorParams {
  row1Pcs: number;
  row1Benches: number;
  row2Pcs: number;
  row2Benches: number;
  luminarias: number;
  janelas: number;
  janelaComp: number;
  janelaAlt: number;
  salaAreaM2: number;
}

export interface ClassroomSelectorParams {
  temRevestimento: boolean; // false = só emassamento + pintura; true = revestimento até 1,60m (1,50m branco + 0,10m fileira verde)
  coberturaFolhas: 1 | 2; // 1 = Uma Folha (1 Água); 2 = Duas Folhas (2 Águas)
  luminarias: number; // Quantidade de lâmpadas/luminárias dentro da sala (padrão planilha: 28.04 ou editável pelo usuário)
  janelas: number; // Quantidade de janelas de vidro 2 folhas (padrão: 3 UN)
  janelaComp: number; // Comprimento da janela em m (padrão: 2,50 m)
  janelaAlt: number; // Altura da janela em m (padrão: 1,50 m -> 3 * 3,75 * 1,18 = 13,275 m²)
  portas: number; // Porta de chapa de ferro (padrão: 1 UN -> 3,9648 m²)
  salaAreaM2: number; // Área base da sala de aula em m² (padrão: 42,48 m² piso / 48,00 m² sala)
}

export interface SelectedDemandConfig {
  demandId: string;
  demandType: DemandType;
  // Se for PACKAGE:
  quantityUn: number;
  customAreaM2?: number;
  itemOverrides: Record<
    string,
    {
      enabled: boolean;
      customQty?: number;
      mappedContractCode?: string;
      customOwnPrice?: number;
      resolutionType?: 'MAPPED' | 'OWN_COMPOSITION';
      aiMemoryText?: string;
      aiJustification?: string;
      aiAllocationType?: 'ALOCACAO_DIRETA' | 'REALOCACAO_INTELIGENTE_IA';
    }
  >;
  // Se for MODULAR:
  selectedSubItems?: Record<string, ModularSubItemSelection>;
  // Parâmetros visuais do Menu Seletor do Laboratório de Informática
  labSelectorParams?: LabSelectorParams;
  // Parâmetros visuais do Menu Seletor da Construção de Sala de Aula
  classroomSelectorParams?: ClassroomSelectorParams;
}

export interface ContractPriceItem {
  code: string;
  source: string;
  description: string;
  unit: string;
  unitPrice: number; // Preço unitário oficial do contrato (sem BDI)
  disciplina?: string; // Ex: "PINTURA", "PISO", "ALVENARIA", "ELETRICA", "COBERTURA"
  tags_universais?: string[]; // Ex: ["PINTURA", "PAREDE", "INTERNO", "ACABAMENTO", "ACRILICA"]
  gatilhos_sinonimos?: string[]; // Ex: ["pintar sala", "tinta parede"]
  servicos_embutidos?: string[]; // Ex: ["LIXAMENTO", "FUNDO_SELADOR"]
}

export interface ContractTemplate {
  id: string;
  name: string;
  ataNumber: string;
  agency: string;
  bdiPercent: number; // Ex: 24.50 (%)
  taxRegime: 'DESONERADO' | 'NAO_DESONERADO';
  createdAt: string;
  templateFileName?: string;
  templateBase64?: string; // Armazena o binário .xlsx original para injeção cirúrgica
  priceTable: ContractPriceItem[];
}

export interface ComputedBudgetLine {
  lineId: string;
  demandId: string;
  demandTitle: string;
  subItemId?: string;
  subItemTitle?: string;
  serviceId: string;
  originalCode: string;
  effectiveCode: string;
  source: string;
  description: string;
  unit: string;
  enabled: boolean;
  wbsStage: WBSStage;
  chronoGroup: ChronoGroup;
  quantity: number;
  baseUnitPrice: number; // Preço unitário antes do BDI (do catálogo ou do contrato)
  unitPriceWithBdi: number; // Truncado em 2 casas decimais
  totalPrice: number; // Truncado em 2 casas decimais: trunc(quantity * unitPriceWithBdi)
  contractStatus: 'CATALOG_DEFAULT' | 'MATCHED' | 'MAPPED' | 'OWN_COMPOSITION' | 'UNMATCHED';
  aiMemoryText?: string;
  aiJustification?: string;
  aiAllocationType?: 'ALOCACAO_DIRETA' | 'REALOCACAO_INTELIGENTE_IA';
}

// =========================================================
// ENTIDADES DO MOTOR COGNITIVO DE ORÇAMENTAÇÃO IA (GEMINI)
// =========================================================

export interface AiBudgetItem {
  grupo_servico: string;
  ambiente_vinculado: string;
  gatilho_origem: string;
  codigo_contrato: string;
  descricao_contrato: string;
  unidade: string;
  quantidade: number;
  memoria_de_calculo: string;
  nivel_confianca: 'ALTO' | 'MEDIO' | 'BAIXO';
  justificativa_tecnica: string;
  preco_unitario: number;
  subtotal: number;
}

export interface AiMissingContractItem {
  gatilho_necessario: string;
  descricao_sugerida: string;
  quantidade_estimada: number;
  unidade: string;
  motivo: string;
}

export interface AiBudgetResult {
  motor_utilizado?: string;
  resumo_analise: {
    contrato_utilizado: string;
    ambientes_identificados: string[];
    premissas_adotadas: string[];
  };
  itens_orcamento: AiBudgetItem[];
  itens_nao_encontrados_no_contrato: AiMissingContractItem[];
  alertas_engenharia: string[];
  resumo_financeiro: {
    total_sem_bdi: number;
    bdi_percentual: number;
    valor_bdi: number;
    total_geral: number;
  };
}
