import { GoogleGenAI } from '@google/genai';

export async function generateTradeExecutiveReport(dataSummary: {
  totalFaturamento: number;
  totalAgentes: number;
  totalLocais: number;
  totalRedes: number;
  custoMedioVisita: number;
  valorPorHoraMedio: number;
  agentesConcentrados: { nome: string; rede: string; pct: number }[];
  agentesOverworked: { nome: string; horas: number }[];
  topRedes: { rede: string; valor: number; custoVisita: number }[];
  topRegioes: { regiao: string; valor: number; pct: number }[];
  simulacaoAtiva?: boolean;
  simulacaoDetalhes?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return generateFallbackDiagnostic(dataSummary);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
Você é o Diretor Sênior de Inteligência de Trade Marketing da Objetiva Mkt, com 20 anos de experiência em gestão de promotores de vendas, rentabilidade comercial, roteirização de campo e compliance trabalhista para bens de consumo (FMCG).

Analise os dados consolidados da planilha de valorização abaixo e elabore um PARECER EXECUTIVO ESTRATÉGICO para a Diretoria:

DADOS OPERACIONAIS CONSOLIDADOS:
- Faturamento Mensal Total: R$ ${dataSummary.totalFaturamento.toFixed(2)}
- Promotores / Agentes Ativos: ${dataSummary.totalAgentes}
- Pontos de Venda (Locais Únicos): ${dataSummary.totalLocais}
- Redes de Varejo / Atacarejo Atendidas: ${dataSummary.totalRedes}
- Custo Médio por Visita Realizada: R$ ${dataSummary.custoMedioVisita.toFixed(2)}
- Remuneração Média Contratual por Hora: R$ ${dataSummary.valorPorHoraMedio.toFixed(2)} / hora
- Promotores em Risco de Concentração / Dependência (≥50% na mesma rede): ${JSON.stringify(
      dataSummary.agentesConcentrados
    )}
- Promotores com Risco de Sobrecarga de Horas (>44h semanais): ${JSON.stringify(
      dataSummary.agentesOverworked
    )}
- Top Redes por Faturamento & Custo de Visita: ${JSON.stringify(
      dataSummary.topRedes
    )}
- Distribuição Regional: ${JSON.stringify(dataSummary.topRegioes)}
${
  dataSummary.simulacaoAtiva
    ? `- Cenário de Simulação Aplicado: ${dataSummary.simulacaoDetalhes}`
    : ''
}

Por favor, estruture sua resposta no formato markdown profissional com os seguintes tópicos bem detalhados:
1. 📊 DIAGNÓSTICO GERAL DE PERFORMANCE & RENTABILIDADE
2. ⚠️ PONTOS CRÍTICOS & RISCO TRABALHISTA (CLT / Terceirização)
3. 💡 OPORTUNIDADES IMEDIATAS DE SINERGIA & ROTEIRIZAÇÃO (Merchandising Compartilhado)
4. 📈 ESTRATÉGIA DE NEGOCIAÇÃO COM AS REDES / CLIENTES
5. 🎯 PLANO DE AÇÃO SUGERIDO EM 3 PASSOS (30 / 60 / 90 DIAS)

Mantenha uma linguagem executiva, direta, quantitativa e altamente acionável.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text || generateFallbackDiagnostic(dataSummary);
  } catch (error) {
    console.error('Erro na chamada Gemini:', error);
    return generateFallbackDiagnostic(dataSummary);
  }
}

export async function askTradeAssistant(
  question: string,
  contextData: any
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return `Diagnóstico Trade Inteligente: Com base nos dados ativos (Faturamento: R$ ${contextData.totalFaturamento?.toFixed(
      2
    )}, ${contextData.totalAgentes} promotores e ${
      contextData.totalLocais
    } lojas), observamos que sua operação apresenta oportunidade imediata de rebalanceamento de promotores concentrados e unificação de formulários por rota para reduzir o custo médio por visita de R$ ${contextData.custoMedioVisita?.toFixed(
      2
    )}.`;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Você é um Consultor Especialista em Trade Marketing e B.I. da Objetiva Mkt.
Contexto da operação:
${JSON.stringify(contextData, null, 2)}

Pergunta do Usuário:
"${question}"

Responda de forma direta, analítica e prática com base estrita nos dados da operação.`,
    });

    return response.text || 'Não foi possível gerar a resposta.';
  } catch (err: any) {
    console.error('Erro na resposta Gemini:', err);
    return 'Erro ao consultar o assistente de IA. Por favor, tente novamente.';
  }
}

function generateFallbackDiagnostic(data: any): string {
  const concList = (data.agentesConcentrados || [])
    .map(
      (a: any) =>
        `- **${a.nome}**: ${a.pct.toFixed(0)}% do faturamento concentrado em ${
          a.rede
        }`
    )
    .join('\n');

  const overList = (data.agentesOverworked || [])
    .map(
      (a: any) =>
        `- **${a.nome}**: ${a.horas.toFixed(1)} horas semanais contratadas (>44h CLT)`
    )
    .join('\n');

  return `### 📊 Diagnóstico Executivo de Trade Marketing

**1. Visão Geral da Operação**
- Faturamento mensal consolidado de **R$ ${data.totalFaturamento.toLocaleString(
    'pt-BR',
    { minimumFractionDigits: 2 }
  )}** distribuído em **${data.totalAgentes} promotores** e **${
    data.totalLocais
  } lojas**.
- Custo médio por visita realizada fixado em **R$ ${data.custoMedioVisita.toFixed(
    2
  )}**, com valor médio por hora trabalhada de **R$ ${data.valorPorHoraMedio.toFixed(
    2
  )}/hora**.

**2. Riscos de Compliance & Concentração**
${
  concList
    ? `Identificamos promotores com dependência excessiva em um único cliente:\n${concList}\n*Recomendação:* Redistribuir roteiros para evitar risco de vínculo empregatício direto com a rede.`
    : 'Nenhum promotor em estado crítico de concentração acima de 50%.'
}

${
  overList
    ? `\n**Alerta de Sobrecarga de Horas:**\n${overList}\n*Risco:* Excesso de jornada semanal pode gerar passivo de horas extras se não houver banco de horas formalizado.`
    : ''
}

**3. Oportunidades de Otimização & Sinergia**
- **Merchandising Compartilhado:** Promotores que visitam lojas para apenas 1 marca podem absorver marcas adicionais com ganho marginal de tempo e redução de custo de deslocamento.
- **Equalização de Tabela:** Renegociar com redes onde o custo por visita está acima da média de R$ ${data.custoMedioVisita.toFixed(
    2
  )}.

**4. Plano de Ação Recomendado**
1. **Curto Prazo (30 dias):** Rebalancear a grade dos ${
    data.agentesConcentrados?.length || 0
  } promotores concentrados.
2. **Médio Prazo (60 dias):** Aplicar o simulador de tabela para reajuste de redes com custo/visita desalinhado.
3. **Longo Prazo (90 dias):** Integrar geolocalização e fotos de gôndola para valorização do valor cobrado por visita.`;
}
