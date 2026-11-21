import { verificarStatusIA } from '../server/geminiOrcamentoService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const status = await verificarStatusIA();
    return res.status(200).json(status);
  } catch (err: any) {
    return res.status(500).json({ status: 'error', mensagem: String(err?.message || err) });
  }
}
