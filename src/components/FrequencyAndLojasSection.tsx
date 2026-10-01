import React, { useMemo, useState } from 'react';
import { Layers, Calendar, BarChart3, CheckCircle2 } from 'lucide-react';
import { fmtNumber } from '../utils/tradeCalculations';
import { SortableTh, SortDir, compareValues, toggleSort } from './SortableTh';

interface FrequencyAndLojasSectionProps {
  lojasAnalysis: {
    distrib: Record<number, number>;
    totalLojas: number;
    maxForms: number;
    mediaFormsPorLoja: number;
  };
  freqAnalysis: {
    allFreqs: string[];
    sortedForms: string[];
    matrix: Record<string, Record<string, { records: number; lojas: Set<string> }>>;
    freqTotals: Record<string, number>;
  };
}

export const FrequencyAndLojasSection: React.FC<FrequencyAndLojasSectionProps> = ({
  lojasAnalysis,
  freqAnalysis,
}) => {
  const { distrib, totalLojas, maxForms, mediaFormsPorLoja } = lojasAnalysis;
  const { allFreqs, sortedForms, matrix, freqTotals } = freqAnalysis;

  const FREQ_COLORS: Record<string, string> = {
    '1X': '#6c63ff',
    '2X': '#00d4aa',
    '3X': '#ffd166',
    '4X': '#38bdf8',
    '5X': '#ff6b6b',
    '15/15': '#a78bfa',
  };

  const [lojaSort, setLojaSort] = useState<{ key: string; dir: SortDir }>({
    key: 'n',
    dir: 'asc',
  });
  const [freqSort, setFreqSort] = useState<{ key: string; dir: SortDir }>({
    key: 'form',
    dir: 'asc',
  });

  const lojaRows = useMemo(() => {
    const rows = Array.from({ length: maxForms }, (_, i) => i + 1)
      .map((n) => {
        const count = distrib[n] || 0;
        const pct = totalLojas > 0 ? (count / totalLojas) * 100 : 0;
        return { n, count, pct };
      })
      .filter((row) => row.count > 0);

    return rows.sort((a, b) => {
      const mapA: Record<string, number> = { n: a.n, count: a.count, pct: a.pct };
      const mapB: Record<string, number> = { n: b.n, count: b.count, pct: b.pct };
      return compareValues(mapA[lojaSort.key], mapB[lojaSort.key], lojaSort.dir);
    });
  }, [distrib, maxForms, totalLojas, lojaSort]);

  const freqRows = useMemo(() => {
    const rows = sortedForms.map((form) => {
      const totals = allFreqs.reduce(
        (acc, f) => {
          const cell = matrix[form]?.[f];
          const lojas = cell ? cell.lojas.size : 0;
          acc.byFreq[f] = { lojas, recs: cell ? cell.records : 0 };
          acc.rowTotal += lojas;
          return acc;
        },
        { byFreq: {} as Record<string, { lojas: number; recs: number }>, rowTotal: 0 }
      );
      return { form, ...totals };
    });

    return rows.sort((a, b) => {
      if (freqSort.key === 'form') return compareValues(a.form, b.form, freqSort.dir);
      if (freqSort.key === 'total') return compareValues(a.rowTotal, b.rowTotal, freqSort.dir);
      const fa = a.byFreq[freqSort.key]?.lojas || 0;
      const fb = b.byFreq[freqSort.key]?.lojas || 0;
      return compareValues(fa, fb, freqSort.dir);
    });
  }, [sortedForms, allFreqs, matrix, freqSort]);

  const formDistribColors = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b', '#a78bfa'];

  const maxLojasCount = Math.max(...Object.values(distrib), 1);
  const grandTotalFreq = Object.values(freqTotals).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 mb-6">
      {/* 1. Distribuição de Lojas por Qtd de Formulários */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Distribuição de Lojas por Quantidade de Formulários / Marcas
              </h3>
              <p className="text-[11px] text-[#9090aa]">
                Análise de densidade de atendimento por ponto de venda (Sinergia de Rota)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#9090aa] px-2.5 py-0.5 rounded-lg bg-[#121218]">
            {totalLojas} lojas totais
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434]">
              <tr>
                <SortableTh
                  label="Nº de Formulários / Marcas por Loja"
                  column="n"
                  sortKey={lojaSort.key}
                  sortDir={lojaSort.dir}
                  onSort={(col) => setLojaSort((s) => toggleSort(s.key, s.dir, col, 'asc'))}
                />
                <SortableTh
                  label="Qtd de Lojas"
                  column="count"
                  sortKey={lojaSort.key}
                  sortDir={lojaSort.dir}
                  onSort={(col) => setLojaSort((s) => toggleSort(s.key, s.dir, col))}
                  align="right"
                />
                <SortableTh
                  label="% do Total"
                  column="pct"
                  sortKey={lojaSort.key}
                  sortDir={lojaSort.dir}
                  onSort={(col) => setLojaSort((s) => toggleSort(s.key, s.dir, col))}
                  align="right"
                />
                <th className="py-2.5 px-4 font-semibold text-right">Proporção Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {lojaRows.map((row) => {
                const color = formDistribColors[(row.n - 1) % formDistribColors.length];

                return (
                  <tr key={row.n} className="hover:bg-[#1a1a26]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold mr-2.5"
                        style={{
                          backgroundColor: `${color}25`,
                          color: color,
                        }}
                      >
                        {row.n}x
                      </span>
                      {row.n === 1 ? '1 formulário por loja' : `${row.n} formulários por loja`}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white text-sm font-mono">
                      {row.count.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right text-[#9090aa] font-mono">
                      {row.pct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-32 h-2 rounded-full bg-[#1b1b26] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(row.count / maxLojasCount) * 100}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#161622] font-bold text-white border-t border-[#242434]">
              <tr>
                <td className="py-2.5 px-4 text-[#a78bfa]">Total de Lojas Mapeadas</td>
                <td className="py-2.5 px-4 text-right font-mono text-[#00d4aa]">
                  {totalLojas.toLocaleString('pt-BR')}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-[#a78bfa]">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
          <span>
            Média de formulários por PDV: <strong className="text-white">{mediaFormsPorLoja.toFixed(2)}</strong>
          </span>
          <span className="text-[#ffd166]">
            💡 Oportunidade: Lojas com apenas 1 marca podem absorver marcas adicionais com ganho de escala.
          </span>
        </div>
      </div>

      {/* 2. Formulários × Frequência Semanal */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl overflow-hidden shadow-lg flex flex-col">
        <div className="p-4 px-5 bg-[#1a1a24] border-b border-[#242434] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffd166]" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Formulários × Frequência Semanal — Detalhamento por Marca
              </h3>
              <p className="text-[11px] text-[#9090aa]">
                Cruzamento de lojas visitadas por nível de frequência semanal
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#9090aa] px-2.5 py-0.5 rounded-lg bg-[#121218]">
            {sortedForms.length} marcas × {allFreqs.length} frequências
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#0f0f15] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434] z-10">
              <tr>
                <SortableTh
                  label="Formulário / Marca"
                  column="form"
                  sortKey={freqSort.key}
                  sortDir={freqSort.dir}
                  onSort={(col) => setFreqSort((s) => toggleSort(s.key, s.dir, col, 'asc'))}
                />
                {allFreqs.map((f) => (
                  <SortableTh
                    key={f}
                    label={f}
                    column={f}
                    sortKey={freqSort.key}
                    sortDir={freqSort.dir}
                    onSort={(col) => setFreqSort((s) => toggleSort(s.key, s.dir, col))}
                    align="center"
                  />
                ))}
                <SortableTh
                  label="Total Lojas"
                  column="total"
                  sortKey={freqSort.key}
                  sortDir={freqSort.dir}
                  onSort={(col) => setFreqSort((s) => toggleSort(s.key, s.dir, col))}
                  align="right"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {freqRows.map((row, idx) => {
                const shortForm = row.form.replace(/PESQUISA /i, '');

                return (
                  <tr key={row.form} className="hover:bg-[#1a1a26]/60 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-white max-w-[240px] truncate" title={row.form}>
                      <span className="text-[#5a5a75] font-mono mr-2">{idx + 1}.</span>
                      {shortForm}
                    </td>

                    {allFreqs.map((f) => {
                      const cell = row.byFreq[f];
                      const lojas = cell?.lojas || 0;
                      const recs = cell?.recs || 0;
                      const color = FREQ_COLORS[f] || '#9090aa';

                      if (lojas > 0) {
                        return (
                          <td key={f} className="py-2.5 px-3 text-center">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded-md font-bold text-xs"
                              style={{
                                backgroundColor: `${color}20`,
                                color: color,
                              }}
                              title={`${recs} visitas semanais contratadas`}
                            >
                              {lojas}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={f} className="py-2.5 px-3 text-center text-[#404055] font-mono">
                          —
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-4 text-right font-bold text-white font-mono">
                      {row.rowTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#161622] font-bold text-white border-t-2 border-[#6c63ff]/40">
              <tr>
                <td className="py-2.5 px-4 text-[#a78bfa]">Total por Frequência</td>
                {allFreqs.map((f) => {
                  const cnt = freqTotals[f] || 0;
                  const color = FREQ_COLORS[f] || '#9090aa';
                  return (
                    <td
                      key={f}
                      className="py-2.5 px-3 text-center font-bold font-mono"
                      style={{ color }}
                    >
                      {cnt.toLocaleString('pt-BR')}
                    </td>
                  );
                })}
                <td className="py-2.5 px-4 text-right font-mono text-[#00d4aa]">
                  {grandTotalFreq.toLocaleString('pt-BR')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 px-5 bg-[#0f0f15] border-t border-[#242434] text-xs text-[#9090aa] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {allFreqs.map((f) => (
              <span key={f} className="flex items-center gap-1 font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: FREQ_COLORS[f] || '#9090aa' }}
                />
                <span className="font-semibold text-white">{f}:</span>{' '}
                <span>{(freqTotals[f] || 0).toLocaleString('pt-BR')} registros</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
