import { indexarItensContratoComIA } from '../server/geminiOrcamentoService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const resultado = await indexarItensContratoComIA(itens);
    return res.status(200).json(resultado);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
