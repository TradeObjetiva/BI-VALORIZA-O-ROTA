import React from 'react';
import {
  SlidersHorizontal,
  TrendingUp,
  Percent,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';
import { SimulationConfig } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface SimulatorPanelProps {
  config: SimulationConfig;
  onChange: (newConfig: SimulationConfig) => void;
  baseValorMensal: number;
  simValorMensal: number;
  baseCustoVisita: number;
  simCustoVisita: number;
  baseValorHora: number;
  simValorHora: number;
  redesList: string[];
  regioesList: string[];
  formsList: string[];
  onClose: () => void;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  config,
  onChange,
  baseValorMensal,
  simValorMensal,
  baseCustoVisita,
  simCustoVisita,
  baseValorHora,
  simValorHora,
  redesList,
  regioesList,
  formsList,
  onClose,
}) => {
  const diffValor = simValorMensal - baseValorMensal;
  const isPositive = diffValor >= 0;

  const presets = [
    { label: '0% Base', val: 0 },
    { label: '+3% Inflação', val: 3 },
    { label: '+6% Dissídio CLT', val: 6 },
    { label: '+10% Renegociação', val: 10 },
    { label: '+15% Expansão', val: 15 },
    { label: '-5% Otimização', val: -5 },
  ];

  const handlePercentageChange = (pct: number) => {
    onChange({
      ...config,
      active: pct !== 0,
      percentage: pct,
    });
  };

  const handleScopeTypeChange = (type: SimulationConfig['scopeType']) => {
    let initialValue = '';
    if (type === 'rede' && redesList.length > 0) initialValue = redesList[0];
    if (type === 'regiao' && regioesList.length > 0) initialValue = regioesList[0];
    if (type === 'form' && formsList.length > 0) initialValue = formsList[0];

    onChange({
      ...config,
      scopeType: type,
      scopeValue: initialValue,
    });
  };

  return (
    <div className="bg-gradient-to-br from-[#161622] via-[#12121a] to-[#181826] border border-[#6c63ff]/40 rounded-3xl p-5 md:p-6 mb-6 shadow-2xl relative overflow-hidden transition-all">
      {/* Top Gradient Stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6c63ff] via-[#00d4aa] to-[#ffd166]" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#262636]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6c63ff]/20 border border-[#6c63ff]/40 flex items-center justify-center text-[#a78bfa]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Simulador Financeiro What-If & Renegociação de Tabela
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
              CENÁRIOS EM TEMPO REAL
            </span>
          </div>
          <p className="text-xs text-[#9090aa] mt-1">
            Simule reajustes contratuais, repasses de dissídio ou cortes e veja o impacto instantâneo no faturamento e tarifas.
          </p>
        </div>

        {/* Scope Selection */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <span className="text-xs text-[#9090aa] font-medium">Aplicar em:</span>
          <select
            value={config.scopeType}
            onChange={(e) => handleScopeTypeChange(e.target.value as any)}
            className="bg-[#1e1e2c] border border-[#2e2e42] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
          >
            <option value="todos">Toda a Operação (Global)</option>
            <option value="rede">Rede Específica</option>
            <option value="regiao">Região Específica</option>
            <option value="form">Marca / Formulário Específico</option>
          </select>

          {/* Scope target dropdown */}
          {config.scopeType === 'rede' && (
            <select
              value={config.scopeValue}
              onChange={(e) => onChange({ ...config, scopeValue: e.target.value })}
              className="bg-[#1e1e2c] border border-[#2e2e42] rounded-xl px-3 py-1.5 text-xs text-[#00d4aa] font-medium focus:outline-none focus:border-[#6c63ff]"
            >
              {redesList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {config.scopeType === 'regiao' && (
            <select
              value={config.scopeValue}
              onChange={(e) => onChange({ ...config, scopeValue: e.target.value })}
              className="bg-[#1e1e2c] border border-[#2e2e42] rounded-xl px-3 py-1.5 text-xs text-[#00d4aa] font-medium focus:outline-none focus:border-[#6c63ff]"
            >
              {regioesList.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          )}

          {config.scopeType === 'form' && (
            <select
              value={config.scopeValue}
              onChange={(e) => onChange({ ...config, scopeValue: e.target.value })}
              className="bg-[#1e1e2c] border border-[#2e2e42] rounded-xl px-3 py-1.5 text-xs text-[#00d4aa] font-medium focus:outline-none focus:border-[#6c63ff]"
            >
              {formsList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handlePercentageChange(0)}
            className="p-1.5 text-xs rounded-lg bg-[#222232] text-[#9090aa] hover:text-white transition"
            title="Resetar simulação"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulator Controls & Real-Time Impact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-center">
        {/* Slider & Presets (7 cols) */}
        <div className="lg:col-span-7 bg-[#171724] border border-[#262638] rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9090aa] uppercase tracking-wider">
              Ajuste Percentual da Tabela
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-black ${
                  config.percentage > 0
                    ? 'text-[#00d4aa]'
                    : config.percentage < 0
                    ? 'text-[#ff6b6b]'
                    : 'text-white'
                }`}
              >
                {config.percentage > 0 ? `+${config.percentage}%` : `${config.percentage}%`}
              </span>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="-20"
            max="30"
            step="1"
            value={config.percentage}
            onChange={(e) => handlePercentageChange(Number(e.target.value))}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-[#ff6b6b] via-[#6c63ff] to-[#00d4aa] accent-white"
          />

          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-[#5a5a75] mr-1">Presets rápidos:</span>
            {presets.map((p) => (
              <button
                key={p.val}
                onClick={() => handlePercentageChange(p.val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  config.percentage === p.val
                    ? 'bg-[#6c63ff] text-white shadow-sm'
                    : 'bg-[#20202e] border border-[#2e2e42] text-[#9090aa] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Impact Comparison Cards (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          {/* Novo Valor Mensal */}
          <div className="bg-[#171724] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#9090aa] tracking-wider">
              Novo Faturamento Mensal
            </span>
            <div className="text-lg md:text-xl font-extrabold text-white">
              {fmt(simValorMensal)}
            </div>
            <div
              className={`text-xs font-bold flex items-center gap-1 ${
                isPositive ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
              }`}
            >
              {isPositive ? `+${fmt(diffValor)}` : fmt(diffValor)} / mês
            </div>
          </div>

          {/* Custo Médio por Visita */}
          <div className="bg-[#171724] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#9090aa] tracking-wider">
              Novo Custo Médio / Visita
            </span>
            <div className="text-lg md:text-xl font-extrabold text-[#00d4aa]">
              {fmt(simCustoVisita)}
            </div>
            <div className="text-xs text-[#9090aa]">
              Base anterior: {fmt(baseCustoVisita)}
            </div>
          </div>

          {/* R$ / Hora */}
          <div className="bg-[#171724] border border-[#262638] rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#9090aa] tracking-wider">
              Nova Tarifa / Hora Média
            </span>
            <div className="text-lg md:text-xl font-extrabold text-[#60a5fa]">
              {fmt(simValorHora)}/h
            </div>
            <div className="text-xs text-[#9090aa]">
              Base anterior: {fmt(baseValorHora)}/h
            </div>
          </div>

          {/* Status Badge */}
          <div className="bg-[#171724] border border-[#262638] rounded-2xl p-3.5 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-bold uppercase text-[#9090aa] tracking-wider mb-1">
              Status do Cenário
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                config.active && config.percentage !== 0
                  ? 'bg-[#6c63ff]/20 text-[#a78bfa] border-[#6c63ff]/40'
                  : 'bg-[#222230] text-[#9090aa] border-[#333344]'
              }`}
            >
              {config.active && config.percentage !== 0 ? 'Cenário Ativo no BI' : 'Modo Original'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
