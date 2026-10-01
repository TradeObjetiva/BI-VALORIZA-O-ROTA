import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  column: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (column: string) => void;
  align?: 'left' | 'right' | 'center';
}

export function toggleSort(
  currentKey: string,
  currentDir: SortDir,
  column: string,
  defaultDir: SortDir = 'desc'
): { key: string; dir: SortDir } {
  if (currentKey === column) {
    return { key: column, dir: currentDir === 'asc' ? 'desc' : 'asc' };
  }
  return { key: column, dir: defaultDir };
}

export function compareValues(
  a: string | number,
  b: string | number,
  dir: SortDir
): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * mul;
  }
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' }) * mul;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}) => {
  const active = sortKey === column;
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justify =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <th
      className={`py-2.5 px-4 font-semibold ${alignClass} cursor-pointer select-none hover:text-white transition-colors`}
      onClick={() => onSort(column)}
      title="Clique para ordenar"
    >
      <span className={`inline-flex items-center gap-1 ${justify} w-full`}>
        {label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-[#a78bfa]" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#a78bfa]" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-35" />
        )}
      </span>
    </th>
  );
};
