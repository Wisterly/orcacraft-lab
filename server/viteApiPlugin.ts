import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  alocarServicosNaPlanilhaContratoComIA,
  gerarOrcamentoComIA,
  indexarItemDeterministicamente,
  indexarItensContratoComIA,
  verificarStatusIA,
} from './geminiOrcamentoService';
import { getCloudState, saveCloudState } from './cloudSyncService';

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: any, statusCode: number, payload: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function geminiOrcamentoApiPlugin(): Plugin {
  const registerMiddlewares = (middlewares: any) => {
    // 1. GET /api/ia/status (Health-Check da Etapa 0)
    middlewares.use('/api/ia/status', async (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();
      try {
        const status = await verificarStatusIA();
        sendJson(res, 200, status);
      } catch (err: any) {
        sendJson(res, 500, {
          status: 'error',
          mensagem: String(err?.message || err),
        });
      }
    });

    // 2. POST /api/ia/config-key (Configuração segura da GEMINI_API_KEY em .env.local no servidor)
    middlewares.use('/api/ia/config-key', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();
      try {
        const body = await readBody(req);
        const newKey = (body.apiKey || '').trim();
        const newModel = (body.model || 'gemini-3.8-flash').trim();

        if (!newKey) {
          return sendJson(res, 400, { error: 'A chave GEMINI_API_KEY não pode ser vazia.' });
        }

        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = `GEMINI_API_KEY="${newKey}"\nGEMINI_MODEL="${newModel}"\nAPP_ENCRYPTION_KEY="orcacraft-seduc-pi-secret-master-key-2026-aes256"\n`;
        fs.writeFileSync(envPath, envContent, 'utf-8');

        process.env.GEMINI_API_KEY = newKey;
        process.env.GEMINI_MODEL = newModel;

        const check = await verificarStatusIA();
        sendJson(res, 200, {
          success: true,
          status: check,
        });
      } catch (err: any) {
        sendJson(res, 500, {
          error: String(err?.message || err),
        });
      }
    });

    // 3. POST /api/orcamentos/alocar-contrato-ia (Cérebro Central: Aloca, Realoca e Adequa serviços da Home na Planilha do Contrato)
    middlewares.use('/api/orcamentos/alocar-contrato-ia', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();
      try {
        const body = await readBody(req);
        const { nomeContrato, bdiPercentual, servicosSelecionados, catalogoContrato } = body;

        if (!nomeContrato || !Array.isArray(servicosSelecionados) || !Array.isArray(catalogoContrato)) {
          return sendJson(res, 400, {
            error: 'Parâmetros inválidos para alocação na planilha do contrato.',
          });
        }

        const catalogoEnriquecido = catalogoContrato.map((item: any) => {
          const auto = indexarItemDeterministicamente({
            code: item.codigo || item.code,
            description: item.descricao_original || item.description,
            unit: item.unidade || item.unit,
          });
          return {
            codigo: item.codigo || item.code,
            descricao_original: item.descricao_original || item.description,
            unidade: item.unidade || item.unit,
            preco_unitario: Number(item.preco_unitario ?? item.unitPrice ?? 0),
            disciplina: item.disciplina || auto.disciplina,
            tags_universais:
              Array.isArray(item.tags_universais) && item.tags_universais.length > 0
                ? item.tags_universais
                : auto.tags_universais,
            servicos_embutidos:
              Array.isArray(item.servicos_embutidos) && item.servicos_embutidos.length > 0
                ? item.servicos_embutidos
                : auto.servicos_embutidos,
          };
        });

        const resultado = await alocarServicosNaPlanilhaContratoComIA({
          nomeContrato,
          bdiPercentual: Number(bdiPercentual) || 0,
          servicosSelecionados,
          catalogoContrato: catalogoEnriquecido,
        });

        sendJson(res, 200, resultado);
      } catch (err: any) {
        sendJson(res, 500, {
          error: String(err?.message || err),
        });
      }
    });

    // 4. POST /api/orcamentos/gerar-ia
    middlewares.use('/api/orcamentos/gerar-ia', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();
      try {
        const body = await readBody(req);
        const { nomeContrato, bdiPercentual, escopoUsuario, catalogoContrato } = body;

        if (!nomeContrato || !Array.isArray(catalogoContrato)) {
          return sendJson(res, 400, {
            error: 'Parâmetros inválidos. Informe nomeContrato, escopoUsuario e catalogoContrato.',
          });
        }

        const catalogoEnriquecido = catalogoContrato.map((item: any) => {
          const auto = indexarItemDeterministicamente({
            code: item.codigo || item.code,
            description: item.descricao_original || item.description,
            unit: item.unidade || item.unit,
          });
          return {
            codigo: item.codigo || item.code,
            descricao_original: item.descricao_original || item.description,
            unidade: item.unidade || item.unit,
            preco_unitario: Number(item.preco_unitario ?? item.unitPrice ?? 0),
            disciplina: item.disciplina || auto.disciplina,
            tags_universais:
              Array.isArray(item.tags_universais) && item.tags_universais.length > 0
                ? item.tags_universais
                : auto.tags_universais,
            servicos_embutidos:
              Array.isArray(item.servicos_embutidos) && item.servicos_embutidos.length > 0
                ? item.servicos_embutidos
                : auto.servicos_embutidos,
          };
        });

        const resultado = await gerarOrcamentoComIA({
          nomeContrato,
          bdiPercentual: Number(bdiPercentual) || 0,
          escopoUsuario,
          catalogoFiltrado: catalogoEnriquecido,
        });

        sendJson(res, 200, resultado);
      } catch (err: any) {
        sendJson(res, 500, {
          error: String(err?.message || err),
        });
      }
    });

    // 5. POST /api/contratos/indexar
    middlewares.use('/api/contratos/indexar', async (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();
      try {
        const body = await readBody(req);
        const itens = Array.isArray(body.itens) ? body.itens : [];
        const resultado = await indexarItensContratoComIA(itens);
        sendJson(res, 200, resultado);
      } catch (err: any) {
        sendJson(res, 500, {
          error: String(err?.message || err),
        });
      }
    });

    // 6. GET e POST /api/cloud-sync (Persistência Global em Nuvem Cross-Browser e Cross-Device)
    middlewares.use('/api/cloud-sync', async (req: any, res: any, next: any) => {
      if (req.method === 'GET') {
        try {
          const result = await getCloudState();
          sendJson(res, 200, result);
        } catch (err: any) {
          sendJson(res, 500, { success: false, error: String(err?.message || err) });
        }
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await readBody(req);
          const result = await saveCloudState(body);
          sendJson(res, 200, result);
        } catch (err: any) {
          sendJson(res, 500, { success: false, error: String(err?.message || err) });
        }
        return;
      }

      return next();
    });
  };

  return {
    name: 'orcacraft-gemini-api-backend',
    configureServer(server) {
      registerMiddlewares(server.middlewares);
    },
    configurePreviewServer(server) {
      registerMiddlewares(server.middlewares);
    },
  };
}
