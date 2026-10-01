import React, { useState, useMemo } from 'react';
import { Grid3X3, Search, Layers, Clock, DollarSign, Store } from 'lucide-react';
import { MatrixData } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface AgentMatrixGridProps {
  matrixData: MatrixData;
}

type MetricMode = 'valor' | 'locais' | 'horas';

export const AgentMatrixGrid: React.FC<AgentMatrixGridProps> = ({ matrixData }) => {
  const [metric, setMetric] = useState<MetricMode>('valor');
  const [search, setSearch] = useState('');

  const { agents, topRedes } = matrixData;

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) => a.nome.toLowerCase().includes(q) || a.regiao.toLowerCase().includes(q)
    );
  }, [agents, search]);

  // Find max value in matrix for heatmap intensity
  const maxVal = useMemo(() => {
    let max = 1;
    agents.forEach((a) => {
      topRedes.forEach((rd) => {
        const cell = a.redes[rd];
        if (!cell) return;
        const val = metric === 'valor' ? cell.valor : metric === 'locais' ? cell.locaisCount : cell.horas;
        if (val > max) max = val;
      });
    });
    return max;
  }, [agents, topRedes, metric]);

  return (
    <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg mb-6 flex flex-col">
      {/* Header */}
      <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Matriz Agente × Rede — Distribuição & Sobreposição de Cobertura (Bloco 1.6)
            </h3>
            <p className="text-[11px] text-[#9090aa]">
              Visualização em grade cruzada para identificar duplicidade de rota e redes prioritárias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5a5a75] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar promotor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#121218] border border-[#28283a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#6c63ff] w-40 sm:w-48"
            />
          </div>

          {/* Metric Switcher */}
          <div className="flex items-center gap-1 bg-[#121218] p-1 rounded-xl border border-[#28283a]">
            <button
              onClick={() => setMetric('valor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                metric === 'valor'
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'text-[#9090aa] hover:text-white'
              }`}
            >
              R$ Mensal
            </button>
            <button
              onClick={() => setMetric('locais')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                metric === 'locais'
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'text-[#9090aa] hover:text-white'
              }`}
            >
              Qtd Lojas
            </button>
            <button
              onClick={() => setMetric('horas')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                metric === 'horas'
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'text-[#9090aa] hover:text-white'
              }`}
            >
              Horas/Sem
            </button>
          </div>

          <span className="text-[11px] font-semibold text-[#9090aa] px-2 py-1 rounded-lg bg-[#121218]">
            {filteredAgents.length} agentes × {topRedes.length} redes
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[#0d0d12] text-[#9090aa] uppercase text-[10px] tracking-wider z-20 border-b border-[#242434]">
            <tr>
              <th className="py-2.5 px-4 font-bold text-white sticky left-0 bg-[#0d0d12] z-30 min-w-[200px] border-r border-[#242434]">
                Promotor / Agente
              </th>
              {topRedes.map((rd) => (
                <th
                  key={rd}
                  className="py-2.5 px-3 font-semibold text-center whitespace-nowrap min-w-[120px] border-r border-[#1e1e2c]"
                  title={rd}
                >
                  {rd.replace(/SUPERMERCADOS? /i, '').replace(/COMERCIAL /i, '')}
                </th>
              ))}
              <th className="py-2.5 px-4 font-bold text-center text-[#a78bfa] bg-[#1a1a28] min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2c]">
            {filteredAgents.map((a, idx) => (
              <tr key={a.nome} className="hover:bg-[#1a1a26]/40 transition-colors">
                {/* Sticky Agent Cell */}
                <td className="py-2.5 px-4 sticky left-0 bg-[#14141c] z-10 border-r border-[#242434] font-medium text-white whitespace-nowrap">
                  <span className="text-[#5a5a75] font-mono mr-2">{idx + 1}.</span>
                  <span title={a.nome}>{a.nome}</span>
                </td>

                {/* Retailer Cells */}
                {topRedes.map((rd) => {
                  const cell = a.redes[rd];
                  if (!cell || cell.valor === 0) {
                    return (
                      <td
                        key={rd}
                        className="py-2.5 px-3 text-center text-[#404055] font-mono border-r border-[#1a1a24]"
                      >
                        —
                      </td>
                    );
                  }

                  const val =
                    metric === 'valor'
                      ? cell.valor
                      : metric === 'locais'
                      ? cell.locaisCount
                      : cell.horas;

                  const intensity = Math.min(Math.max(val / maxVal, 0.15), 0.85);

                  const displayText =
                    metric === 'valor'
                      ? fmt(val)
                      : metric === 'locais'
                      ? `${val} lj`
                      : `${val.toFixed(1)}h`;

                  return (
                    <td
                      key={rd}
                      className="py-2.5 px-3 text-center font-mono font-semibold border-r border-[#1a1a24] transition-all hover:scale-105 cursor-default"
                      style={{
                        backgroundColor: `rgba(108, 99, 255, ${intensity})`,
                        color: intensity > 0.4 ? '#ffffff' : '#e0e0ff',
                      }}
                      title={`${a.nome} em ${rd}:\n• Faturamento: ${fmt(cell.valor)}/mês\n• Lojas: ${cell.locaisCount}\n• Carga: ${cell.horas.toFixed(1)}h/sem`}
                    >
                      {displayText}
                    </td>
                  );
                })}

                {/* Row Total */}
                <td className="py-2.5 px-4 text-center font-bold font-mono text-[#a78bfa] bg-[#171724]">
                  {metric === 'valor'
                    ? fmt(a.totalVal)
                    : metric === 'locais'
                    ? `${a.totalLoc} lj`
                    : `${a.totalHr.toFixed(1)}h`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
        <span>
          Métrica ativa: <strong className="text-white">{metric === 'valor' ? 'R$ Faturado Mensal' : metric === 'locais' ? 'Quantidade de Lojas' : 'Horas Semanais'}</strong>
        </span>
        <span className="text-[#00d4aa]">
          💡 Dica: Células mais intensas representam maior concentração de tempo ou faturamento.
        </span>
      </div>
    </div>
  );
};
