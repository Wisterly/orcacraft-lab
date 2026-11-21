export interface CloudSyncPayload {
  demands?: any[];
  contracts?: any[];
  selectedDemands?: Record<string, any>;
  activeContractId?: string | null;
  updatedAt?: string;
  version?: number;
}

const DEFAULT_GIST_ID = 'b0dc64978645df8a245eed7b3a4e9bf5';

function getSyncConfig() {
  const token = (process.env.GITHUB_SYNC_TOKEN || '').trim();
  const gistId = (process.env.GITHUB_GIST_ID || DEFAULT_GIST_ID).trim();
  return { token, gistId };
}

export async function getCloudState(): Promise<{ success: boolean; data: CloudSyncPayload | null; source: 'gist' | 'empty'; error?: string }> {
  const { token, gistId } = getSyncConfig();

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
            if (parsed && typeof parsed === 'object') {
              return { success: true, data: parsed, source: 'gist' };
            }
          } catch (e: any) {
            console.error('Erro ao parsear JSON do Gist:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('Falha de rede ao conectar ao Gist:', err?.message || err);
      return { success: false, data: null, source: 'empty', error: String(err?.message || err) };
    }
  }

  return { success: true, data: null, source: 'empty' };
}

export async function saveCloudState(payload: CloudSyncPayload): Promise<{ success: boolean; updatedAt: string; source: string; error?: string }> {
  const { token, gistId } = getSyncConfig();
  const now = new Date().toISOString();
  const enriched: CloudSyncPayload = {
    ...payload,
    updatedAt: now,
    version: (payload.version || 1) + 1,
  };

  const jsonString = JSON.stringify(enriched, null, 2);

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
      return { success: false, updatedAt: now, source: 'gist_error', error: `Gist status ${res.status}: ${errText}` };
    } catch (err: any) {
      return { success: false, updatedAt: now, source: 'gist_error', error: String(err?.message || err) };
    }
  }

  return { success: false, updatedAt: now, source: 'no_token', error: 'GITHUB_SYNC_TOKEN não configurado.' };
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await getCloudState();
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const result = await saveCloudState(body);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
