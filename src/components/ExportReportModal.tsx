import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, CheckCircle2, Download, Sparkles, RefreshCw } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import {
  computeBudgetLines,
  computeWBSSummary,
  formatCurrencyBRL,
  formatNumberBR,
  WBS_LABELS,
} from '../utils/mathEngine';
import { exportBudgetToPdf, exportBudgetToXlsx } from '../utils/exportEngine';

export const ExportReportModal: React.FC = () => {
  const {
    demands,
    contracts,
    selectedDemands,
    activeContractId,
    isAiAllocating,
    aiAllocationSummary,
    aiAllocationStats,
    runAiContractAllocation,
    isExportModalOpen,
    setExportModalOpen,
  } = useBudgetStore();

  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isExportModalOpen) return null;

  const activeContract = contracts.find((c) => c.id === activeContractId) || null;
  const lines = computeBudgetLines(demands, selectedDemands, activeContract).filter(
    (l) => l.enabled
  );
  const wbs = computeWBSSummary(lines);

  const selectedDemandList = demands.filter((d) => Boolean(selectedDemands[d.id]));
  const scopeTitle =
    selectedDemandList.length === 1
      ? selectedDemandList[0].title
      : selectedDemandList.length > 1
      ? `${selectedDemandList[0].title} + ${selectedDemandList.length - 1} Escopo(s)`
      : 'Orçamento Base';

  const totalAreaM2 = selectedDemandList.reduce((acc, d) => {
    const cfg = selectedDemands[d.id];
    if (!cfg) return acc;
    if (d.type === 'PACKAGE') {
      return acc + (d.defaultAreaM2 || 48) * (cfg.quantityUn || 1);
    }
    return acc + (d.defaultAreaM2 || 50);
  }, 0);

  const handleExportXlsx = async () => {
    setExportStatus('Gerando planilha Excel oficial (.xlsx) com fórmulas ROUNDDOWN...');
    await exportBudgetToXlsx(lines, activeContract, scopeTitle, totalAreaM2);
    setExportStatus('Planilha .XLSX exportada com sucesso!');
    setTimeout(() => setExportStatus(null), 3500);
  };

  const handleExportPdf = () => {
    setExportStatus('Renderizando documento executivo para assinatura (.pdf)...');
    exportBudgetToPdf(lines, activeContract, scopeTitle, totalAreaM2);
    setExportStatus('Documento .PDF exportado com sucesso!');
    setTimeout(() => setExportStatus(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-[#131720] border border-[#262C3A] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#191D26] border-b border-[#262C3A] flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 rounded bg-[#D4A359]/15 text-[#D4A359] text-[11px] font-bold uppercase tracking-wider">
              Homologação & Exportação Oficial
            </span>
            <h2 className="font-heading text-lg font-bold text-[#F8FAFC] mt-1">
              Planilha Orçamentária Sintética — {scopeTitle}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {activeContract
                ? `Compatibilizado com: ${activeContract.name} (${activeContract.ataNumber}) • BDI ${activeContract.bdiPercent.toFixed(2)}%`
                : 'Baseado nos preços estimados do Catálogo SINAPI/SEINFRA • Sem BDI contratual aplicado'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="p-2 rounded-lg bg-[#212632] text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabela Preview */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeContract && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#191D26] via-[#212632] to-[#191D26] border border-[#D4A359]/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#D4A359] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#F8FAFC]">
                    Alocação Cognitiva IA (Gemini) — Planilha {activeContract.name}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {aiAllocationSummary ||
                      'Todos os serviços selecionados foram alocados e adequados à estrutura da planilha orçamentária deste contrato.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isAiAllocating}
                onClick={() => runAiContractAllocation()}
                className="px-3 py-1.5 rounded-lg bg-[#0D0F13] border border-[#D4A359]/50 hover:border-[#D4A359] text-[#D4A359] text-[11px] font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isAiAllocating ? 'animate-spin' : ''}`} />
                <span>{isAiAllocating ? 'Realocando...' : 'Readequar com IA'}</span>
              </button>
            </div>
          )}

          {exportStatus && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exportStatus}</span>
            </div>
          )}

          <div className="rounded-xl border border-[#262C3A] overflow-hidden bg-[#191D26]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#212632] text-[#94A3B8] border-b border-[#262C3A] text-[11px] uppercase">
                  <th className="py-3 px-3 font-semibold">Código Planilha</th>
                  <th className="py-3 px-3 font-semibold">Adequação IA</th>
                  <th className="py-3 px-3 font-semibold">Descrição na Planilha do Contrato & Memória</th>
                  <th className="py-3 px-3 font-semibold">Etapa WBS</th>
                  <th className="py-3 px-2 font-semibold text-center">Un.</th>
                  <th className="py-3 px-3 font-semibold text-right">Quant.</th>
                  <th className="py-3 px-3 font-semibold text-right">Unit. s/ BDI</th>
                  <th className="py-3 px-3 font-semibold text-right">Unit. c/ BDI</th>
                  <th className="py-3 px-3 font-semibold text-right">Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262C3A]">
                {lines.map((line) => (
                  <tr key={line.lineId} className="hover:bg-[#212632]/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#D4A359] whitespace-nowrap">
                      {line.effectiveCode}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {line.aiAllocationType === 'REALOCACAO_INTELIGENTE_IA' ||
                      line.effectiveCode !== line.originalCode ? (
                        <span
                          className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
                          title={line.aiJustification || `Realocado de ${line.originalCode}`}
                        >
                          Realocado IA ({line.originalCode})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                          Alocado Direto
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#F8FAFC] max-w-xs" title={line.aiJustification || line.description}>
                      <p className="truncate font-medium">{line.description}</p>
                      <span className="block text-[10px] text-[#94A3B8] truncate">
                        {line.aiMemoryText || `${line.demandTitle}${line.subItemTitle ? ` • ${line.subItemTitle}` : ''}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#94A3B8] text-[11px]">
                      {WBS_LABELS[line.wbsStage]}
                    </td>
                    <td className="py-2.5 px-2 text-center text-[#94A3B8]">{line.unit}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#F8FAFC] tabular-nums">
                      {formatNumberBR(line.quantity, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#94A3B8] tabular-nums">
                      {formatCurrencyBRL(line.baseUnitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#D4A359] font-medium tabular-nums">
                      {formatCurrencyBRL(line.unitPriceWithBdi)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#F8FAFC] tabular-nums">
                      {formatCurrencyBRL(line.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#131720] border-t-2 border-[#D4A359]">
                  <td colSpan={8} className="py-3.5 px-4 text-right font-heading font-bold text-sm text-[#F8FAFC]">
                    TOTAL GERAL CONSOLIDADO (TRUNCADO NA 2ª CASA DECIMAL):
                  </td>
                  <td className="py-3.5 px-3 text-right font-heading font-bold text-base text-[#D4A359] tabular-nums">
                    {formatCurrencyBRL(wbs.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer com Botões de Exportação .XLSX e .PDF */}
        <div className="p-5 bg-[#191D26] border-t border-[#262C3A] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#94A3B8]">
            Critério de Auditoria: <strong className="text-[#F8FAFC]">Truncamento estrito na 2ª casa decimal</strong> (`Math.trunc(v * 100) / 100` e `ROUNDDOWN` no Excel).
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportXlsx}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar Planilha Excel (.XLSX)</span>
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-5 py-2.5 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Gerar Relatório Assinatura (.PDF)</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
