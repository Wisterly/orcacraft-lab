import fs from 'node:fs';
import path from 'node:path';

export interface CloudSyncPayload {
  demands?: any[];
  contracts?: any[];
  selectedDemands?: Record<string, any>;
  activeContractId?: string | null;
  updatedAt?: string;
  version?: number;
}

const DEFAULT_GIST_ID = 'b0dc64978645df8a245eed7b3a4e9bf5';
const LOCAL_DB_PATH = path.resolve(process.cwd(), 'data', 'cloud_sync_db.json');

function getSyncConfig() {
  let token = process.env.GITHUB_SYNC_TOKEN || '';
  let gistId = process.env.GITHUB_GIST_ID || DEFAULT_GIST_ID;

  // Tenta ler de .env.local se disponível
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const tokenMatch = content.match(/GITHUB_SYNC_TOKEN=["']?([^"'\r\n]+)["']?/);
      const gistMatch = content.match(/GITHUB_GIST_ID=["']?([^"'\r\n]+)["']?/);
      if (tokenMatch && tokenMatch[1]) token = tokenMatch[1].trim();
      if (gistMatch && gistMatch[1]) gistId = gistMatch[1].trim();
    }
  } catch (err) {
    // Silencioso
  }

  // Token deve vir exclusivamente de variáveis de ambiente
  return { token, gistId };
}

/**
 * Lê o estado armazenado na nuvem (GitHub Gist) com fallback para arquivo local.
 */
export async function getCloudState(): Promise<{ success: boolean; data: CloudSyncPayload | null; source: 'gist' | 'local' | 'empty'; error?: string }> {
  const { token, gistId } = getSyncConfig();

  // 1. Tenta buscar no GitHub Gist
  if (token && gistId) {
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'OrçaCraft-Lab-CloudSync',
        },
      });

      if (res.ok) {
        const gistData = await res.json();
        const fileObj = gistData.files?.['orcacraft_state.json'];
        if (fileObj && fileObj.content) {
          try {
            const parsed = JSON.parse(fileObj.content);
            if (parsed && typeof parsed === 'object' && (parsed.demands || parsed.contracts || parsed.selectedDemands)) {
              // Também salva localmente para cache
              saveLocalBackup(parsed);
              return { success: true, data: parsed, source: 'gist' };
            }
          } catch (e) {
            console.error('Erro ao parsear JSON do Gist:', e);
          }
        }
      } else {
        console.warn(`Gist fetch falhou com status ${res.status}`);
      }
    } catch (err: any) {
      console.error('Falha de rede ao conectar ao Gist:', err?.message || err);
    }
  }

  // 2. Fallback para arquivo local
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return { success: true, data: parsed, source: 'local' };
    }
  } catch (err) {
    console.error('Erro ao ler backup local:', err);
  }

  return { success: true, data: null, source: 'empty' };
}

/**
 * Salva o estado completo na nuvem (GitHub Gist) e cria backup local.
 */
export async function saveCloudState(payload: CloudSyncPayload): Promise<{ success: boolean; updatedAt: string; source: string; error?: string }> {
  const { token, gistId } = getSyncConfig();
  const now = new Date().toISOString();
  const enriched: CloudSyncPayload = {
    ...payload,
    updatedAt: now,
    version: (payload.version || 1) + 1,
  };

  const jsonString = JSON.stringify(enriched, null, 2);

  // 1. Salva backup local
  saveLocalBackup(enriched);

  // 2. Tenta salvar no GitHub Gist
  if (token && gistId) {
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OrçaCraft-Lab-CloudSync',
        },
        body: JSON.stringify({
          description: `OrçaCraft.lab - Cloud Database Sync (${now})`,
          files: {
            'orcacraft_state.json': {
              content: jsonString,
            },
          },
        }),
      });

      if (res.ok) {
        return { success: true, updatedAt: now, source: 'gist' };
      }

      const errText = await res.text();
      console.warn(`Gist patch retornou status ${res.status}: ${errText}`);
      return { success: true, updatedAt: now, source: 'local_fallback', error: `Gist status ${res.status}` };
    } catch (err: any) {
      console.error('Erro ao salvar no Gist:', err);
      return { success: true, updatedAt: now, source: 'local_fallback', error: err?.message };
    }
  }

  return { success: true, updatedAt: now, source: 'local' };
}

function saveLocalBackup(data: any) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Ignora erro de gravação se estiver em ambiente read-only serverless
  }
}
