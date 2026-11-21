import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus,
  Upload,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Layers,
  Briefcase,
  Download,
  ArrowRight,
  FolderPlus,
} from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  ChronoGroup,
  ContractPriceItem,
  ContractTemplate,
  DemandCard,
  DemandServiceItem,
  ModularSubItem,
  WBSStage,
} from '../types/budget';
import { formatCurrencyBRL, getCardBaseEstimate } from '../utils/mathEngine';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function mapStageFromText(text: string): { wbsStage: WBSStage; chronoGroup: ChronoGroup } {
  const upper = text.toUpperCase();
  if (upper.includes('PRELIMINAR') || upper.includes('DEMOLI') || upper.includes('LOCA') || upper.includes('ESCAV')) {
    return { wbsStage: 'PRELIMINARES', chronoGroup: 'SERVICOS_PRELIMINARES' };
  }
  if (upper.includes('COBERT') || upper.includes('TELHA') || upper.includes('FORRO') || upper.includes('CALHA')) {
    return { wbsStage: 'COBERTA_FORRO', chronoGroup: 'SERVICOS_DURANTE_OBRA' };
  }
  if (
    upper.includes('ACABAMENT') ||
    upper.includes('PINTURA') ||
    upper.includes('REVEST') ||
    upper.includes('LOUÇA') ||
    upper.includes('PISO') ||
    upper.includes('ESMALTE')
  ) {
    return { wbsStage: 'ACABAMENTOS', chronoGroup: 'ACABAMENTOS_POS_OBRA' };
  }
  return { wbsStage: 'ESTRUTURA_ALVENARIA', chronoGroup: 'SERVICOS_DURANTE_OBRA' };
}

export const SettingsView: React.FC = () => {
  const {
    demands,
    contracts,
    activeContractId,
    addDemandCard,
    deleteDemandCard,
    importDemandItems,
    addModularSubItem,
    addContractTemplate,
    deleteContractTemplate,
    selectContract,
    setActiveTab,
  } = useBudgetStore();

  const [innerTab, setInnerTab] = useState<'PACKAGES' | 'MODULAR_BUILDERS' | 'CONTRACTS'>('PACKAGES');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Estado Aba 1: Pacotes Fechados
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgSubtitle, setPkgSubtitle] = useState('');
  const [pkgIcon, setPkgIcon] = useState<DemandCard['iconName']>('Building2');
  const [pkgArea, setPkgArea] = useState('48');
  const [targetPkgForImport, setTargetPkgForImport] = useState<string>(
    demands.find((d) => d.type === 'PACKAGE')?.id || ''
  );
  const [previewPkgItems, setPreviewPkgItems] = useState<DemandServiceItem[]>([]);
  const [importedPkgFileName, setImportedPkgFileName] = useState<string>('');

  // Estado Aba 2: Grupos Variáveis e Sub-itens
  const [modCategoryTitle, setModCategoryTitle] = useState('');
  const [modCategorySubtitle, setModCategorySubtitle] = useState('');
  const [modCategoryIcon, setModCategoryIcon] = useState<DemandCard['iconName']>('PaintRoller');

  const [targetModForSubItem, setTargetModForSubItem] = useState<string>(
    demands.find((d) => d.type === 'MODULAR')?.id || ''
  );
  const [newSubItemTitle, setNewSubItemTitle] = useState('');
  const [newSubItemUnit, setNewSubItemUnit] = useState<'un' | 'm²' | 'm'>('un');
  const [newSubItemDefaultQty, setNewSubItemDefaultQty] = useState('1');

  // Estado Aba 3: Contratos e Templates
  const [contractName, setContractName] = useState('');
  const [ataNumber, setAtaNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [bdiPercent, setBdiPercent] = useState('24.80');
  const [taxRegime, setTaxRegime] = useState<'DESONERADO' | 'NAO_DESONERADO'>('DESONERADO');
  const [previewContractPrices, setPreviewContractPrices] = useState<ContractPriceItem[]>([]);
  const [uploadedTemplateName, setUploadedTemplateName] = useState<string>('');
  const [uploadedTemplateBase64, setUploadedTemplateBase64] = useState<string>('');

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // 1. Criar Pacote Fechado
  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgTitle.trim()) return;

    const newCard: DemandCard = {
      id: `dem-pkg-${Date.now()}`,
      type: 'PACKAGE',
      title: pkgTitle.trim(),
      subtitle: pkgSubtitle.trim() || 'Estrutura, Alvenaria, Coberta',
      iconName: pkgIcon,
      baseUnit: 'UN',
      defaultAreaM2: parseFloat(pkgArea) || 48,
      items: previewPkgItems.length > 0 ? previewPkgItems : [
        {
          id: `srv-${Date.now()}-1`,
          code: 'SINAPI-99059',
          source: 'SINAPI',
          description: 'LOCAÇÃO CONVENCIONAL DE OBRA E SERVIÇOS PRELIMINARES',
          unit: 'M2',
          baseCoef: parseFloat(pkgArea) || 48,
          estimatedUnitPrice: 24.5,
          wbsStage: 'PRELIMINARES',
          chronoGroup: 'SERVICOS_PRELIMINARES',
        },
        {
          id: `srv-${Date.now()}-2`,
          code: 'SINAPI-103328',
          source: 'SINAPI',
          description: 'ALVENARIA DE VEDAÇÃO EM BLOCOS CERÂMICOS',
          unit: 'M2',
          baseCoef: (parseFloat(pkgArea) || 48) * 0.9,
          estimatedUnitPrice: 74.88,
          wbsStage: 'ESTRUTURA_ALVENARIA',
          chronoGroup: 'SERVICOS_DURANTE_OBRA',
        },
      ],
    };

    addDemandCard(newCard);
    setPkgTitle('');
    setPkgSubtitle('');
    setPreviewPkgItems([]);
    setImportedPkgFileName('');
    showToast(`Pacote Fechado "${newCard.title}" cadastrado com sucesso!`);
  };

  // Upload de itens para Pacote Fechado
  const handlePackageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

    const parsed: DemandServiceItem[] = [];
    rows.forEach((row, idx) => {
      const keys = Object.keys(row);
      const getVal = (keywords: string[]) => {
        const k = keys.find((key) => keywords.some((kw) => key.toLowerCase().includes(kw)));
        return k ? row[k] : undefined;
      };

      const code = String(getVal(['cod', 'cód', 'referencia', 'sinapi']) || `SINAPI-${90000 + idx}`).trim();
      const desc = String(getVal(['desc', 'servi', 'especifica']) || '').trim();
      if (!desc && keys.length < 2) return;

      const unit = String(getVal(['un', 'unid']) || 'M2').trim().toUpperCase();
      const coef = parseFloat(String(getVal(['quant', 'coef', 'qtd']) || '10').replace(',', '.'));
      const price = parseFloat(String(getVal(['pre', 'valor', 'unit']) || '45.00').replace(',', '.'));
      const stageInfo = mapStageFromText(String(getVal(['fase', 'etapa']) || desc));

      parsed.push({
        id: `srv-imp-${Date.now()}-${idx}`,
        code,
        source: code.toUpperCase().includes('SEINFRA') ? 'SEINFRA' : 'SINAPI',
        description: desc || `Composição #${idx + 1}`,
        unit: unit || 'M2',
        baseCoef: Number.isFinite(coef) && coef > 0 ? coef : 1,
        estimatedUnitPrice: Number.isFinite(price) && price > 0 ? price : 45.0,
        wbsStage: stageInfo.wbsStage,
        chronoGroup: stageInfo.chronoGroup,
      });
    });

    setPreviewPkgItems(parsed);
    setImportedPkgFileName(file.name);
    showToast(`${parsed.length} serviços indexados do arquivo "${file.name}"!`);
  };

  const handleApplyImportToExistingPkg = () => {
    if (!targetPkgForImport || previewPkgItems.length === 0) return;
    importDemandItems(targetPkgForImport, previewPkgItems);
    const targetObj = demands.find((d) => d.id === targetPkgForImport);
    setPreviewPkgItems([]);
    setImportedPkgFileName('');
    showToast(`Composição de "${targetObj?.title}" atualizada com ${previewPkgItems.length} serviços!`);
  };

  // 2. Criar Categoria Modular
  const handleCreateModularCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modCategoryTitle.trim()) return;

    const newModularCard: DemandCard = {
      id: `dem-mod-${Date.now()}`,
      type: 'MODULAR',
      title: modCategoryTitle.trim(),
      subtitle: modCategorySubtitle.trim() || 'Serviços Variáveis por Ambiente',
      iconName: modCategoryIcon,
      baseUnit: 'UN',
      subItems: [
        {
          id: `sub-${Date.now()}-1`,
          title: 'Ambiente Principal',
          unit: 'un',
          defaultQty: 1,
          services: [
            {
              id: `srv-m-${Date.now()}-1`,
              code: 'SINAPI-99814',
              source: 'SINAPI',
              description: 'LIMPEZA E PREPARAÇÃO DE SUPERFÍCIE',
              unit: 'M2',
              baseCoef: 50.0,
              estimatedUnitPrice: 6.4,
              wbsStage: 'PRELIMINARES',
              chronoGroup: 'SERVICOS_PRELIMINARES',
            },
            {
              id: `srv-m-${Date.now()}-2`,
              code: 'SINAPI-88489',
              source: 'SINAPI',
              description: 'APLICAÇÃO DE REVESTIMENTO / PINTURA',
              unit: 'M2',
              baseCoef: 50.0,
              estimatedUnitPrice: 15.0,
              wbsStage: 'ACABAMENTOS',
              chronoGroup: 'ACABAMENTOS_POS_OBRA',
            },
          ],
        },
      ],
    };

    addDemandCard(newModularCard);
    setModCategoryTitle('');
    setModCategorySubtitle('');
    showToast(`Categoria Modular "${newModularCard.title}" criada no catálogo!`);
  };

  // Adicionar Sub-item / Ambiente em Categoria Modular
  const handleAddSubItemToCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModForSubItem || !newSubItemTitle.trim()) return;

    const newSub: ModularSubItem = {
      id: `sub-${Date.now()}`,
      title: newSubItemTitle.trim(),
      unit: newSubItemUnit,
      defaultQty: Math.max(1, parseFloat(newSubItemDefaultQty) || 1),
      services: [
        {
          id: `srv-sub-${Date.now()}-1`,
          code: 'SINAPI-88489',
          source: 'SINAPI',
          description: `SERVIÇO PADRÃO PARA ${newSubItemTitle.toUpperCase()}`,
          unit: newSubItemUnit === 'm' ? 'M' : 'M2',
          baseCoef: 1.0,
          estimatedUnitPrice: 25.0,
          wbsStage: 'ACABAMENTOS',
          chronoGroup: 'ACABAMENTOS_POS_OBRA',
        },
      ],
    };

    addModularSubItem(targetModForSubItem, newSub);
    setNewSubItemTitle('');
    showToast(`Ambiente/Elemento "${newSub.title}" adicionado à categoria!`);
  };

  // 3. Upload de Planilha Mestra (.xlsx) de Contratos
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    const prices: ContractPriceItem[] = [];
    rows.forEach((row) => {
      const keys = Object.keys(row);
      const getVal = (keywords: string[]) => {
        const k = keys.find((key) => keywords.some((kw) => key.toLowerCase().includes(kw)));
        return k ? row[k] : undefined;
      };

      const code = String(getVal(['cod', 'cód', 'referencia', 'sinapi', 'seinfra', 'item']) || '').trim();
      const desc = String(getVal(['desc', 'servi', 'especifica']) || '').trim();
      const unit = String(getVal(['un', 'unid']) || 'UN').trim().toUpperCase();
      const price = parseFloat(String(getVal(['valor', 'pre', 'unit', 'custo']) || '0').replace(',', '.'));

      if (code && Number.isFinite(price) && price > 0) {
        prices.push({
          code,
          source: code.toUpperCase().includes('SEINFRA') ? 'SEINFRA' : 'SINAPI',
          description: desc || `Serviço ${code}`,
          unit: unit || 'UN',
          unitPrice: price,
        });
      }
    });

    const finalPrices = prices.length > 0 ? prices : contracts[0]?.priceTable || [];
    setUploadedTemplateName(file.name);
    setUploadedTemplateBase64(base64);
    setPreviewContractPrices(finalPrices);

    if (!contractName) setContractName(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    if (!ataNumber) setAtaNumber(`ARP Nº ${Math.floor(100 + Math.random() * 899)}/2026`);
    if (!agency) setAgency('Secretaria da Educação (SEDUC-PI)');

    showToast(`Planilha Mestra "${file.name}" indexada com ${finalPrices.length} preços unitários!`);
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractName.trim()) return;

    const newContract: ContractTemplate = {
      id: `cnt-${Date.now()}`,
      name: contractName.trim(),
      ataNumber: ataNumber.trim() || 'ARP Nº 099/2026',
      agency: agency.trim() || 'SEDUC-PI',
      bdiPercent: Math.max(0, parseFloat(bdiPercent) || 24.8),
      taxRegime,
      createdAt: new Date().toISOString().slice(0, 10),
      templateFileName: uploadedTemplateName || 'Template_Padrao.xlsx',
      templateBase64: uploadedTemplateBase64 || undefined,
      priceTable: previewContractPrices.length > 0 ? previewContractPrices : contracts[0]?.priceTable || [],
    };

    addContractTemplate(newContract);
    selectContract(newContract.id);
    setContractName('');
    setAtaNumber('');
    setAgency('');
    setPreviewContractPrices([]);
    setUploadedTemplateName('');
    setUploadedTemplateBase64('');
    showToast(`Contrato "${newContract.name}" ativado com sucesso!`);
  };

  const packageDemands = demands.filter((d) => d.type === 'PACKAGE');
  const modularDemands = demands.filter((d) => d.type === 'MODULAR');

  return (
    <main className="flex-1 h-full overflow-y-auto px-8 py-6 space-y-6">
      {/* Header do Módulo Configurações */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262C3A] pb-4 select-none">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#F8FAFC]">
            Configurações — Gestão de Pacotes, Variáveis & Contratos
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Configure escopos padronizados, construtores modulares por ambiente e indexe planilhas oficiais (.xlsx).
          </p>
        </div>

        {/* 3 Abas Internas */}
        <div className="flex items-center bg-[#191D26] p-1 rounded-xl border border-[#262C3A]">
          <button
            type="button"
            onClick={() => setInnerTab('PACKAGES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold flex items-center gap-1.5 transition-all ${
              innerTab === 'PACKAGES'
                ? 'sidebar-active-pill text-white shadow'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Aba 1: Pacotes Fechados</span>
          </button>

          <button
            type="button"
            onClick={() => setInnerTab('MODULAR_BUILDERS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold flex items-center gap-1.5 transition-all ${
              innerTab === 'MODULAR_BUILDERS'
                ? 'sidebar-active-pill text-white shadow'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Aba 2: Construtores Variáveis</span>
          </button>

          <button
            type="button"
            onClick={() => setInnerTab('CONTRACTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-heading font-bold flex items-center gap-1.5 transition-all ${
              innerTab === 'CONTRACTS'
                ? 'sidebar-active-pill text-white shadow'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Aba 3: Contratos & Templates (.xlsx)</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('HOME')}
            className="px-3 py-1 rounded bg-[#D4A359] text-[#0D0F13] font-bold flex items-center gap-1"
          >
            <span>Ver na Home</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ABA 1: PACOTES FECHADOS */}
      {innerTab === 'PACKAGES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handleCreatePackage} className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#262C3A] pb-3">
                <Package className="w-4 h-4 text-[#D4A359]" />
                <h2 className="font-heading text-sm font-bold text-[#F8FAFC]">
                  Cadastrar Novo Pacote Fechado
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Título do Pacote *</label>
                  <input
                    type="text"
                    required
                    value={pkgTitle}
                    onChange={(e) => setPkgTitle(e.target.value)}
                    placeholder="Ex: Laboratório de Ciências"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#D4A359]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Subtítulo Resumido</label>
                  <input
                    type="text"
                    value={pkgSubtitle}
                    onChange={(e) => setPkgSubtitle(e.target.value)}
                    placeholder="Ex: Bancadas, Instalação de Gás, Exaustão"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#D4A359]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Ícone</label>
                    <select
                      value={pkgIcon}
                      onChange={(e) => setPkgIcon(e.target.value as DemandCard['iconName'])}
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                    >
                      <option value="Building2">Edificação / Sala</option>
                      <option value="Laptop">Informática / TI</option>
                      <option value="Warehouse">Estrutura Metálica</option>
                      <option value="Hammer">Engenharia Pesada</option>
                      <option value="Bath">Hidráulica / Banheiro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Área Padrão (m²)</label>
                    <input
                      type="number"
                      value={pkgArea}
                      onChange={(e) => setPkgArea(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar Pacote Fechado no Catálogo</span>
              </button>
            </form>

            {/* Upload de Composição do Pacote */}
            <div className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#262C3A] pb-3">
                <FileSpreadsheet className="w-4 h-4 text-[#D4A359]" />
                <h2 className="font-heading text-sm font-bold text-[#F8FAFC]">
                  Importar Composição (.XLSX / .CSV)
                </h2>
              </div>

              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Vincular serviços ao Pacote:</label>
                <select
                  value={targetPkgForImport}
                  onChange={(e) => setTargetPkgForImport(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                >
                  {packageDemands.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.items?.length || 0} serviços atuais)
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#262C3A] hover:border-[#D4A359] rounded-xl bg-[#131720]/60 cursor-pointer transition-colors">
                <Upload className="w-6 h-6 text-[#D4A359] mb-1.5" />
                <span className="text-xs font-semibold text-[#F8FAFC]">
                  {importedPkgFileName || 'Subir planilha de serviços do pacote'}
                </span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handlePackageFileUpload} className="hidden" />
              </label>

              {previewPkgItems.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#D4A359]">
                    {previewPkgItems.length} serviços detectados no preview:
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyImportToExistingPkg}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Salvar Composição no Pacote Selecionado
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <h2 className="font-heading text-sm font-bold text-[#F8FAFC] border-b border-[#262C3A] pb-3">
                Pacotes Fechados Ativos ({packageDemands.length})
              </h2>

              <div className="divide-y divide-[#262C3A]">
                {packageDemands.map((pkg) => (
                  <div key={pkg.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-bold text-[#F8FAFC]">{pkg.title}</span>
                        <span className="px-2 py-0.5 rounded bg-[#212632] text-[10px] text-[#D4A359] font-bold">
                          {pkg.items?.length || 0} itens
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{pkg.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-heading text-sm font-bold text-[#D4A359] tabular-nums">
                        {formatCurrencyBRL(getCardBaseEstimate(pkg, null))}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteDemandCard(pkg.id)}
                        className="p-1.5 rounded bg-[#212632] text-[#94A3B8] hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONSTRUTORES MODULARES & SUB-ITENS */}
      {innerTab === 'MODULAR_BUILDERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            {/* Criar Categoria Modular */}
            <form onSubmit={handleCreateModularCategory} className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#262C3A] pb-3">
                <Layers className="w-4 h-4 text-[#D97724]" />
                <h2 className="font-heading text-sm font-bold text-[#F8FAFC]">
                  Nova Categoria Variável (Construtor)
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    required
                    value={modCategoryTitle}
                    onChange={(e) => setModCategoryTitle(e.target.value)}
                    placeholder="Ex: Instalações Hidráulicas"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Subtítulo Resumido</label>
                  <input
                    type="text"
                    value={modCategorySubtitle}
                    onChange={(e) => setModCategorySubtitle(e.target.value)}
                    placeholder="Ex: Louças, Metais, Tubulações, Caixas"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Ícone</label>
                  <select
                    value={modCategoryIcon}
                    onChange={(e) => setModCategoryIcon(e.target.value as DemandCard['iconName'])}
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  >
                    <option value="PaintRoller">Pintura</option>
                    <option value="Warehouse">Coberta / Telhamento</option>
                    <option value="LayoutGrid">Piso / Forro</option>
                    <option value="Bath">Hidráulica</option>
                    <option value="Zap">Elétrica</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#D97724] hover:bg-[#D97724]/90 text-white font-heading font-bold text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Categoria no Catálogo</span>
              </button>
            </form>

            {/* Adicionar Sub-item / Ambiente */}
            <form onSubmit={handleAddSubItemToCategory} className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#262C3A] pb-3">
                <FolderPlus className="w-4 h-4 text-[#D4A359]" />
                <h2 className="font-heading text-sm font-bold text-[#F8FAFC]">
                  Cadastrar Sub-item / Ambiente em Categoria
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Categoria de Destino:</label>
                  <select
                    value={targetModForSubItem}
                    onChange={(e) => setTargetModForSubItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  >
                    {modularDemands.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.subItems?.length || 0} sub-itens)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Nome do Sub-item / Ambiente *</label>
                  <input
                    type="text"
                    required
                    value={newSubItemTitle}
                    onChange={(e) => setNewSubItemTitle(e.target.value)}
                    placeholder="Ex: Bloco Administrativo, Portas, Janelas"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Unidade</label>
                    <select
                      value={newSubItemUnit}
                      onChange={(e) => setNewSubItemUnit(e.target.value as 'un' | 'm²' | 'm')}
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                    >
                      <option value="un">un (Unidade)</option>
                      <option value="m²">m² (Área)</option>
                      <option value="m">m (Comprimento)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Qtd Padrão</label>
                    <input
                      type="number"
                      value={newSubItemDefaultQty}
                      onChange={(e) => setNewSubItemDefaultQty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC] tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Ambiente à Categoria</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <h2 className="font-heading text-sm font-bold text-[#F8FAFC] border-b border-[#262C3A] pb-3">
                Categorias Modulares & Ambientes Cadastrados ({modularDemands.length})
              </h2>

              <div className="space-y-4">
                {modularDemands.map((mod) => (
                  <div key={mod.id} className="p-4 rounded-xl bg-[#131720] border border-[#262C3A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-base font-bold text-[#D4A359]">{mod.title}</span>
                        <span className="px-2 py-0.5 rounded bg-[#D97724]/20 text-[#D97724] text-[10px] font-bold">
                          Personalizável
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteDemandCard(mod.id)}
                        className="p-1 rounded text-[#94A3B8] hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mod.subItems?.map((sub) => (
                        <div key={sub.id} className="p-2.5 rounded-lg bg-[#191D26] border border-[#262C3A] text-xs">
                          <div className="flex items-center justify-between font-semibold text-[#F8FAFC]">
                            <span>{sub.title}</span>
                            <span className="text-[#D4A359] tabular-nums font-mono">
                              +{sub.defaultQty} {sub.unit}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#94A3B8]">
                            {sub.services.length} serviços unitários cadastrados
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONTRATOS & TEMPLATES OFICIAIS */}
      {innerTab === 'CONTRACTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handleCreateContract} className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#262C3A] pb-3">
                <Briefcase className="w-4 h-4 text-[#D4A359]" />
                <h2 className="font-heading text-sm font-bold text-[#F8FAFC]">
                  Cadastrar Contrato / Ata & Subir Template (.XLSX)
                </h2>
              </div>

              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#D4A359]/60 hover:border-[#D4A359] rounded-xl bg-[#131720]/70 cursor-pointer transition-all">
                <Upload className="w-6 h-6 text-[#D4A359] mb-1.5" />
                <span className="text-xs font-bold text-[#F8FAFC] text-center">
                  {uploadedTemplateName ? `Template Indexado: ${uploadedTemplateName}` : 'Subir Planilha Mestra Oficial (.XLSX)'}
                </span>
                <span className="text-[11px] text-[#94A3B8] mt-1 text-center">
                  Indexa preços unitários e preserva brasões, cabeçalhos e fórmulas do template
                </span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleContractUpload} className="hidden" />
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Nome do Contrato / Ata *</label>
                  <input
                    type="text"
                    required
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="Ex: Ata de Manutenção Escolar 2026"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">Número da Ata *</label>
                    <input
                      type="text"
                      required
                      value={ataNumber}
                      onChange={(e) => setAtaNumber(e.target.value)}
                      placeholder="Ex: ARP Nº 014/2026"
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">BDI (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={bdiPercent}
                      onChange={(e) => setBdiPercent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs font-bold text-[#D4A359] tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1">Órgão Contratante</label>
                  <input
                    type="text"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    placeholder="Ex: Secretaria da Educação (SEDUC-PI)"
                    className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#262C3A] text-xs text-[#F8FAFC]"
                  />
                </div>
              </div>

              {previewContractPrices.length > 0 && (
                <div className="p-3 rounded-lg bg-[#131720] border border-[#262C3A] text-xs flex items-center justify-between">
                  <span className="text-[#D4A359] font-bold">Preços Indexados:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {previewContractPrices.length} itens oficiais
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar Contrato e Ativar na Home</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-4">
              <h2 className="font-heading text-sm font-bold text-[#F8FAFC] border-b border-[#262C3A] pb-3">
                Contratos & Atas Indexadas ({contracts.length})
              </h2>

              <div className="space-y-3">
                {contracts.map((c) => {
                  const isCurrent = activeContractId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCurrent ? 'card-selected-overlay border-[#D4A359]' : 'bg-[#131720]/70 border-[#262C3A]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#D4A359]/20 text-[#D4A359] text-[11px] font-bold">
                            {c.ataNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#212632] text-[#F8FAFC] text-[11px] font-semibold tabular-nums">
                            BDI {c.bdiPercent.toFixed(2)}%
                          </span>
                        </div>
                        <h3 className="font-heading text-sm font-bold text-[#F8FAFC]">{c.name}</h3>
                        <p className="text-xs text-[#94A3B8]">
                          {c.agency} • {c.priceTable.length} preços cadastrados
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            selectContract(c.id);
                            setActiveTab('HOME');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-colors ${
                            isCurrent
                              ? 'bg-[#D4A359] text-[#0D0F13]'
                              : 'bg-[#212632] hover:bg-[#D4A359] text-[#F8FAFC] hover:text-[#0D0F13]'
                          }`}
                        >
                          {isCurrent ? 'Ativo na Home ✓' : 'Usar na Home →'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContractTemplate(c.id)}
                          className="p-1.5 rounded bg-[#212632] text-[#94A3B8] hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
