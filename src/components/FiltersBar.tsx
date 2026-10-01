import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { FilterState } from '../types/trade';

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, val: string) => void;
  onClearFilters: () => void;
  options: {
    forms: string[];
    redes: string[];
    agentes: string[];
    regioes: string[];
    freqs: string[];
  };
  totalFiltered: number;
  totalRecords: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  options,
  totalFiltered,
  totalRecords,
}) => {
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && Boolean(v)).length;

  return (
    <div className="bg-[#14141c] border border-[#242434] rounded-2xl p-4 md:p-5 shadow-lg space-y-3.5 mb-6">
      {/* Top bar with count & clear */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6c63ff]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#9090aa]">
            Filtros Dinâmicos
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/40">
              {activeCount} ativos
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9090aa]">
            Exibindo <strong className="text-white font-semibold">{totalFiltered}</strong> de{' '}
            <strong className="text-white font-semibold">{totalRecords}</strong> linhas
          </span>

          {activeCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 text-xs text-[#ff6b6b] hover:text-[#ff8585] transition font-medium px-2.5 py-1 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/20"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider">
            Região
          </label>
          <select
            value={filters.regiao}
            onChange={(e) => onFilterChange('regiao', e.target.value)}
            className="w-full bg-[#1b1b26] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff] transition cursor-pointer"
          >
            <option value="">Todas ({options.regioes.length})</option>
            {options.regioes.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider">
            Rede {filters.regiao ? '(da região)' : '(Varejo / Atacarejo)'}
          </label>
          <select
            value={filters.rede}
            onChange={(e) => onFilterChange('rede', e.target.value)}
            className="w-full bg-[#1b1b26] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff] transition cursor-pointer"
          >
            <option value="">Todas ({options.redes.length})</option>
            {options.redes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider">
            Formulário / Marca
          </label>
          <select
            value={filters.form}
            onChange={(e) => onFilterChange('form', e.target.value)}
            className="w-full bg-[#1b1b26] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff] transition cursor-pointer"
          >
            <option value="">Todos ({options.forms.length})</option>
            {options.forms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider">
            Agente / Promotor
          </label>
          <select
            value={filters.agente}
            onChange={(e) => onFilterChange('agente', e.target.value)}
            className="w-full bg-[#1b1b26] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff] transition cursor-pointer"
          >
            <option value="">Todos ({options.agentes.length})</option>
            {options.agentes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider">
            Frequência Semanal
          </label>
          <select
            value={filters.freq}
            onChange={(e) => onFilterChange('freq', e.target.value)}
            className="w-full bg-[#1b1b26] border border-[#2b2b3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#6c63ff] transition cursor-pointer"
          >
            <option value="">Todas ({options.freqs.length})</option>
            {options.freqs.map((fr) => (
              <option key={fr} value={fr}>
                {fr}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
