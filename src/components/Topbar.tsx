import React from 'react';
import { Cloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBudgetStore } from '../store/useBudgetStore';

export const Topbar: React.FC = () => {
  const maskStyle = 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.4) 2%, #000 14%)';
  const { isCloudSyncing, cloudSyncStatus, lastCloudSync, saveToCloud, fetchFromCloud } = useBudgetStore();

  const formattedTime = lastCloudSync
    ? new Date(lastCloudSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header
      style={{ height: '87px' }}
      className="relative w-full bg-[#0c0d12] border-b border-[#ffffff1f] overflow-hidden select-none shrink-0 z-30"
    >
      {/* Fachada SEDUC com enquadramento definitivo calibrado manualmente pelo usuário */}
      <div
        className="institutional-backdrop pointer-events-none"
        aria-hidden="true"
        style={{
          width: '680px',
          WebkitMaskImage: maskStyle,
          maskImage: maskStyle,
          opacity: 1,
        }}
      >
        <img
          src="/seduc-facade.png?v=7"
          alt="Fachada SEDUC"
          className="facade-img"
          style={{
            objectFit: 'contain',
            transform: 'translate(-186px, 2px) scale(2.26) rotate(-1.5deg)',
            transformOrigin: 'center center',
          }}
          draggable={false}
        />
      </div>

      <div className="relative z-10 h-full w-full px-6 flex items-center justify-between gap-4 pointer-events-none">
        {/* Marca: logo Governo do Piauí / SEDUC + divisória + título (posicionado em X: 104px) */}
        <div
          className="brand pointer-events-auto"
          style={{
            transform: 'translate(104px, 0px) scale(1)',
            transformOrigin: 'left center',
          }}
        >
          <span
            className="seduc-logo"
            role="img"
            aria-label="Secretaria da Educação — Governo do Piauí"
          >
            <img src="/seduc-pi.png" alt="Governo do Piauí" draggable={false} />
          </span>
          <div className="brand-info">
            <strong className="block font-heading font-black text-[26px] leading-tight tracking-tight text-white whitespace-nowrap">
              OrçaCraft<span className="text-[#ffaa2c] font-bold">.lab</span>
            </strong>
            <small className="block mt-0.5 text-[12px] text-[#b8b5b1] tracking-wide whitespace-nowrap">
              Orçamentação Paramétrica e Gestão Contratual • SEDUC-PI
            </small>
          </div>
        </div>

        {/* Lado direito: Status de Persistência Global em Nuvem (Cross-Browser 24h) */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => saveToCloud()}
            disabled={isCloudSyncing}
            title={
              lastCloudSync
                ? `Persistência em Nuvem Ativa • Último sync: ${formattedTime}. Clique para sincronizar agora.`
                : 'Salvar alterações na nuvem global'
            }
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              isCloudSyncing
                ? 'bg-[#1b1e26] border-[#F58220]/60 text-[#F58220]'
                : cloudSyncStatus === 'error'
                ? 'bg-[#261414] border-red-500/50 text-red-400 hover:bg-[#311818]'
                : 'bg-[#14161B]/90 border-white/10 text-neutral-300 hover:border-[#F58220]/50 hover:text-white'
            }`}
          >
            {isCloudSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F58220]" />
            ) : cloudSyncStatus === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-[#F58220]" />
            )}

            <span className="hidden sm:inline">
              {isCloudSyncing
                ? 'Sincronizando...'
                : cloudSyncStatus === 'error'
                ? 'Erro Nuvem (Tentar Novamente)'
                : lastCloudSync
                ? `Nuvem 24h (${formattedTime})`
                : 'Nuvem Ativa'}
            </span>

            {cloudSyncStatus === 'synced' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
