import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  HelpCircle,
  CheckCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { KPIData, AgentMetrics, RedeMetrics, RegiaoMetrics } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface AIAssistantSectionProps {
  kpis: KPIData;
  agentsData: AgentMetrics[];
  redesData: RedeMetrics[];
  regioesData: RegiaoMetrics[];
  isSimulated?: boolean;
}

export const AIAssistantSection: React.FC<AIAssistantSectionProps> = ({
  kpis,
  agentsData,
  redesData,
  regioesData,
  isSimulated,
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate Trade Executive Report via backend Gemini
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const payload = {
        totalFaturamento: kpis.valorMensalTotal,
        totalAgentes: kpis.agentesAtivos,
        totalLocais: kpis.locaisUnicos,
        totalRedes: kpis.redesAtendidas,
        custoMedioVisita: kpis.custoMedioVisita,
        valorPorHoraMedio: kpis.valorPorHoraMedio,
        agentesConcentrados: agentsData
          .filter((a) => a.isConcentrado)
          .map((a) => ({
            nome: a.nome,
            rede: a.topRedeName,
            pct: a.concentracaoPct,
          })),
        agentesOverworked: agentsData
          .filter((a) => a.isOverworked)
          .map((a) => ({ nome: a.nome, horas: a.horasSemanais })),
        topRedes: redesData.slice(0, 5).map((r) => ({
          rede: r.label,
          valor: r.value,
          custoVisita: r.custoVisita,
        })),
        topRegioes: regioesData.slice(0, 5).map((r) => ({
          regiao: r.label,
          valor: r.value,
          pct: r.pct,
        })),
        simulacaoAtiva: isSimulated,
        simulacaoDetalhes: isSimulated ? 'Cenário simulado ativo no dashboard' : 'Cenário base',
      };

      const res = await fetch('/api/ai-diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.report) {
        setReport(json.report);
      } else {
        setReport('Não foi possível gerar o diagnóstico no momento.');
      }
    } catch (e: any) {
      console.error(e);
      setReport('Erro ao comunicar com o servidor Gemini.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Ask question to trade assistant
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatQuestion.trim() || isChatLoading) return;

    const q = chatQuestion.trim();
    setChatQuestion('');
    setChatHistory((prev) => [...prev, { role: 'user', text: q }]);
    setIsChatLoading(true);

    try {
      const context = {
        totalFaturamento: kpis.valorMensalTotal,
        totalAgentes: kpis.agentesAtivos,
        totalLocais: kpis.locaisUnicos,
        custoMedioVisita: kpis.custoMedioVisita,
        valorPorHoraMedio: kpis.valorPorHoraMedio,
        concentrados: agentsData
          .filter((a) => a.isConcentrado)
          .map((a) => `${a.nome} (${a.concentracaoPct.toFixed(0)}% em ${a.topRedeName})`),
        redes: redesData.slice(0, 5).map((r) => `${r.label} (Custo/visita: ${r.custoVisita.toFixed(2)})`),
      };

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context }),
      });

      const json = await res.json();
      if (json.success && json.answer) {
        setChatHistory((prev) => [...prev, { role: 'assistant', text: json.answer }]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', text: 'Desculpe, ocorreu uma instabilidade na resposta da IA.' },
        ]);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Erro ao conectar ao assistente de inteligência.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const concentrados = agentsData.filter((a) => a.isConcentrado);
  const overworked = agentsData.filter((a) => a.isOverworked);

  return (
    <div className="bg-gradient-to-br from-[#151522] via-[#12121a] to-[#181826] border border-[#6c63ff]/30 rounded-3xl p-5 md:p-6 mb-6 shadow-2xl relative overflow-hidden">
      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6c63ff] via-[#00d4aa] to-[#a78bfa]" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#262638]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6c63ff]/30 to-[#00d4aa]/20 border border-[#6c63ff]/40 flex items-center justify-center text-[#00d4aa]">
            <Sparkles className="w-5 h-5 text-[#00d4aa]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                IA Trade Advisor • Inteligência Estratégica (Gemini 3.8)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/30">
                PROMOTORIA & RENTABILIDADE
              </span>
            </div>
            <p className="text-xs text-[#9090aa] mt-0.5">
              Diagnósticos automatizados, auditoria de compliance trabalhista e consultor inteligente para a diretoria.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#00d4aa] text-white text-xs font-bold shadow-lg shadow-[#6c63ff]/30 hover:scale-[1.02] transition disabled:opacity-50"
        >
          {isGeneratingReport ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gerando Parecer Executivo...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Gerar Parecer Executivo com IA</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Trade Rule Alerts Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Risco Concentração */}
        <div
          className={`p-3 rounded-2xl border flex items-center gap-3 ${
            concentrados.length > 0
              ? 'bg-[#ff6b6b]/10 border-[#ff6b6b]/30 text-[#ff6b6b]'
              : 'bg-[#00d4aa]/10 border-[#00d4aa]/30 text-[#00d4aa]'
          }`}
        >
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">
              {concentrados.length > 0
                ? `${concentrados.length} Promotores Concentrados (≥50%)`
                : 'Zero Risco de Concentração Excessiva'}
            </div>
            <div className="text-[10px] text-[#9090aa]">
              {concentrados.length > 0
                ? 'Risco de subordinação ou dependência de 1 cliente'
                : 'Carteira balanceada entre múltiplas redes'}
            </div>
          </div>
        </div>

        {/* Alerta de Carga Horária */}
        <div
          className={`p-3 rounded-2xl border flex items-center gap-3 ${
            overworked.length > 0
              ? 'bg-[#ffd166]/10 border-[#ffd166]/30 text-[#ffd166]'
              : 'bg-[#00d4aa]/10 border-[#00d4aa]/30 text-[#00d4aa]'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">
              {overworked.length > 0
                ? `${overworked.length} Promotores com >44h/Semana`
                : 'Jornada Dentro do Padrão CLT (≤44h)'}
            </div>
            <div className="text-[10px] text-[#9090aa]">
              {overworked.length > 0
                ? 'Atenção para risco de passivo de horas extras'
                : 'Nenhum promotor em sobrecarga horária'}
            </div>
          </div>
        </div>

        {/* Custo Médio por Visita */}
        <div className="p-3 rounded-2xl border border-[#2b2b3d] bg-[#171724] flex items-center gap-3 text-[#a78bfa]">
          <TrendingUp className="w-5 h-5 shrink-0 text-[#00d4aa]" />
          <div>
            <div className="text-xs font-bold text-white">
              Custo Médio: {fmt(kpis.custoMedioVisita)} / Ida à Loja
            </div>
            <div className="text-[10px] text-[#9090aa]">
              Tarifa média contratada: {fmt(kpis.valorPorHoraMedio)}/hora
            </div>
          </div>
        </div>
      </div>

      {/* Generated Report Display */}
      {report && (
        <div className="bg-[#101018] border border-[#28283a] rounded-2xl p-5 mb-5 relative space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#20202e]">
            <span className="text-xs font-bold text-[#00d4aa] flex items-center gap-1.5 uppercase tracking-wider">
              <Bot className="w-4 h-4" />
              Parecer Executivo Emitido pela IA
            </span>
            <button
              onClick={copyReport}
              className="flex items-center gap-1 text-[11px] text-[#9090aa] hover:text-white px-2 py-1 rounded bg-[#1a1a26] border border-[#28283a] transition"
            >
              {copied ? <Check className="w-3 h-3 text-[#00d4aa]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar Parecer'}</span>
            </button>
          </div>
          <div className="text-xs text-[#d0d0dc] leading-relaxed whitespace-pre-line font-sans">
            {report}
          </div>
        </div>
      )}

      {/* Interactive Chat with Trade Assistant */}
      <div className="bg-[#12121c] border border-[#252538] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-[#6c63ff]" />
            Perguntar ao Assistente de Trade (Gemini)
          </span>
          <span className="text-[10px] text-[#5a5a75]">
            Respostas baseadas estritamente na base ativa
          </span>
        </div>

        {/* Chat Messages */}
        {chatHistory.length > 0 && (
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs ${
                  msg.role === 'user'
                    ? 'bg-[#6c63ff]/20 border border-[#6c63ff]/30 text-white ml-6'
                    : 'bg-[#181826] border border-[#2a2a3c] text-[#d5d5e5] mr-6'
                }`}
              >
                <div className="text-[10px] font-bold text-[#9090aa] mb-1">
                  {msg.role === 'user' ? 'Você' : 'IA Trade Advisor'}
                </div>
                <div className="leading-relaxed whitespace-pre-line">{msg.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Input box */}
        <form onSubmit={handleSendChat} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ex: 'Quais redes apresentam maior custo por visita e como renegociar?'"
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            disabled={isChatLoading}
            className="flex-1 bg-[#181826] border border-[#2a2a3e] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#6c63ff]"
          />
          <button
            type="submit"
            disabled={!chatQuestion.trim() || isChatLoading}
            className="p-2 px-3 rounded-xl bg-[#6c63ff] text-white hover:bg-[#7c73ff] transition disabled:opacity-40"
          >
            {isChatLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] text-[#5a5a75]">Sugestões rápidas:</span>
          {[
            'Quais promotores estão concentrados?',
            'Onde temos maior custo por visita?',
            'Como otimizar a rota compartilhada?',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setChatQuestion(prompt);
              }}
              className="text-[10px] bg-[#1a1a28] hover:bg-[#222234] text-[#a78bfa] px-2 py-0.5 rounded-lg border border-[#2e2e42] transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
