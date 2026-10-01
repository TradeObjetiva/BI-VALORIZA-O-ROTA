import React from 'react';
import { RedeMetrics, RegiaoMetrics } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface RedeRegiaoTablesProps {
  redesData: RedeMetrics[];
  regioesData: RegiaoMetrics[];
  totalValorMensal: number;
}

export const RedeRegiaoTables: React.FC<RedeRegiaoTablesProps> = ({
  redesData,
  regioesData,
  totalValorMensal,
}) => {
  const maxRede = redesData[0]?.value || 1;
  const maxRegiao = regioesData[0]?.value || 1;

  const colors = [
    '#6c63ff',
    '#00d4aa',
    '#ffd166',
    '#ff6b6b',
    '#a78bfa',
    '#60a5fa',
    '#f97316',
    '#ec4899',
    '#10b981',
    '#06b6d4',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Tabela Redes */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffd166]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Redes de Varejo / Atacarejo
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#9090aa] px-2 py-0.5 rounded-lg bg-[#121218]">
            {redesData.length} redes
          </span>
        </div>

        <div className="overflow-y-auto max-h-[360px] flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">#</th>
                <th className="py-2.5 px-4 font-semibold">Rede</th>
                <th className="py-2.5 px-4 font-semibold text-right">Valor Mensal</th>
                <th className="py-2.5 px-4 font-semibold text-right">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {redesData.map((r, i) => (
                <tr key={r.label} className="hover:bg-[#1a1a26]/60 transition-colors">
                  <td className="py-2.5 px-4 text-[#5a5a75] font-mono font-medium">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold ${
                        i === 0
                          ? 'bg-[#ffd166]/20 text-[#ffd166]'
                          : i === 1
                          ? 'bg-[#94a3b8]/20 text-[#94a3b8]'
                          : i === 2
                          ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
                          : 'text-[#5a5a75]'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-white max-w-[200px] truncate" title={r.label}>
                    {r.label}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#00d4aa] font-mono">
                    {fmt(r.value)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(r.value / maxRede) * 100}%`,
                            backgroundColor: colors[i % colors.length],
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9090aa] font-mono w-11 text-right">
                        {r.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#161622] font-bold text-white border-t-2 border-[#6c63ff]/40">
              <tr>
                <td colSpan={2} className="py-2.5 px-4 text-[#a78bfa]">
                  Total Mensal Redes
                </td>
                <td className="py-2.5 px-4 text-right text-[#00d4aa] font-mono">
                  {fmt(totalValorMensal)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[#a78bfa]">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between">
          <span>Líder: <strong className="text-white">{redesData[0]?.label || '—'}</strong></span>
          <span>Redes: <strong className="text-white">{redesData.length}</strong></span>
        </div>
      </div>

      {/* Tabela Regiões */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Regiões Geográficas
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#9090aa] px-2 py-0.5 rounded-lg bg-[#121218]">
            {regioesData.length} regiões
          </span>
        </div>

        <div className="overflow-y-auto max-h-[360px] flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">#</th>
                <th className="py-2.5 px-4 font-semibold">Região</th>
                <th className="py-2.5 px-4 font-semibold text-right">Valor Mensal</th>
                <th className="py-2.5 px-4 font-semibold text-right">% Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {regioesData.map((reg, i) => (
                <tr key={reg.label} className="hover:bg-[#1a1a26]/60 transition-colors">
                  <td className="py-2.5 px-4 text-[#5a5a75] font-mono font-medium">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold ${
                        i === 0
                          ? 'bg-[#ffd166]/20 text-[#ffd166]'
                          : i === 1
                          ? 'bg-[#94a3b8]/20 text-[#94a3b8]'
                          : i === 2
                          ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
                          : 'text-[#5a5a75]'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-white max-w-[200px] truncate" title={reg.label}>
                    {reg.label}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#00d4aa] font-mono">
                    {fmt(reg.value)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#1b1b26] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(reg.value / maxRegiao) * 100}%`,
                            backgroundColor: colors[i % colors.length],
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9090aa] font-mono w-11 text-right">
                        {reg.pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#161622] font-bold text-white border-t-2 border-[#6c63ff]/40">
              <tr>
                <td colSpan={2} className="py-2.5 px-4 text-[#a78bfa]">
                  Total Mensal Regiões
                </td>
                <td className="py-2.5 px-4 text-right text-[#00d4aa] font-mono">
                  {fmt(totalValorMensal)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[#a78bfa]">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between">
          <span>Líder: <strong className="text-white">{regioesData[0]?.label || '—'}</strong></span>
          <span>Regiões: <strong className="text-white">{regioesData.length}</strong></span>
        </div>
      </div>
    </div>
  );
};
