import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, RotateCcw, ChevronDown, Check, Search, X } from 'lucide-react';
import { FilterState } from '../types/trade';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[] | null | undefined;
  onChange: (val: string[] | null) => void;
  placeholderAll: string;
  feminine?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholderAll,
  feminine = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Se selected for null ou undefined, significa que TODOS estão selecionados por padrão
  const isAllSelected = selected === null || selected === undefined || selected.length === options.length;
  const currentSelectedSet = useMemo(() => {
    if (isAllSelected) {
      return new Set(options);
    }
    return new Set(selected || []);
  }, [isAllSelected, selected, options]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, search]);

  const handleToggleOption = (opt: string) => {
    const nextSet = new Set(currentSelectedSet);
    if (nextSet.has(opt)) {
      nextSet.delete(opt);
    } else {
      nextSet.add(opt);
    }

    if (nextSet.size === options.length) {
      onChange(null); // Volta para o estado nativo de "todos selecionados"
    } else {
      onChange(Array.from(nextSet));
    }
  };

  const handleSelectAll = () => {
    onChange(null);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  // Texto amigável do botão
  const buttonText = useMemo(() => {
    if (isAllSelected) {
      return `${placeholderAll} (${options.length})`;
    }
    const count = currentSelectedSet.size;
    if (count === 0) {
      return `${feminine ? 'Nenhuma' : 'Nenhum'} (0 de ${options.length})`;
    }
    if (count === 1) {
      return Array.from(currentSelectedSet)[0];
    }
    if (count === 2) {
      return Array.from(currentSelectedSet).join(', ');
    }
    return `${count} de ${options.length} ${feminine ? 'selecionadas' : 'selecionados'}`;
  }, [isAllSelected, currentSelectedSet, options.length, placeholderAll, feminine]);

  const isFilterActive = !isAllSelected;

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      <label className="text-[11px] font-semibold text-[#5a5a75] uppercase tracking-wider block">
        {label}
      </label>

      {/* Botão Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border transition text-left cursor-pointer ${
          isFilterActive
            ? 'bg-[#1e1b38] border-[#6c63ff] text-white shadow-sm shadow-[#6c63ff]/20'
            : 'bg-[#1b1b26] border-[#2b2b3d] text-white hover:border-[#3e3e56]'
        }`}
      >
        <span className="truncate font-medium">{buttonText}</span>
        <div className="flex items-center gap-1 shrink-0">
          {isFilterActive && (
            <span className="w-2 h-2 rounded-full bg-[#6c63ff]" />
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#9090aa] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown com Rolagem, Busca e Ações Rápidas */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161622] border border-[#2e2e42] rounded-2xl shadow-2xl overflow-hidden min-w-[240px] max-w-sm animate-in fade-in duration-150">
          {/* Header com Busca */}
          <div className="p-2.5 border-b border-[#242434] space-y-2 bg-[#12121a]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5a5a75] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Buscar ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1b1b26] border border-[#2e2e40] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5a5a75] focus:outline-none focus:border-[#6c63ff]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a5a75] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Ações Rápidas: Marcar / Desmarcar Todos */}
            <div className="flex items-center justify-between text-[11px] px-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#00d4aa] hover:underline font-semibold cursor-pointer"
              >
                Marcar Todos
              </button>
              <span className="text-[#3e3e56]">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-[#ff6b6b] hover:underline font-semibold cursor-pointer"
              >
                Desmarcar Todos
              </button>
            </div>
          </div>

          {/* Lista com Checkboxes */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#5a5a75]">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = currentSelectedSet.has(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                      checked
                        ? 'bg-[#1e1e2c] text-white'
                        : 'text-[#9090aa] hover:bg-[#1a1a24] hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                        checked
                          ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                          : 'border-[#3a3a4e] bg-[#14141c]'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{opt}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="p-2 px-3 border-t border-[#242434] bg-[#12121a] text-[10px] text-[#5a5a75] flex items-center justify-between">
            <span>
              {currentSelectedSet.size} de {options.length} {feminine ? 'ativas' : 'ativos'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#a78bfa] hover:text-white font-semibold cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, val: any) => void;
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
  const isFiltered = (selected: string[] | null | undefined, totalOptions: number) => {
    return selected !== null && selected !== undefined && selected.length !== totalOptions;
  };

  const activeCount = [
    isFiltered(filters.regioes, options.regioes.length) || Boolean(filters.regiao),
    isFiltered(filters.redes, options.redes.length) || Boolean(filters.rede),
    isFiltered(filters.forms, options.forms.length) || Boolean(filters.form),
    isFiltered(filters.agentes, options.agentes.length) || Boolean(filters.agente),
    isFiltered(filters.freqs, options.freqs.length) || Boolean(filters.freq),
  ].filter(Boolean).length;

  return (
    <div className="bg-[#14141c] border border-[#242434] rounded-2xl p-4 md:p-5 shadow-lg space-y-3.5 mb-6 relative z-30">
      {/* Top bar with count & clear */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6c63ff]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#9090aa]">
            Filtros Dinâmicos
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/40">
              {activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}
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
              className="flex items-center gap-1 text-xs text-[#ff6b6b] hover:text-[#ff8585] transition font-medium px-2.5 py-1 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid com os 5 Seletores Dinâmicos de Seleção Múltipla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Região */}
        <MultiSelectDropdown
          label="Região"
          options={options.regioes}
          selected={filters.regioes}
          onChange={(val) => onFilterChange('regioes', val)}
          placeholderAll="Todas"
          feminine={true}
        />

        {/* 2. Rede */}
        <MultiSelectDropdown
          label="Rede (Varejo / Atacarejo)"
          options={options.redes}
          selected={filters.redes}
          onChange={(val) => onFilterChange('redes', val)}
          placeholderAll="Todas"
          feminine={true}
        />

        {/* 3. Formulário / Marca */}
        <MultiSelectDropdown
          label="Formulário / Marca"
          options={options.forms}
          selected={filters.forms}
          onChange={(val) => onFilterChange('forms', val)}
          placeholderAll="Todos"
          feminine={false}
        />

        {/* 4. Agente / Promotor */}
        <MultiSelectDropdown
          label="Agente / Promotor"
          options={options.agentes}
          selected={filters.agentes}
          onChange={(val) => onFilterChange('agentes', val)}
          placeholderAll="Todos"
          feminine={false}
        />

        {/* 5. Frequência Semanal */}
        <MultiSelectDropdown
          label="Frequência Semanal"
          options={options.freqs}
          selected={filters.freqs}
          onChange={(val) => onFilterChange('freqs', val)}
          placeholderAll="Todas"
          feminine={true}
        />
      </div>
    </div>
  );
};
