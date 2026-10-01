import React from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Sparkles,
  SlidersHorizontal,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  fileName: string;
  isDemo: boolean;
  totalRecords: number;
  onReset: () => void;
  onOpenIdeas: () => void;
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
  onOpenAIModal: () => void;
  onOpenBasesModal: () => void;
  onExportExcel: () => void;
  onPrintPDF: () => void;
  onLoadDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  isDemo,
  totalRecords,
  onReset,
  onOpenIdeas,
  onToggleSimulator,
  isSimulatorOpen,
  onOpenAIModal,
  onOpenBasesModal,
  onExportExcel,
  onPrintPDF,
  onLoadDemo,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#121218]/90 backdrop-blur-md border-b border-[#282836] px-4 md:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c63ff] to-[#00d4aa] flex items-center justify-center shadow-lg shadow-[#6c63ff]/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-[#f0f0f5] to-[#a78bfa] bg-clip-text text-transparent">
                  BI Valorização
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/30">
                  TRADE INTELLIGENCE
                </span>
              </div>
              <p className="text-[11px] text-[#9090aa] hidden sm:block">
                Sistema de Gestão & Valorização de Promotores de Vendas
              </p>
            </div>
          </div>

          {/* Active File / Demo Badge */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-[#a78bfa] font-mono">
              {isDemo ? 'Demo Mode' : fileName}
            </span>
          </div>
        </div>

        {/* Center / File Info */}
        <div className="hidden lg:flex items-center gap-3 bg-[#181822] px-3.5 py-1.5 rounded-xl border border-[#2a2a38]">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
            <span className="text-[#9090aa]">Base:</span>
            <span className="font-medium text-white max-w-[200px] truncate" title={fileName}>
              {fileName}
            </span>
            {isDemo && (
              <span className="text-[10px] bg-[#ffd166]/15 text-[#ffd166] px-1.5 py-0.5 rounded font-semibold border border-[#ffd166]/30">
                Demo
              </span>
            )}
            <span className="text-[#5a5a75]">|</span>
            <span className="text-[#9090aa]">{totalRecords} registros</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
          {/* Saved Bases / Cache Button */}
          <button
            onClick={onOpenBasesModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-[#00d4aa] hover:border-[#00d4aa]/50 hover:bg-[#1a1a28] transition shadow-sm"
            title="Gerenciar planilhas fixadas no cache do navegador"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00d4aa]" />
            <span>Bases em Cache</span>
          </button>

          {/* Ideas & Roadmap Button */}
          <button
            onClick={onOpenIdeas}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#ffd166]/20 to-[#f97316]/20 text-[#ffd166] border border-[#ffd166]/40 hover:bg-[#ffd166]/30 transition shadow-sm"
            title="Ver ideias para evolução do sistema"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#ffd166]" />
            <span>Ideias & Roadmap</span>
            <span className="w-2 h-2 rounded-full bg-[#ffd166] animate-ping" />
          </button>

          {/* Simulator Button */}
          <button
            onClick={onToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isSimulatorOpen
                ? 'bg-[#6c63ff] border-[#6c63ff] text-white shadow-lg shadow-[#6c63ff]/30'
                : 'bg-[#1a1a24] border-[#2a2a38] text-[#f0f0f5] hover:border-[#6c63ff]/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Simulador What-If</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAIModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#6c63ff]/25 to-[#00d4aa]/20 border border-[#6c63ff]/50 text-white hover:from-[#6c63ff]/40 hover:to-[#00d4aa]/30 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00d4aa]" />
            <span>IA Diagnóstico</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-[#9090aa] hover:text-white hover:border-[#00d4aa]/50 transition"
            title="Exportar dados consolidados em Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00d4aa]" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={onPrintPDF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-[#9090aa] hover:text-white hover:border-[#6c63ff]/50 transition"
            title="Imprimir ou gerar PDF do dashboard"
          >
            <Printer className="w-3.5 h-3.5 text-[#a78bfa]" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Reset / Change File */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#1a1a24] border border-[#2a2a38] text-[#9090aa] hover:text-[#ff6b6b] hover:border-[#ff6b6b]/40 transition"
            title="Trocar planilha carregada"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
