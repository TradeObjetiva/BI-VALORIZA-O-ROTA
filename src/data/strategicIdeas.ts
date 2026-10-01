import { StrategicIdea } from '../types/trade';

export const STRATEGIC_IDEAS: StrategicIdea[] = [
  {
    id: 'idea-1',
    categoria: 'financeiro',
    titulo: 'Simulador Dinâmico de Reajuste & Repasse de Tabela',
    badge: 'Rentabilidade',
    icone: 'Calculator',
    problemaAtual:
      'Ao negociar renovações contratuais com as marcas clientes ou absorver dissídio coletivo de promotores, a agência não consegue simular em tempo real o impacto na margem líquida por rede ou região.',
    solucaoProposta:
      'Um módulo de simulação "What-If" que permite testar reajustes percentuais (+3%, +5%, +10%, etc.) de forma global ou segmentada por Rede (ex: Carrefour vs Assaí) ou por Marca. Mostra imediatamente a diferença mensal em R$, a nova tarifa/hora e o novo custo por visita.',
    impactoEsperado:
      'Aumento de 4% a 8% na assertividade das propostas comerciais e proteção da margem da agência contra desvios inflacionários.',
    comoImplementar:
      'Aplicar o multiplicador 52/12 sobre a base parametrizada e comparar o cenário Base vs Cenário Simulado com exibição de delta e gráficos comparativos.',
    kpiAlvo: 'Margem Bruta Operacional & Faturamento Mensal',
  },
  {
    id: 'idea-2',
    categoria: 'compliance',
    titulo: 'Alerta Preventivo de Risco Trabalhista & Exclusividade',
    badge: 'Compliance & CLT',
    icone: 'ShieldAlert',
    problemaAtual:
      'Promotores que dedicam mais de 50% de sua renda ou horas a uma única rede/cliente podem gerar passivo trabalhista (subordinação direta ou equiparação salarial), além do risco de sobrejornada (>44h semanais).',
    solucaoProposta:
      'Indicadores automáticos de Compliance: 1) Score de Concentração de Faturamento (Alerta Vermelho para promotores com ≥50% em uma única rede); 2) Trava de Jornada Contratada (>44h semanais sinalizado como risco imediato de hora extra).',
    impactoEsperado:
      'Redução drástica do risco de passivos e litígios trabalhistas em terceirização de trade marketing.',
    comoImplementar:
      'Cálculo automático da participação da maior rede no faturamento do agente e soma das horas semanais totais com badges visuais e filtros de exceção.',
    kpiAlvo: 'Índice de Risco Trabalhista & Promotores Concentrados',
  },
  {
    id: 'idea-3',
    categoria: 'roteirizacao',
    titulo: 'Otimizador de Sinergia de Rota & Merchandising Compartilhado',
    badge: 'Sinergia Operacional',
    icone: 'Route',
    problemaAtual:
      'Várias lojas são visitadas para apenas 1 marca ou formulário. Enquanto isso, outras lojas recebem múltiplos promotores da mesma agência em dias diferentes, duplicando custos de deslocamento.',
    solucaoProposta:
      'Painel de Otimização de Rota Compartilhada: identificar lojas com apenas 1 formulário e sugerir a agregação de marcas adicionais ("Merchandising Compartilhado"). Identificar também promotores que atendem lojas na mesma rua/bairro.',
    impactoEsperado:
      'Aumento de 15% a 25% na densidade de atendimento por promotor, diluindo custos fixos e gerando faturamento incremental.',
    comoImplementar:
      'Cruzamento de Local × Quantidade de Formulários e análise de lojas coincidentes por CEP/Bairro entre promotores.',
    kpiAlvo: 'Média de Formulários por Loja & Custo Médio por Visita',
  },
  {
    id: 'idea-4',
    categoria: 'ia',
    titulo: 'Trade Advisor com IA Generativa (Diagnóstico Executivo em 1 Clique)',
    badge: 'Inteligência Artificial',
    icone: 'Sparkles',
    problemaAtual:
      'O coordenador de inteligência de trade precisa de horas para compilar análises manuais para a diretoria, identificar anomalias na planilha e sugerir renegociações.',
    solucaoProposta:
      'Integração com Gemini API para gerar pareceres executivos automáticos estruturados em: Análise SWOT da Operação, Top 3 Riscos Operacionais, Oportunidades de Renegociação de Tabela e Plano de Ação em 30 Dias.',
    impactoEsperado:
      'Economia de mais de 80% do tempo de preparação de relatórios executivos para clientes e diretoria.',
    comoImplementar:
      'Envio do resumo consolidado anonimizado da planilha para o modelo Gemini 3.8 Flash via proxy backend seguro com prompts especializados em Trade Marketing.',
    kpiAlvo: 'Tempo de Resposta Estratégica & Qualidade dos Pareceres',
  },
  {
    id: 'idea-5',
    categoria: 'financeiro',
    titulo: 'Benchmarking de Custo por Visita & R$/Hora por Canal (Varejo vs Atacarejo)',
    badge: 'Benchmarking',
    icone: 'TrendingUp',
    problemaAtual:
      'Não há distinção clara de precificação entre formatos de loja (Hipermercado, Atacarejo/Cash&Carry, Supermercado de Proximidade), embora o tempo e o esforço de reposição sejam totalmente diferentes.',
    solucaoProposta:
      'Tabela comparativa segmentando Redes por Canal de Venda (Atacarejo vs Hiper vs Super) correlacionando Custo Médio por Ida à Loja e R$/Hora, evidenciando onde a operação está subremunerada.',
    impactoEsperado:
      'Equalização de tabelas comerciais para Atacarejo (onde a carga de reposição e tempo de loja é maior), aumentando a remuneração em contratos pesados.',
    comoImplementar:
      'Classificação dos nomes de rede com badges e agrupamento de médias comparativas de horas e valor/visita.',
    kpiAlvo: 'R$/Hora Médio & Custo por Visita por Canal',
  },
  {
    id: 'idea-6',
    categoria: 'bi',
    titulo: 'Matriz Heatmap Interativa de Presença & Share de Cobertura',
    badge: 'Visualização Avançada',
    icone: 'Grid3X3',
    problemaAtual:
      'Visualizar o cruzamento de promotores com redes em planilhas longas é cansativo e esconde buracos de atendimento e sobreposições geográficas.',
    solucaoProposta:
      'Uma matriz interativa dinâmica com filtros de busca, alternância rápida de métricas (R$ Faturado, Quantidade de Lojas ou Horas Semanais) e escala de calor por intensidade de atendimento.',
    impactoEsperado:
      'Visão 360° imediata de cobertura para a coordenação de campo e gerência de contas.',
    comoImplementar:
      'Matriz dinâmica com cabeçalhos e coluna do agente congelados (sticky headers) e gradiente de cor proporcional ao valor máximo da grade.',
    kpiAlvo: 'Taxa de Ocupação & Cobertura de Lojas',
  },
  {
    id: 'idea-7',
    categoria: 'bi',
    titulo: 'Exportador Executivo para Apresentação & Excel Consolidado',
    badge: 'Exportação & Relatórios',
    icone: 'FileSpreadsheet',
    problemaAtual:
      'Para enviar relatórios a clientes ou diretores, o analista precisava tirar prints da tela ou refazer tabelas do zero no PowerPoint.',
    solucaoProposta:
      'Exportação com 1 clique para planilha Excel (.xlsx) estruturada com todas as abas consolidadas, além de modo de impressão / PDF perfeitamente diagramado sem cortes.',
    impactoEsperado:
      'Profissionalismo imediato nas reuniões de prestação de contas com os clientes das marcas.',
    comoImplementar:
      'Uso da biblioteca SheetJS para gerar múltiplos workbooks e CSS `@media print` otimizado para quebras de página limpas.',
    kpiAlvo: 'Produtividade da Equipe de Inteligência',
  },
  {
    id: 'idea-8',
    categoria: 'compliance',
    titulo: 'Auditoria Automática de Validação de Planilha (Data Quality)',
    badge: 'Qualidade de Dados',
    icone: 'CheckCheck',
    problemaAtual:
      'Planilhas de campo frequentemente vêm com erros de digitação (ex: "3X" vs "3x", CPFs duplicados, valores com ponto e vírgula trocados, horários vazios).',
    solucaoProposta:
      'Validador de integridade no momento do upload que alerta sobre campos faltantes, inconsistências de formatos numéricos e duplicidades anômalas antes de processar o dashboard.',
    impactoEsperado:
      'Zero erros em relatórios consolidados e redução de reprocessamentos.',
    comoImplementar:
      'Rotina de sanitização prévia no leitor SheetJS com resumo de qualidade dos dados.',
    kpiAlvo: 'Taxa de Conformidade dos Dados (Data Hygiene)',
  },
];
