import {
  alocarServicosNaPlanilhaContratoComIA,
  indexarItemDeterministicamente,
} from '../server/geminiOrcamentoService';

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
    const { nomeContrato, bdiPercentual, servicosSelecionados, catalogoContrato } = body;

    if (!nomeContrato || !Array.isArray(servicosSelecionados) || !Array.isArray(catalogoContrato)) {
      return res.status(400).json({
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

    return res.status(200).json(resultado);
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
