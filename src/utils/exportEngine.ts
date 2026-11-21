import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComputedBudgetLine, ContractTemplate } from '../types/budget';
import { computeWBSSummary, formatCurrencyBRL, formatNumberBR, trunc2, WBS_LABELS } from './mathEngine';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta a Planilha Orçamentária Oficial (.xlsx)
 * - Se o contrato possuir um arquivo template .xlsx original (templateBase64), carrega o workbook original
 *   preservando cabeçalhos, células mescladas e estilos, atualiza/injeta os itens orçados e adiciona uma aba
 *   "MEMÓRIA & ORÇAMENTO FINAL" com fórmulas Excel ROUNDDOWN(..., 2) (equivalente ao TRUNCAR).
 * - Caso contrário, gera um Workbook executivo completo no padrão Engenharia Pública (SINAPI/SEINFRA/TCU).
 */
export async function exportBudgetToXlsx(
  lines: ComputedBudgetLine[],
  activeContract: ContractTemplate | null,
  scopeTitle: string,
  totalAreaM2: number
): Promise<void> {
  const activeLines = lines.filter((l) => l.enabled);
  const wbs = computeWBSSummary(activeLines);
  const bdiPercent = activeContract ? activeContract.bdiPercent : 0;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OrçaCraft.lab v1.2.0';
  workbook.created = new Date();

  // Mapa consolidado de quantitativos por código alocado no contrato
  const qtyByCode = new Map<string, number>();
  for (const line of activeLines) {
    const codeKey = line.effectiveCode.trim().toUpperCase();
    const cleanKey = codeKey.replace(/^SINAPI[-/]?PI[-/]?|^SINAPI[-/]?|^SEDUC[-/]?PI[-/]?/i, '').trim();
    qtyByCode.set(codeKey, trunc2((qtyByCode.get(codeKey) || 0) + line.quantity));
    if (cleanKey && cleanKey !== codeKey) {
      qtyByCode.set(cleanKey, trunc2((qtyByCode.get(cleanKey) || 0) + line.quantity));
    }
  }

  // Caso o usuário tenha feito upload de uma Planilha Base (.xlsx) no contrato ativo:
  // Mantém 100% da planilha original intacta (layout, cores, fontes, fórmulas) e modifica APENAS a coluna de QUANTITATIVO!
  if (activeContract?.templateBase64) {
    try {
      const buffer = base64ToArrayBuffer(activeContract.templateBase64);
      await workbook.xlsx.load(buffer);

      const contractCodeSet = new Set<string>();
      for (const p of activeContract.priceTable) {
        const c1 = p.code.trim().toUpperCase();
        const c2 = c1.replace(/^SINAPI[-/]?PI[-/]?|^SINAPI[-/]?|^SEDUC[-/]?PI[-/]?/i, '').trim();
        contractCodeSet.add(c1);
        if (c2) contractCodeSet.add(c2);
      }

      for (const sheet of workbook.worksheets) {
        let codeColIdx = -1;
        let qtyColIdx = -1;

        // 1. Detecta automaticamente em quais colunas estão "CÓDIGO" e "QUANT." no cabeçalho original
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 25 || (codeColIdx !== -1 && qtyColIdx !== -1)) return;
          row.eachCell((cell, colNumber) => {
            const val = String(cell.value || '').trim().toUpperCase();
            if (val === 'CÓDIGO' || val === 'CODIGO' || val.includes('CÓDIGO')) {
              codeColIdx = colNumber;
            }
            if (
              val === 'QUANT.' ||
              val === 'QUANT' ||
              val === 'QUANTIDADE' ||
              val === 'QTD' ||
              val === 'QTD.'
            ) {
              qtyColIdx = colNumber;
            }
          });
        });

        // Fallback padrão SEDUC-PI (Col D = 4 Código, Col G = 7 Quant.)
        if (codeColIdx === -1) codeColIdx = 4;
        if (qtyColIdx === -1) qtyColIdx = codeColIdx + 3;

        // 2. Percorre as linhas e altera APENAS a célula da coluna QUANT.
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber < 10) return;
          const rawCode = String(row.getCell(codeColIdx).value || '').trim().toUpperCase();
          if (!rawCode) return;

          const cleanRaw = rawCode.replace(/^SINAPI[-/]?PI[-/]?|^SINAPI[-/]?|^SEDUC[-/]?PI[-/]?/i, '').trim();
          const isContractRow = contractCodeSet.has(rawCode) || (cleanRaw && contractCodeSet.has(cleanRaw));

          if (isContractRow) {
            const qtyCell = row.getCell(qtyColIdx);
            const matchedQty = qtyByCode.get(rawCode) ?? (cleanRaw ? qtyByCode.get(cleanRaw) : undefined);

            if (matchedQty !== undefined && matchedQty > 0) {
              qtyCell.value = matchedQty;
            } else if (!qtyCell.formula) {
              // Zera quantitativo residual de itens da planilha que não foram solicitados nesta demanda
              qtyCell.value = null;
            }
          }
        });
      }

      const outBuffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([outBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const safeName = (activeContract.templateFileName || activeContract.name)
        .replace(/\.xlsx$/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerBlobDownload(blob, `${safeName}_Preenchida_IA.xlsx`);
      return;
    } catch (err) {
      console.warn('Aviso ao carregar binário do template, gerando layout oficial SEDUC:', err);
    }
  }

  // Se houver um contrato ativo (mesmo sem binário .xlsx anexado), gera como 1ª aba a PLANILHA PADRÃO DO CONTRATO
  // mantendo 100% dos itens da planilha base na ordem original e preenchendo APENAS a coluna QUANT.
  if (activeContract && activeContract.priceTable.length > 0) {
    const contractSheet = workbook.addWorksheet('PLANILHA DO CONTRATO (IA)', {
      views: [{ showGridLines: true }],
    });

    contractSheet.columns = [
      { key: 'item', width: 10 },
      { key: 'source', width: 14 },
      { key: 'code', width: 16 },
      { key: 'description', width: 64 },
      { key: 'unit', width: 9 },
      { key: 'qty', width: 14 },
      { key: 'unitCost', width: 16 },
      { key: 'unitPriceBdi', width: 16 },
      { key: 'totalPriceBdi', width: 20 },
    ];

    // Cabeçalho Padrão SEDUC-PI / UGERF
    contractSheet.mergeCells('A1:I1');
    contractSheet.getCell('A1').value =
      'GOVERNO DO ESTADO DO PIAUÍ • SECRETARIA DE ESTADO DA EDUCAÇÃO - SEDUC • UGERF';
    contractSheet.getCell('A1').font = { bold: true, size: 11, color: { argb: 'FFD4A359' } };
    contractSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D0F13' },
    };
    contractSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    contractSheet.getRow(1).height = 24;

    contractSheet.mergeCells('A2:F2');
    contractSheet.getCell('A2').value = `PLANILHA ORÇAMENTÁRIA: ${activeContract.name}`;
    contractSheet.getCell('A2').font = { bold: true, size: 10 };

    contractSheet.mergeCells('G2:I2');
    contractSheet.getCell('G2').value = `BDI = ${formatNumberBR(bdiPercent, 2)}% (${activeContract.taxRegime})`;
    contractSheet.getCell('G2').font = { bold: true, size: 10 };

    contractSheet.mergeCells('A3:I3');
    contractSheet.getCell('A3').value = `DEMANDA ALOCADA PELA IA: ${scopeTitle}`;
    contractSheet.getCell('A3').font = { size: 10 };

    const hdrRow = contractSheet.getRow(5);
    hdrRow.values = [
      'ITEM',
      'FONTE',
      'CÓDIGO',
      'DISCRIMINAÇÃO',
      'UND',
      'QUANT.',
      'CUSTO UNITÁRIO',
      'PREÇO UNITÁRIO',
      'PREÇO PARCIAL COM BDI',
    ];
    hdrRow.height = 22;
    hdrRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9.5, color: { argb: 'FFF8FAFC' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF191D26' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    let rIdx = 6;
    const partialRefs: string[] = [];
    const bdiFactor = Number((1 + bdiPercent / 100).toFixed(6));

    activeContract.priceTable.forEach((pItem, idx) => {
      const row = contractSheet.getRow(rIdx);
      const c1 = pItem.code.trim().toUpperCase();
      const c2 = c1.replace(/^SINAPI[-/]?PI[-/]?|^SINAPI[-/]?|^SEDUC[-/]?PI[-/]?/i, '').trim();
      const allocatedQty = qtyByCode.get(c1) ?? (c2 ? qtyByCode.get(c2) : undefined) ?? 0;

      const unitWithBdi = trunc2(pItem.unitPrice * (1 + bdiPercent / 100));
      const rowTotal = allocatedQty > 0 ? trunc2(allocatedQty * unitWithBdi) : 0;

      row.getCell(1).value = `1.${idx + 1}`;
      row.getCell(2).value = pItem.source || 'SINAPI/PI';
      row.getCell(3).value = pItem.code;
      row.getCell(4).value = pItem.description;
      row.getCell(5).value = pItem.unit;
      // Coluna QUANT.: modificada apenas quando o serviço foi alocado para esta demanda
      row.getCell(6).value = allocatedQty > 0 ? allocatedQty : null;
      row.getCell(7).value = pItem.unitPrice;
      row.getCell(8).value = {
        formula: `ROUNDDOWN(G${rIdx}*${bdiFactor}, 2)`,
        result: unitWithBdi,
      };
      row.getCell(9).value = {
        formula: `IF(ISNUMBER(F${rIdx}), ROUNDDOWN(F${rIdx}*H${rIdx}, 2), 0)`,
        result: rowTotal,
      };

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(7).numFmt = '"R$" #,##0.00';
      row.getCell(8).numFmt = '"R$" #,##0.00';
      row.getCell(9).numFmt = '"R$" #,##0.00';

      if (allocatedQty > 0) {
        row.getCell(6).font = { bold: true, color: { argb: 'FF0F5132' } };
        row.getCell(6).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1E7DD' },
        };
      }

      partialRefs.push(`I${rIdx}`);
      rIdx++;
    });

    const totRow = contractSheet.getRow(rIdx);
    contractSheet.mergeCells(`A${rIdx}:H${rIdx}`);
    totRow.getCell(1).value = 'TOTAL GERAL DA PLANILHA DO CONTRATO (COM BDI)';
    totRow.getCell(1).alignment = { horizontal: 'right' };
    totRow.getCell(1).font = { bold: true, size: 10.5 };
    totRow.getCell(9).value = {
      formula: partialRefs.length > 0 ? `SUM(I6:I${rIdx - 1})` : '0',
      result: wbs.total,
    };
    totRow.getCell(9).numFmt = '"R$" #,##0.00';
    totRow.getCell(9).font = { bold: true, size: 11 };
  }

  // Cria a aba complementar "MEMÓRIA & SINTÉTICO IA"
  const sheetName = workbook.getWorksheet('ORÇAMENTO SINTÉTICO')
    ? `ORÇAMENTO_${Date.now().toString().slice(-4)}`
    : 'ORÇAMENTO SINTÉTICO';

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { key: 'item', width: 9 },
    { key: 'code', width: 16 },
    { key: 'source', width: 12 },
    { key: 'description', width: 58 },
    { key: 'unit', width: 9 },
    { key: 'qty', width: 14 },
    { key: 'unitBase', width: 16 },
    { key: 'unitBdi', width: 17 },
    { key: 'total', width: 18 },
  ];

  // Cabeçalho Institucional / Contratual
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'OrçaCraft.lab — PLANILHA ORÇAMENTÁRIA SINTÉTICA E COMPATIBILIZAÇÃO CONTRATUAL';
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFD4A359' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D0F13' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = `ESCOPO / OBRA: ${scopeTitle}`;
  sheet.getCell('A2').font = { bold: true, size: 10 };

  sheet.mergeCells('F2:I2');
  sheet.getCell('F2').value = `CONTRATO / ATA: ${
    activeContract ? `${activeContract.name} (${activeContract.ataNumber})` : 'ORÇAMENTO BASE DE CATÁLOGO (SEM ATA VINCULADA)'
  }`;
  sheet.getCell('F2').font = { bold: true, size: 10 };

  sheet.mergeCells('A3:E3');
  sheet.getCell('A3').value = `ÓRGÃO CONTRATANTE: ${
    activeContract ? activeContract.agency : 'Referência Paramétrica Interna SINAPI/SEINFRA'
  }`;
  sheet.getCell('A3').font = { size: 10 };

  sheet.mergeCells('F3:I3');
  sheet.getCell('F3').value = `BDI APLICADO: ${formatNumberBR(bdiPercent, 2)}% | REGIME: ${
    activeContract ? activeContract.taxRegime : 'PADRÃO'
  } | ÁREA TOTAL: ${formatNumberBR(totalAreaM2, 2)} m²`;
  sheet.getCell('F3').font = { bold: true, size: 10 };

  sheet.addRow([]);

  // Cabeçalho da Tabela
  const headerRowIndex = 5;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.values = [
    'ITEM',
    'CÓDIGO REF.',
    'FONTE',
    'DESCRIÇÃO DO SERVIÇO / COMPOSIÇÃO',
    'UNID.',
    'QUANT.',
    'PREÇO UNIT. (R$)',
    'UNIT. C/ BDI (R$)',
    'PREÇO TOTAL (R$)',
  ];
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFF8FAFC' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF191D26' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF262C3A' } },
      bottom: { style: 'medium', color: { argb: 'FFD4A359' } },
      left: { style: 'thin', color: { argb: 'FF262C3A' } },
      right: { style: 'thin', color: { argb: 'FF262C3A' } },
    };
  });

  let currentRowIdx = headerRowIndex + 1;
  const totalCellRefs: string[] = [];

  // Agrupamento por Etapa WBS
  const stagesOrder = ['PRELIMINARES', 'ESTRUTURA_ALVENARIA', 'COBERTA_FORRO', 'ACABAMENTOS'] as const;
  let stageCounter = 1;

  for (const stage of stagesOrder) {
    const stageLines = activeLines.filter((l) => l.wbsStage === stage);
    if (stageLines.length === 0) continue;

    // Linha de Cabeçalho da Etapa WBS
    const stageRow = sheet.getRow(currentRowIdx);
    stageRow.getCell(1).value = `${stageCounter}.0`;
    stageRow.getCell(2).value = WBS_LABELS[stage].toUpperCase();
    sheet.mergeCells(`B${currentRowIdx}:H${currentRowIdx}`);

    const stageSummary = wbs.stages.find((s) => s.stage === stage);
    stageRow.getCell(9).value = stageSummary ? stageSummary.amount : 0;
    stageRow.getCell(9).numFmt = '"R$" #,##0.00';

    stageRow.height = 20;
    stageRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF0D0F13' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
    currentRowIdx++;

    let itemCounter = 1;
    for (const line of stageLines) {
      const r = sheet.getRow(currentRowIdx);
      r.getCell(1).value = `${stageCounter}.${itemCounter}`;
      r.getCell(2).value = line.effectiveCode;
      r.getCell(3).value =
        line.aiAllocationType === 'REALOCACAO_INTELIGENTE_IA' ||
        line.effectiveCode !== line.originalCode
          ? `IA (${line.originalCode})`
          : line.source;
      r.getCell(4).value = `${line.description}\n[Memória IA: ${
        line.aiMemoryText || `${line.demandTitle}${line.subItemTitle ? ` • ${line.subItemTitle}` : ''}`
      }]`;
      r.getCell(5).value = line.unit;
      r.getCell(6).value = line.quantity;
      r.getCell(7).value = line.baseUnitPrice;

      // Fórmula com ROUNDDOWN(..., 2) (equivalente ao TRUNCAR na 2ª casa decimal)
      const bdiMultiplier = Number((1 + bdiPercent / 100).toFixed(6));
      r.getCell(8).value = {
        formula: `ROUNDDOWN(G${currentRowIdx}*${bdiMultiplier}, 2)`,
        result: line.unitPriceWithBdi,
      };
      r.getCell(9).value = {
        formula: `ROUNDDOWN(F${currentRowIdx}*H${currentRowIdx}, 2)`,
        result: line.totalPrice,
      };

      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(6).numFmt = '#,##0.00';
      r.getCell(7).numFmt = '"R$" #,##0.00';
      r.getCell(8).numFmt = '"R$" #,##0.00';
      r.getCell(9).numFmt = '"R$" #,##0.00';

      r.eachCell((c) => {
        c.font = { size: 9.5 };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      totalCellRefs.push(`I${currentRowIdx}`);
      currentRowIdx++;
      itemCounter++;
    }

    stageCounter++;
  }

  // Linha de Total Geral Consolidado
  const totalRow = sheet.getRow(currentRowIdx);
  sheet.mergeCells(`A${currentRowIdx}:H${currentRowIdx}`);
  totalRow.getCell(1).value = 'VALOR TOTAL CONSOLIDADO DO ORÇAMENTO (COM TRUNCAMENTO NA 2ª CASA DECIMAL)';
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

  const sumFormula = totalCellRefs.length > 0 ? totalCellRefs.join('+') : '0';
  totalRow.getCell(9).value = {
    formula: sumFormula,
    result: wbs.total,
  };
  totalRow.getCell(9).numFmt = '"R$" #,##0.00';
  totalRow.height = 26;

  totalRow.eachCell((c) => {
    c.font = { bold: true, size: 11, color: { argb: 'FFD4A359' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF131720' } };
    c.border = {
      top: { style: 'medium', color: { argb: 'FFD4A359' } },
      bottom: { style: 'medium', color: { argb: 'FFD4A359' } },
    };
  });

  const outBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = scopeTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  triggerBlobDownload(blob, `OrcaCraft_lab_${safeName}.xlsx`);
}

/**
 * Exporta o Relatório Executivo e Planilha Orçamentária Oficial em PDF (.pdf)
 * Formatado para impressão e assinatura técnica.
 */
export function exportBudgetToPdf(
  lines: ComputedBudgetLine[],
  activeContract: ContractTemplate | null,
  scopeTitle: string,
  totalAreaM2: number
): void {
  const activeLines = lines.filter((l) => l.enabled);
  const wbs = computeWBSSummary(activeLines);
  const bdiPercent = activeContract ? activeContract.bdiPercent : 0;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Faixa Superior Executive Dark + Gold
  doc.setFillColor(13, 15, 19);
  doc.rect(0, 0, 297, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('OrçaCraft', 14, 12);

  doc.setTextColor(212, 163, 89);
  doc.text('.lab', 41, 12);

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('ENGINE DE ORÇAMENTAÇÃO PARAMÉTRICA & COMPATIBILIZAÇÃO CONTRATUAL (PADRÃO SINAPI / SEINFRA / TCU)', 14, 18);

  doc.setTextColor(212, 163, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`TOTAL ORÇADO: ${formatCurrencyBRL(wbs.total)}`, 283, 14, { align: 'right' });

  // Metadados do Escopo e Contrato
  doc.setTextColor(20, 24, 33);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`ESCOPO: ${scopeTitle}`, 14, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const contractLabel = activeContract
    ? `${activeContract.name} | ${activeContract.ataNumber} | Órgão: ${activeContract.agency}`
    : 'Catálogo Paramétrico Padrão (Sem Ata de Registro vinculada)';
  doc.text(`CONTRATO DE DESTINO: ${contractLabel}`, 14, 38.5);

  doc.text(
    `BDI Aplicado: ${formatNumberBR(bdiPercent, 2)}%   |   Área Total Parametrizada: ${formatNumberBR(
      totalAreaM2,
      2
    )} m²   |   Critério Matemático: Truncamento na 2ª casa decimal`,
    14,
    43.5
  );

  // Quadro Resumo WBS
  const wbsCols = wbs.stages.map((s) => `${s.label} (${s.percentage}%): ${formatCurrencyBRL(s.amount)}`);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 46.5, 269, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  doc.text(wbsCols.join('    |    '), 17, 51.5);

  // Tabela Analítica de Serviços
  const tableBody = activeLines.map((line, index) => [
    String(index + 1).padStart(2, '0'),
    line.effectiveCode,
    line.source,
    `${line.description}\n(${line.demandTitle}${line.subItemTitle ? ` • ${line.subItemTitle}` : ''} • ${WBS_LABELS[line.wbsStage]})`,
    line.unit,
    formatNumberBR(line.quantity, 2),
    formatCurrencyBRL(line.baseUnitPrice),
    formatCurrencyBRL(line.unitPriceWithBdi),
    formatCurrencyBRL(line.totalPrice),
  ]);

  autoTable(doc, {
    startY: 57,
    head: [
      [
        'ITEM',
        'CÓDIGO',
        'FONTE',
        'DESCRIÇÃO DO SERVIÇO / ETAPA WBS',
        'UN.',
        'QUANT.',
        'UNIT. S/ BDI',
        'UNIT. C/ BDI',
        'TOTAL (R$)',
      ],
    ],
    body: tableBody,
    foot: [
      [
        {
          content: 'VALOR TOTAL CONSOLIDADO DO ORÇAMENTO (TRUNCADO NA 2ª CASA DECIMAL)',
          colSpan: 8,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        {
          content: formatCurrencyBRL(wbs.total),
          styles: { halign: 'right', fontStyle: 'bold', textColor: [212, 163, 89] },
        },
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [25, 29, 38],
      textColor: [248, 250, 252],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [19, 23, 32],
      textColor: [248, 250, 252],
      fontSize: 8.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'left', cellWidth: 112 },
      4: { halign: 'center', cellWidth: 13 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 22 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
    },
  });

  // Bloco de Assinatura Técnica no Rodapé
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 160;
  const sigY = Math.min(192, finalY + 18);

  doc.setDrawColor(148, 163, 184);
  doc.line(35, sigY, 120, sigY);
  doc.line(175, sigY, 260, sigY);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Responsável Técnico / Orçamentista (CREA / CAU)', 77.5, sigY + 4.5, { align: 'center' });
  doc.text('Fiscalização / Homologação do Contrato', 217.5, sigY + 4.5, { align: 'center' });

  const safeName = scopeTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`OrcaCraft_lab_${safeName}.pdf`);
}

