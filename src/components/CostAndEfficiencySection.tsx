import React from 'react';
import { DollarSign, Clock, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { RedeMetrics, AgentMetrics } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface CostAndEfficiencySectionProps {
  redesData: RedeMetrics[];
  agentsData: AgentMetrics[];
  mediaCustoVisitaGeral: number;
  mediaHoraGeral: number;
  totalVisitasSemanais: number;
  totalHorasSemanais: number;
}

export const CostAndEfficiencySection: React.FC<CostAndEfficiencySectionProps> = ({
  redesData,
  agentsData,
  mediaCustoVisitaGeral,
  mediaHoraGeral,
  totalVisitasSemanais,
  totalHorasSemanais,
}) => {
  // Sort redes by custoVisita desc
  const sortedRedes = [...redesData]
    .filter((r) => r.visitasSem > 0)
    .sort((a, b) => b.custoVisita - a.custoVisita);

  // Filter agents with valid hours
  const validAgents = [...agentsData].filter((a) => a.horasSemanais > 0);
  const topAgentsByHour = [...validAgents].sort((a, b) => b.valorHora - a.valorHora).slice(0, 3);
  const bottomAgentsByHour = [...validAgents].sort((a, b) => a.valorHora - b.valorHora).slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Bloco 2.3: Custo por Visita Realizada */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Custo Médio por Visita Realizada (Bloco 2.3)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
            Média: {fmt(mediaCustoVisitaGeral)} / ida
          </span>
        </div>

        <div className="px-5 py-2.5 text-xs text-[#9090aa] bg-[#121218] border-b border-[#20202c]">
          Fórmula: <code className="text-[#a78bfa] font-mono">Valor Semanal ÷ Visitas por Semana</code> · Top Redes por custo médio de ida à loja:
        </div>

        {/* Table Wrap */}
        <div className="overflow-y-auto max-h-[300px] flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">#</th>
                <th className="py-2.5 px-4 font-semibold">Rede</th>
                <th className="py-2.5 px-4 font-semibold text-center">Visitas/Sem</th>
                <th className="py-2.5 px-4 font-semibold text-right">Valor Semanal</th>
                <th className="py-2.5 px-4 font-semibold text-right">Custo / Visita</th>
                <th className="py-2.5 px-4 font-semibold text-center">vs Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {sortedRedes.slice(0, 8).map((r, idx) => {
                const diffPct =
                  mediaCustoVisitaGeral > 0
                    ? ((r.custoVisita - mediaCustoVisitaGeral) / mediaCustoVisitaGeral) * 100
                    : 0;

                return (
                  <tr key={r.label} className="hover:bg-[#1a1a26]/60 transition-colors">
                    <td className="py-2.5 px-4 text-[#5a5a75] font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-medium text-white max-w-[170px] truncate" title={r.label}>
                      {r.label}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-[#6c63ff]/15 text-[#a78bfa] font-bold text-[11px]">
                        {r.visitasSem.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#9090aa] font-mono">{fmt(r.valorSem)}</td>
                    <td className="py-2.5 px-4 text-right text-[#00d4aa] font-bold font-mono">
                      {fmt(r.custoVisita)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {diffPct > 5 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30">
                          <ArrowUpRight className="w-3 h-3" />
                          +{diffPct.toFixed(0)}%
                        </span>
                      ) : diffPct < -5 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
                          <ArrowDownRight className="w-3 h-3" />
                          {diffPct.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#9090aa]">Paridade</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer strip */}
        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
          <span>
            Total: <strong className="text-white">{totalVisitasSemanais.toFixed(1)}</strong> visitas/sem
          </span>
          <span>
            Maior Custo: <strong className="text-[#00d4aa]">{sortedRedes[0]?.label || '—'}</strong> ({fmt(sortedRedes[0]?.custoVisita || 0)})
          </span>
        </div>
      </div>

      {/* Bloco 1.3 & 2.4: Eficiência de Horas */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffd166]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Eficiência de Horas: R$/Hora Trabalhada (Blocos 1.3 & 2.4)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#ffd166]/15 text-[#ffd166] border border-[#ffd166]/30">
            Média: {fmt(mediaHoraGeral)}/h
          </span>
        </div>

        <div className="px-5 py-2.5 text-xs text-[#9090aa] bg-[#121218] border-b border-[#20202c]">
          Fórmula: <code className="text-[#a78bfa] font-mono">Valor Mensal ÷ Horas Mensais</code> (Horas por visita × Frequência × 52/12):
        </div>

        <div className="p-5 flex-1 flex flex-col justify-around gap-4">
          {/* Top 3 Maior Retorno */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#00d4aa] uppercase tracking-wider flex items-center gap-1.5">
                ⭐ Top 3 Maior Retorno por Hora
              </span>
              <span className="text-[10px] text-[#5a5a75]">Alta Rentabilidade</span>
            </div>
            <div className="space-y-2">
              {topAgentsByHour.map((a, i) => (
                <div
                  key={a.nome}
                  className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-[#181824] border border-[#242436] hover:border-[#00d4aa]/40 transition"
                >
                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[200px]" title={a.nome}>
                      {i + 1}. {a.nome}
                    </div>
                    <div className="text-[11px] text-[#9090aa]">
                      {a.horasSemanais.toFixed(1)}h/sem · {a.regiao}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#00d4aa]">{fmt(a.valorHora)}/h</div>
                    <div className="text-[10px] text-[#5a5a75]">{fmt(a.valor)}/mês</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menor Retorno por Hora */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#ff6b6b] uppercase tracking-wider flex items-center gap-1.5">
                ⚠️ Menor Retorno por Hora (Alta Carga de Trabalho)
              </span>
              <span className="text-[10px] text-[#5a5a75]">Oportunidade de Ajuste</span>
            </div>
            <div className="space-y-2">
              {bottomAgentsByHour.map((a, i) => (
                <div
                  key={a.nome}
                  className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-[#181824] border border-[#242436] hover:border-[#ff6b6b]/40 transition"
                >
                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[200px]" title={a.nome}>
                      {i + 1}. {a.nome}
                    </div>
                    <div className="text-[11px] text-[#9090aa]">
                      {a.horasSemanais.toFixed(1)}h/sem · {a.regiao}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#ffd166]">{fmt(a.valorHora)}/h</div>
                    <div className="text-[10px] text-[#5a5a75]">{fmt(a.valor)}/mês</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
          <span>
            Carga Total: <strong className="text-white">{totalHorasSemanais.toFixed(0)}h/sem</strong>
          </span>
          <span>
            Mês (52/12): <strong className="text-[#60a5fa]">{(totalHorasSemanais * (52 / 12)).toFixed(0)}h</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
