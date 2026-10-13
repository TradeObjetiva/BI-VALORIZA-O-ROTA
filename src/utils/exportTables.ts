export const EXPORT_TABLES = [
  { id: 'base', label: 'Base filtrada (linhas)', hint: 'Registros após os filtros atuais' },
  { id: 'redes', label: 'Redes de varejo / atacarejo', hint: 'Valor mensal e participação' },
  { id: 'regioes', label: 'Regiões geográficas', hint: 'Valor mensal por região' },
  { id: 'forms', label: 'Formulários / marcas', hint: 'Ranking de marcas' },
  { id: 'custoVisita', label: 'Custo médio por visita', hint: 'Custo de ida por rede' },
  { id: 'agentes', label: 'Promotores (ranking e alertas)', hint: 'Horas, concentração e CLT' },
  { id: 'matriz', label: 'Matriz agente × rede', hint: 'Cobertura cruzada' },
  { id: 'lojasForms', label: 'Lojas por quantidade de marcas', hint: 'Densidade de formulários no PDV' },
  { id: 'freqMarca', label: 'Formulários × frequência semanal', hint: 'Cruzamento de visitas' },
] as const;

export type ExportTableId = (typeof EXPORT_TABLES)[number]['id'];
