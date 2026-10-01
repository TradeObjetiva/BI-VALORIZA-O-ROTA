import React, { useState } from 'react';
import {
  X,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Route,
  Sparkles,
  Calculator,
  Grid3X3,
  FileSpreadsheet,
  CheckCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { STRATEGIC_IDEAS } from '../data/strategicIdeas';
import { StrategicIdea } from '../types/trade';

interface IdeasRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateIdea?: (ideaId: string) => void;
}

export const IdeasRoadmapModal: React.FC<IdeasRoadmapModalProps> = ({
  isOpen,
  onClose,
  onActivateIdea,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  if (!isOpen) return null;

  const categories = [
    { id: 'todos', label: 'Todas as Ideias' },
    { id: 'financeiro', label: 'Rentabilidade & Tabela' },
    { id: 'compliance', label: 'Compliance & CLT' },
    { id: 'roteirizacao', label: 'Roteirização & Sinergia' },
    { id: 'ia', label: 'Inteligência Artificial' },
    { id: 'bi', label: 'B.I. & Visualização' },
  ];

  const filteredIdeas =
    selectedCategory === 'todos'
      ? STRATEGIC_IDEAS
      : STRATEGIC_IDEAS.filter((i) => i.categoria === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12121a] border border-[#2b2b3d] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#ffd166] via-[#6c63ff] to-[#00d4aa]" />

        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-[#242436] flex items-center justify-between gap-4 bg-[#161622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffd166]/20 to-[#f97316]/20 border border-[#ffd166]/40 flex items-center justify-center text-[#ffd166]">
              <Lightbulb className="w-5 h-5 text-[#ffd166]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                  Banco de Ideias & Roadmap Estratégico
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffd166]/15 text-[#ffd166] border border-[#ffd166]/30">
                  CONSULTORIA DE TRADE
                </span>
              </div>
              <p className="text-xs text-[#9090aa]">
                Análise aprofundada do seu sistema de valorização e oportunidades de alto impacto para a Objetiva Mkt
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#20202e] border border-[#2e2e42] flex items-center justify-center text-[#9090aa] hover:text-white hover:bg-[#28283a] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Executive Feedback Banner */}
        <div className="p-4 px-6 bg-[#181826] border-b border-[#242436] text-xs text-[#b0b0c5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span>
              <strong className="text-white">Diagnóstico da sua base:</strong> O seu cálculo com fator 52/12 é excelente! As 5 grandes oportunidades abaixo transformam a planilha de um visualizador passivo em uma máquina de rentabilidade e governança de campo.
            </span>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="p-3 px-6 bg-[#14141e] border-b border-[#242436] flex items-center gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-[#6c63ff] text-white shadow-sm'
                  : 'bg-[#1b1b28] text-[#9090aa] hover:text-white border border-[#2a2a3c]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Ideas Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIdeas.map((idea) => {
              return (
                <div
                  key={idea.id}
                  className="bg-[#171724] border border-[#262638] rounded-2xl p-5 hover:border-[#6c63ff]/50 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Card Top */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#6c63ff]/15 text-[#a78bfa] border border-[#6c63ff]/30">
                        {idea.badge}
                      </span>
                      <span className="text-[11px] font-semibold text-[#00d4aa]">
                        {idea.kpiAlvo}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#ffd166] transition-colors">
                      {idea.titulo}
                    </h3>

                    {/* Problem */}
                    <div className="space-y-1 bg-[#12121a] p-2.5 rounded-xl border border-[#20202e] text-[11px]">
                      <span className="font-bold text-[#ff6b6b] uppercase text-[10px] block">
                        Desafio Atual:
                      </span>
                      <p className="text-[#9090aa] leading-relaxed">
                        {idea.problemaAtual}
                      </p>
                    </div>

                    {/* Solution */}
                    <div className="space-y-1 bg-[#12121a] p-2.5 rounded-xl border border-[#20202e] text-[11px]">
                      <span className="font-bold text-[#00d4aa] uppercase text-[10px] block">
                        Solução Implementável:
                      </span>
                      <p className="text-[#e0e0ed] leading-relaxed">
                        {idea.solucaoProposta}
                      </p>
                    </div>
                  </div>

                  {/* Impact & Mechanics */}
                  <div className="pt-2 border-t border-[#222232] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9090aa]">Impacto Esperado:</span>
                      <span className="font-bold text-[#ffd166]">{idea.impactoEsperado}</span>
                    </div>
                    <div className="text-[#5a5a75] text-[10px]">
                      Como fazer: {idea.comoImplementar}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-[#161622] border-t border-[#242436] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9090aa]">
          <span>
            Todas as ideias acima foram modeladas pensando na realidade de agências de Trade Marketing (como Objetiva Mkt).
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#6c63ff] hover:bg-[#7c73ff] text-white font-semibold transition"
          >
            Fechar e Explorar o Sistema
          </button>
        </div>
      </div>
    </div>
  );
};
