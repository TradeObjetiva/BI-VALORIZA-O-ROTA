import React, { useEffect, useState } from 'react';
import { X, FileSpreadsheet, Printer, Check } from 'lucide-react';
import { EXPORT_TABLES, ExportTableId } from '../utils/exportTables';

interface ExportPickerModalProps {
  isOpen: boolean;
  mode: 'excel' | 'pdf';
  onClose: () => void;
  onConfirm: (selected: ExportTableId[]) => void;
}

export const ExportPickerModal: React.FC<ExportPickerModalProps> = ({
  isOpen,
  mode,
  onClose,
  onConfirm,
}) => {
  const [selected, setSelected] = useState<Set<ExportTableId>>(
    () => new Set(EXPORT_TABLES.map((t) => t.id))
  );

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(EXPORT_TABLES.map((t) => t.id)));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allSelected = selected.size === EXPORT_TABLES.length;
  const title = mode === 'excel' ? 'Exportar para Excel' : 'Imprimir / gerar PDF';
  const actionLabel = mode === 'excel' ? 'Baixar Excel' : 'Abrir impressão';

  const toggle = (id: ExportTableId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(EXPORT_TABLES.map((t) => t.id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#14141c] border border-[#2a2a3c] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242434]">
          <div className="flex items-center gap-2">
            {mode === 'excel' ? (
              <FileSpreadsheet className="w-4 h-4 text-[#00d4aa]" />
            ) : (
              <Printer className="w-4 h-4 text-[#a78bfa]" />
            )}
            <h2 className="text-sm font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9090aa] hover:text-white hover:bg-[#1e1e2c]"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#242434] flex items-center justify-between">
          <p className="text-xs text-[#9090aa]">
            Escolha as tabelas. Os filtros atuais do dashboard serão respeitados.
          </p>
          <button
            onClick={toggleAll}
            className="text-[11px] font-semibold text-[#a78bfa] hover:text-white"
          >
            {allSelected ? 'Limpar' : 'Selecionar todas'}
          </button>
        </div>

        <div className="px-3 py-2 max-h-[360px] overflow-y-auto space-y-1">
          {EXPORT_TABLES.map((table) => {
            const active = selected.has(table.id);
            return (
              <label
                key={table.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                  active
                    ? 'bg-[#6c63ff]/15 border border-[#6c63ff]/40'
                    : 'border border-transparent hover:bg-[#1a1a26]'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${
                    active
                      ? 'bg-[#6c63ff] border-[#6c63ff] text-white'
                      : 'border-[#3a3a50] text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={active}
                  onChange={() => toggle(table.id)}
                />
                <span>
                  <span className="block text-xs font-semibold text-white">{table.label}</span>
                  <span className="block text-[11px] text-[#9090aa]">{table.hint}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-[#242434] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium rounded-lg text-[#9090aa] hover:text-white"
          >
            Cancelar
          </button>
          <button
            disabled={selected.size === 0}
            onClick={() => onConfirm(Array.from(selected))}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#6c63ff] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#7c75ff]"
          >
            {actionLabel} ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
};
