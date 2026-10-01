import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { AgentMetrics } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';
import { SortableTh, SortDir, compareValues, toggleSort } from './SortableTh';

interface AgenteRankingTableProps {
  agentsData: AgentMetrics[];
  totalValorMensal: number;
}

type SortField = 'valor' | 'nome' | 'locais' | 'pct' | 'concentracao' | 'hora' | 'regiao' | 'horas';

export const AgenteRankingTable: React.FC<AgenteRankingTableProps> = ({
  agentsData,
  totalValorMensal,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('valor');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const applySort = (field: SortField, defaultDir: SortDir = 'desc') => {
    const next = toggleSort(sortField, sortDir, field, defaultDir);
    setSortField(next.key as SortField);
    setSortDir(next.dir);
  };

  const filteredAndSortedAgents = useMemo(() => {
    let result = [...agentsData];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          a.regiao.toLowerCase().includes(q) ||
          a.topRedeName.toLowerCase().includes(q)
      );
    }

    const getter: Record<SortField, (a: AgentMetrics) => string | number> = {
      valor: (a) => a.valor,
      nome: (a) => a.nome,
      locais: (a) => a.locais,
      pct: (a) => a.pct,
      concentracao: (a) => a.concentracaoPct,
      hora: (a) => a.valorHora,
      regiao: (a) => a.regiao,
      horas: (a) => a.horasSemanais,
    };

    result.sort((a, b) => compareValues(getter[sortField](a), getter[sortField](b), sortDir));
    return result;
  }, [agentsData, search, sortField, sortDir]);

  const maxVal = agentsData[0]?.valor || 1;
  const concentradosQtd = agentsData.filter((a) => a.isConcentrado).length;
  const overworkedQtd = agentsData.filter((a) => a.isOverworked).length;
  const totalHorasGeral = agentsData.reduce((s, a) => s + a.horasSemanais, 0);
  const mediaHoraGeral =
    totalHorasGeral > 0
      ? totalValorMensal / (totalHorasGeral * (52 / 12))
      : 0;

  return (
    <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg mb-6 flex flex-col">
      {/* Header */}
      <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Promotores de Vendas — Ranking, Horas & Alertas CLT (Blocos 1.1 & 1.3)
            </h3>
            <p className="text-[11px] text-[#9090aa]">
              Identificação de sobrecarga de jornada e dependência econômica por cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5a5a75] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar promotor ou região..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#121218] border border-[#28283a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#6c63ff] w-48 sm:w-60"
            />
          </div>
          <span className="text-[11px] font-semibold text-[#9090aa] px-2 py-1 rounded-lg bg-[#121218]">
            {filteredAndSortedAgents.length} promotores
          </span>
        </div>
      </div>

      {/* Tabs / Sorting Bar */}
      <div className="flex items-center gap-1.5 p-2 px-5 bg-[#171722] border-b border-[#242434] overflow-x-auto">
        <span className="text-[11px] font-semibold text-[#5a5a75] mr-1 uppercase tracking-wider hidden sm:inline">
          Ordenar por:
        </span>
        <button
          onClick={() => {
            setSortField('valor');
            setSortDir('desc');
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
            sortField === 'valor'
              ? 'bg-[#6c63ff] text-white shadow-sm'
              : 'text-[#9090aa] hover:text-white hover:bg-[#20202e]'
          }`}
        >
          Por Valor Mensal ↓
        </button>
        <button
          onClick={() => {
            setSortField('nome');
            setSortDir('asc');
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
            sortField === 'nome'
              ? 'bg-[#6c63ff] text-white shadow-sm'
              : 'text-[#9090aa] hover:text-white hover:bg-[#20202e]'
          }`}
        >
          A → Z
        </button>
        <button
          onClick={() => {
            setSortField('locais');
            setSortDir('desc');
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
            sortField === 'locais'
              ? 'bg-[#6c63ff] text-white shadow-sm'
              : 'text-[#9090aa] hover:text-white hover:bg-[#20202e]'
          }`}
        >
          Por Qtd Locais
        </button>
        <button
          onClick={() => {
            setSortField('concentracao');
            setSortDir('desc');
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
            sortField === 'concentracao'
              ? 'bg-[#ff6b6b] text-white shadow-sm'
              : 'text-[#ff6b6b] hover:bg-[#ff6b6b]/10'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Concentrados (≥50%)</span>
          {concentradosQtd > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {concentradosQtd}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setSortField('hora');
            setSortDir('desc');
          }}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
            sortField === 'hora'
              ? 'bg-[#00d4aa] text-[#0d0d12] shadow-sm'
              : 'text-[#00d4aa] hover:bg-[#00d4aa]/10'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>R$ / Hora ↓</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse min-w-[850px]">
          <thead className="sticky top-0 bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434] z-10">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-10">#</th>
              <SortableTh
                label="Agente / Promotor"
                column="nome"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('nome', 'asc')}
              />
              <SortableTh
                label="Região"
                column="regiao"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('regiao', 'asc')}
              />
              <SortableTh
                label="Locais"
                column="locais"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('locais')}
                align="center"
              />
              <SortableTh
                label="Horas/Sem"
                column="horas"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('horas')}
                align="center"
              />
              <SortableTh
                label="R$/Hora"
                column="hora"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('hora')}
                align="center"
              />
              <SortableTh
                label="Concentração Maior Rede (1.1)"
                column="concentracao"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('concentracao')}
                align="center"
              />
              <SortableTh
                label="% Operação"
                column="pct"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('pct')}
                align="right"
              />
              <SortableTh
                label="Valor Mensal"
                column="valor"
                sortKey={sortField}
                sortDir={sortDir}
                onSort={() => applySort('valor')}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2c]">
            {filteredAndSortedAgents.map((a, idx) => {
              const isFirst3 = idx < 3;
              return (
                <tr key={a.nome} className="hover:bg-[#1a1a26]/60 transition-colors">
                  <td className="py-3 px-4 text-[#5a5a75] font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold ${
                        idx === 0
                          ? 'bg-[#ffd166]/20 text-[#ffd166]'
                          : idx === 1
                          ? 'bg-[#94a3b8]/20 text-[#94a3b8]'
                          : idx === 2
                          ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
                          : 'text-[#5a5a75]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white truncate max-w-[210px]" title={a.nome}>
                      {a.nome}
                    </div>
                    <div className="text-[10px] text-[#5a5a75] font-mono">CPF: {a.cpf}</div>
                  </td>
                  <td className="py-3 px-4 text-[#9090aa] max-w-[130px] truncate" title={a.regiao}>
                    {a.regiao}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] font-bold text-[11px]">
                      {a.locais}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`font-semibold ${
                        a.isOverworked
                          ? 'text-[#ff6b6b] bg-[#ff6b6b]/15 px-1.5 py-0.5 rounded'
                          : 'text-white'
                      }`}
                      title={a.isOverworked ? 'Mais de 44h/semana: risco de horas extras CLT' : ''}
                    >
                      {a.horasSemanais.toFixed(1)}h
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        a.valorHora >= 30
                          ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                          : a.valorHora >= 25
                          ? 'bg-[#ffd166]/15 text-[#ffd166]'
                          : 'bg-[#222232] text-[#9090aa]'
                      }`}
                    >
                      {fmt(a.valorHora)}/h
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {a.concentracaoPct >= 50 ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#ff6b6b]/15 border border-[#ff6b6b]/40 text-[#ff6b6b] text-[11px] font-bold"
                        title={`R$ ${a.topRedeVal.toFixed(2)} faturado em ${a.topRedeName}`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {a.concentracaoPct.toFixed(0)}% · {a.topRedeName}
                      </span>
                    ) : a.concentracaoPct >= 35 ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#ffd166]/15 border border-[#ffd166]/40 text-[#ffd166] text-[11px] font-medium"
                        title={`R$ ${a.topRedeVal.toFixed(2)} em ${a.topRedeName}`}
                      >
                        {a.concentracaoPct.toFixed(0)}% · {a.topRedeName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00d4aa]/10 text-[#00d4aa] text-[11px] font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Diversificado
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                        <div
                          className="h-full bg-[#a78bfa] rounded-full"
                          style={{ width: `${(a.valor / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#9090aa] w-10 text-right">
                        {a.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#00d4aa] font-mono">
                    {fmt(a.valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-[#161622] font-bold text-white border-t-2 border-[#6c63ff]/40">
            <tr>
              <td colSpan={4} className="py-3 px-4 text-[#a78bfa]">
                Total Geral dos Promotores
              </td>
              <td className="py-3 px-4 text-center font-mono text-white">
                {totalHorasGeral.toFixed(1)}h
              </td>
              <td className="py-3 px-4 text-center font-mono text-[#00d4aa]">
                {fmt(mediaHoraGeral)}/h
              </td>
              <td className="py-3 px-4 text-center font-semibold text-[#ff6b6b]">
                {concentradosQtd} promotores com risco ≥50%
              </td>
              <td className="py-3 px-4 text-right font-mono text-[#a78bfa]">
                100%
              </td>
              <td className="py-3 px-4 text-right font-bold font-mono text-[#00d4aa]">
                {fmt(totalValorMensal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer strip */}
      <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
        <span>
          Ticket Médio: <strong className="text-white">{fmt(agentsData.length > 0 ? totalValorMensal / agentsData.length : 0)}</strong>/mês
        </span>
        <span className="text-[#ff6b6b]">
          ⚠️ Risco Trabalhista: <strong>{concentradosQtd}</strong> concentrados | <strong>{overworkedQtd}</strong> acima de 44h/sem
        </span>
      </div>
    </div>
  );
};
