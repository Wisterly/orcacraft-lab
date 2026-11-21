import React, { useState } from 'react';
import { X, AlertTriangle, Link2, FilePlus2, Search } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatCurrencyBRL } from '../utils/mathEngine';

export const InconsistencyResolverModal: React.FC = () => {
  const {
    contracts,
    activeContractId,
    resolvingInconsistency,
    setResolvingInconsistency,
    resolveServiceInconsistency,
  } = useBudgetStore();

  const [mode, setMode] = useState<'MAPPED' | 'OWN_COMPOSITION'>('MAPPED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [customOwnPrice, setCustomOwnPrice] = useState<string>('35.00');

  if (!resolvingInconsistency) return null;

  const activeContract = contracts.find((c) => c.id === activeContractId);
  if (!activeContract) return null;

  const filteredContractItems = activeContract.priceTable.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (mode === 'MAPPED') {
      const targetCode = selectedCode || filteredContractItems[0]?.code;
      if (!targetCode) return;
      resolveServiceInconsistency(
        resolvingInconsistency.demandId,
        resolvingInconsistency.serviceId,
        {
          type: 'MAPPED',
          mappedContractCode: targetCode,
        }
      );
    } else {
      const parsed = parseFloat(customOwnPrice);
      if (Number.isNaN(parsed) || parsed <= 0) return;
      resolveServiceInconsistency(
        resolvingInconsistency.demandId,
        resolvingInconsistency.serviceId,
        {
          type: 'OWN_COMPOSITION',
          customOwnPrice: parsed,
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#131720] border border-[#D97724] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#191D26] border-b border-[#262C3A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#D97724]/20 border border-[#D97724] flex items-center justify-center text-[#D97724]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-[#F8FAFC]">
                De-Para de Inconsistência Contratual
              </h3>
              <p className="text-xs text-[#94A3B8]">
                O código <strong className="text-[#D97724]">{resolvingInconsistency.originalCode}</strong> não consta na planilha original de{' '}
                <strong className="text-[#F8FAFC]">{activeContract.ataNumber}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setResolvingInconsistency(null)}
            className="p-1.5 rounded-lg bg-[#212632] text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 rounded-lg bg-[#191D26] border border-[#262C3A]">
            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
              Serviço Original da Demanda
            </span>
            <p className="text-xs font-semibold text-[#F8FAFC] mt-0.5">
              [{resolvingInconsistency.originalCode}] {resolvingInconsistency.description}
            </p>
          </div>

          {/* Seletor de Estratégia */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('MAPPED')}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                mode === 'MAPPED'
                  ? 'card-selected-overlay border-[#D4A359] text-[#D4A359]'
                  : 'bg-[#191D26] border-[#262C3A] text-[#94A3B8]'
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#F8FAFC]">
                  Mapear Código Equivalente
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Vincular a um item existente na Ata
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('OWN_COMPOSITION')}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                mode === 'OWN_COMPOSITION'
                  ? 'card-selected-overlay border-[#D4A359] text-[#D4A359]'
                  : 'bg-[#191D26] border-[#262C3A] text-[#94A3B8]'
              }`}
            >
              <FilePlus2 className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#F8FAFC]">
                  Incluir Composição Própria
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  Adicionar como item novo (CPU)
                </div>
              </div>
            </button>
          </div>

          {mode === 'MAPPED' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar código SINAPI/SEINFRA ou descrição na planilha do contrato..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#191D26] border border-[#262C3A] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#D4A359]"
                />
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-[#262C3A] rounded-lg border border-[#262C3A] bg-[#191D26]">
                {filteredContractItems.map((item) => {
                  const isChosen =
                    selectedCode === item.code ||
                    (!selectedCode && filteredContractItems[0]?.code === item.code);
                  return (
                    <div
                      key={item.code}
                      onClick={() => setSelectedCode(item.code)}
                      className={`p-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isChosen ? 'bg-[#D4A359]/15' : 'hover:bg-[#212632]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#D4A359]">
                            {item.code}
                          </span>
                          <span className="text-[11px] text-[#94A3B8]">Unid: {item.unit}</span>
                        </div>
                        <p className="text-xs text-[#F8FAFC] mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#D4A359] tabular-nums shrink-0">
                        {formatCurrencyBRL(item.unitPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#191D26] border border-[#262C3A] space-y-3">
              <label className="block text-xs font-semibold text-[#F8FAFC]">
                Preço Unitário Base da Composição Própria (Sem BDI) — R$
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={customOwnPrice}
                onChange={(e) => setCustomOwnPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131720] border border-[#D4A359] text-sm font-bold text-[#D4A359] tabular-nums focus:outline-none"
              />
              <p className="text-[11px] text-[#94A3B8]">
                O sistema aplicará automaticamente o BDI de{' '}
                <strong className="text-[#F8FAFC]">{activeContract.bdiPercent.toFixed(2)}%</strong>{' '}
                com truncamento na 2ª casa decimal.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#191D26] border-t border-[#262C3A] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setResolvingInconsistency(null)}
            className="px-4 py-2 rounded-lg bg-[#212632] text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-[#C89646] hover:bg-[#D4A359] text-[#0D0F13] font-heading font-bold text-xs"
          >
            Aplicar De-Para no Orçamento
          </button>
        </div>
      </div>
    </div>
  );
};
