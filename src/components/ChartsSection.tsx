import React from 'react';
import { PieChart, BarChart2, Layers } from 'lucide-react';
import { RegiaoMetrics, FormMetrics } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface ChartsSectionProps {
  regioesData: RegiaoMetrics[];
  formsData: FormMetrics[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  regioesData,
  formsData,
}) => {
  const topRegioes = regioesData.slice(0, 6);
  const totalRegioesVal = regioesData.reduce((s, r) => s + r.value, 0);

  const topForms = formsData.slice(0, 7);
  const maxFormVal = topForms[0]?.value || 1;

  const regiaoColors = [
    '#6c63ff',
    '#00d4aa',
    '#ffd166',
    '#ff6b6b',
    '#a78bfa',
    '#60a5fa',
    '#f97316',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Gráfico 1: Valor Mensal por Região */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-[#242434]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#6c63ff]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Distribuição Financeira por Região
            </h3>
          </div>
          <span className="text-[11px] text-[#9090aa]">Share Regional</span>
        </div>

        {/* Visual Bar Stack & Breakdown */}
        <div className="py-4 space-y-3">
          {/* Segmented Bar */}
          <div className="w-full h-4 rounded-xl bg-[#1b1b28] overflow-hidden flex shadow-inner">
            {topRegioes.map((reg, i) => (
              <div
                key={reg.label}
                style={{
                  width: `${(reg.value / totalRegioesVal) * 100}%`,
                  backgroundColor: regiaoColors[i % regiaoColors.length],
                }}
                className="h-full transition-all duration-500 first:rounded-l-xl last:rounded-r-xl"
                title={`${reg.label}: ${fmt(reg.value)} (${reg.pct.toFixed(1)}%)`}
              />
            ))}
          </div>

          {/* Region details list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {topRegioes.map((reg, i) => (
              <div
                key={reg.label}
                className="flex items-center justify-between p-2 rounded-xl bg-[#171722] border border-[#242434]"
              >
                <div className="flex items-center gap-2 truncate max-w-[150px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: regiaoColors[i % regiaoColors.length] }}
                  />
                  <span className="text-xs font-medium text-white truncate" title={reg.label}>
                    {reg.label}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[#00d4aa] font-mono">
                    {fmt(reg.value)}
                  </div>
                  <div className="text-[10px] text-[#5a5a75] font-mono">
                    {reg.pct.toFixed(1)}% do total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-[11px] text-[#5a5a75] text-right">
          Total Regional: <strong className="text-white">{fmt(totalRegioesVal)}</strong>
        </div>
      </div>

      {/* Gráfico 2: Top Marcas / Formulários */}
      <div className="bg-[#14141c] border border-[#242434] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-[#242434]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d4aa]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Top Marcas / Formulários por Faturamento
            </h3>
          </div>
          <span className="text-[11px] text-[#9090aa]">Ranking de Marcas</span>
        </div>

        {/* Horizontal Bars */}
        <div className="py-3 space-y-2.5">
          {topForms.map((form, i) => {
            const shortName = form.label.replace(/PESQUISA /i, '');
            const pctBar = (form.value / maxFormVal) * 100;

            return (
              <div key={form.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white truncate max-w-[240px]" title={form.label}>
                    <span className="text-[#5a5a75] font-mono mr-1.5">{i + 1}.</span>
                    {shortName}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#9090aa] text-[11px]">{form.pct.toFixed(1)}%</span>
                    <span className="font-bold text-[#00d4aa]">{fmt(form.value)}</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1b1b28] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#6c63ff] to-[#00d4aa]"
                    style={{ width: `${pctBar}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-[11px] text-[#5a5a75] text-right">
          Exibindo as <strong>{topForms.length}</strong> maiores marcas da carteira
        </div>
      </div>
    </div>
  );
};
