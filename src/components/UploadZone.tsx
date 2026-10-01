import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawTradeRow } from '../types/trade';

interface UploadZoneProps {
  onDataLoaded: (rows: RawTradeRow[], fileName: string, isDemo?: boolean) => void;
  onLoadDemo?: () => void;
  onOpenIdeas?: () => void;
  onOpenBasesModal?: () => void;
  hasSavedBases?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onDataLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length === 0) {
          throw new Error('A planilha está vazia.');
        }

        // Find header row: Look for the row with the strongest header signature (contains text labels like AGENTE, REDE, FORM, etc.)
        let headerIdx = -1;
        let maxHeaderScore = 0;

        for (let r = 0; r < Math.min(json.length, 20); r++) {
          const row = json[r];
          if (!Array.isArray(row)) continue;

          let score = 0;
          row.forEach((cell) => {
            if (cell !== null && cell !== undefined) {
              const s = String(cell).trim().toUpperCase();
              if (s.length > 0 && isNaN(Number(s))) {
                score += 1;
                if (
                  ['AGENTE', 'PROMOTOR', 'REDE', 'LOCAL', 'FORM', 'REGIAO', 'VALOR', 'LIDER', 'FREQ', 'DOM', 'SEG', 'RAZAO'].some(
                    (k) => s.includes(k)
                  )
                ) {
                  score += 6;
                }
              }
            }
          });

          if (score > maxHeaderScore) {
            maxHeaderScore = score;
            headerIdx = r;
          }
        }

        // Fallback to first non-empty row if scoring found nothing
        if (headerIdx === -1 || maxHeaderScore < 2) {
          headerIdx = json.findIndex(
            (row) =>
              Array.isArray(row) &&
              row.some(
                (cell) =>
                  cell !== null &&
                  cell !== undefined &&
                  String(cell).trim() !== ''
              )
          );
        }

        if (headerIdx === -1) {
          throw new Error('Nenhum cabeçalho válido encontrado na planilha.');
        }

        const headers = json[headerIdx].map((h: any) => String(h || '').trim());
        const rows: RawTradeRow[] = [];

        for (let r = headerIdx + 1; r < json.length; r++) {
          const rowData = json[r];
          if (
            !Array.isArray(rowData) ||
            !rowData.some(
              (v) => v !== null && v !== undefined && String(v).trim() !== ''
            )
          ) {
            continue;
          }

          const obj: RawTradeRow = {};
          headers.forEach((h, c) => {
            if (!h) return;
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[cellAddr];
            // If cell has formatted text with colon (time) e.g. "03:30", preserve it
            if (cell && cell.w && (cell.w.includes(':') || /\b\d+h\b/i.test(cell.w))) {
              obj[h] = cell.w;
            } else {
              obj[h] = rowData[c] ?? null;
            }
          });
          rows.push(obj);
        }

        if (rows.length === 0) {
          throw new Error('Nenhum registro de dados encontrado na planilha.');
        }

        onDataLoaded(rows, file.name, false);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Erro ao processar o arquivo Excel.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMessage('Erro de leitura do arquivo no navegador.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#6c63ff]/15 via-[#00d4aa]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full flex flex-col items-center text-center relative z-10 space-y-8">
        {/* Header Branding */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1e2c] border border-[#2e2e42] text-xs font-medium text-[#a78bfa]">
            <Sparkles className="w-3.5 h-3.5 text-[#00d4aa]" />
            Inteligência de Trade Marketing & Gestão de Promotores
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#f0f0f5] to-[#a78bfa] bg-clip-text text-transparent">
            BI • Sistema de Valorização
          </h1>

          <p className="text-sm md:text-base text-[#9090aa] max-w-xl mx-auto leading-relaxed">
            Plataforma executiva para análise de valorização de promotores, eficiência em R$/hora, custo por visita, matriz de cobertura e simulações financeiras com IA.
          </p>
        </div>

        {/* Upload Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full p-8 md:p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer relative bg-[#15151e]/80 backdrop-blur-sm ${
            isDragging
              ? 'border-[#6c63ff] bg-[#6c63ff]/10 scale-[1.01]'
              : 'border-[#2a2a3c] hover:border-[#6c63ff]/60 hover:bg-[#181824]'
          } shadow-2xl shadow-black/40`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6c63ff]/20 to-[#00d4aa]/20 border border-[#6c63ff]/30 flex items-center justify-center text-[#6c63ff] group-hover:scale-110 transition-transform">
              {isLoading ? (
                <div className="w-8 h-8 border-3 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-10 h-10 text-[#00d4aa]" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {isLoading ? 'Processando planilha...' : 'Carregar Planilha de Valorização'}
              </h3>
              <p className="text-xs md:text-sm text-[#9090aa]">
                Arraste seu arquivo <span className="text-white font-medium">.xlsx</span> ou <span className="text-white font-medium">.xls</span> aqui, ou clique para selecionar
              </p>
            </div>

            <button
              type="button"
              className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] text-white text-xs md:text-sm font-semibold shadow-lg shadow-[#6c63ff]/30 hover:shadow-[#6c63ff]/50 hover:scale-105 transition-all"
            >
              Selecionar Arquivo no Computador
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 px-5 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-xs font-medium">
            ⚠️ {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};
