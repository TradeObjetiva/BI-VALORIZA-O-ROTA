import React from 'react';
import {
  DollarSign,
  Users,
  MapPin,
  Car,
  Clock,
  Store,
  FileText,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { KPIData } from '../types/trade';
import { fmt } from '../utils/tradeCalculations';

interface KPISectionProps {
  kpis: KPIData;
  isSimulated?: boolean;
}

export const KPISection: React.FC<KPISectionProps> = ({ kpis, isSimulated }) => {
  const cards = [
    {
      id: 'valor-mensal',
      label: 'Valor Mensal Total',
      value: fmt(kpis.valorMensalTotal),
      sub: 'Base: semanal × 52/12',
      icon: DollarSign,
      color: 'from-[#6c63ff] to-[#8b5cf6]',
      textAccent: 'text-[#a78bfa]',
      badge: isSimulated ? 'Simulado' : undefined,
    },
    {
      id: 'agentes-ativos',
      label: 'Promotores Ativos',
      value: kpis.agentesAtivos,
      sub: `${kpis.agentesConcentradosQtd} com concentração ≥50%`,
      icon: Users,
      color: 'from-[#00d4aa] to-[#059669]',
      textAccent: 'text-[#00d4aa]',
      alert: kpis.agentesConcentradosQtd > 0,
    },
    {
      id: 'locais-unicos',
      label: 'Locais / PDVs Únicos',
      value: kpis.locaisUnicos,
      sub: 'Lojas sem duplicação',
      icon: MapPin,
      color: 'from-[#ffd166] to-[#f97316]',
      textAccent: 'text-[#ffd166]',
    },
    {
      id: 'custo-visita',
      label: 'Custo Médio / Visita',
      value: fmt(kpis.custoMedioVisita),
      sub: `${kpis.totalVisitasSemanais.toFixed(1)} visitas/sem (Bloco 2.3)`,
      icon: Car,
      color: 'from-[#00d4aa] to-[#38bdf8]',
      textAccent: 'text-[#00d4aa]',
    },
    {
      id: 'valor-hora',
      label: 'R$ / Hora Médio',
      value: `${fmt(kpis.valorPorHoraMedio)}/h`,
      sub: `${kpis.totalHorasSemanais.toFixed(0)}h/sem contratadas (Bloco 1.3)`,
      icon: Clock,
      color: 'from-[#60a5fa] to-[#3b82f6]',
      textAccent: 'text-[#60a5fa]',
    },
    {
      id: 'redes-atendidas',
      label: 'Redes Atendidas',
      value: kpis.redesAtendidas,
      sub: 'Varejo & Atacarejo',
      icon: Store,
      color: 'from-[#ff6b6b] to-[#ec4899]',
      textAccent: 'text-[#ff6b6b]',
    },
    {
      id: 'marcas-ativas',
      label: 'Marcas / Formulários',
      value: kpis.marcasAtivas,
      sub: 'Pesquisas em campo',
      icon: FileText,
      color: 'from-[#a78bfa] to-[#8b5cf6]',
      textAccent: 'text-[#a78bfa]',
    },
    {
      id: 'ticket-medio',
      label: 'Ticket Médio / Agente',
      value: fmt(kpis.ticketMedioAgente),
      sub: 'Média mensal por promotor',
      icon: TrendingUp,
      color: 'from-[#ffd166] to-[#eab308]',
      textAccent: 'text-[#ffd166]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-2xl bg-[#14141c] border border-[#242434] p-4.5 transition-all duration-300 hover:border-[#6c63ff]/40 hover:-translate-y-0.5 shadow-lg group"
          >
            {/* Top Accent Strip */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`}
            />

            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a1a26] border border-[#2c2c3e] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Icon className={`w-5 h-5 ${card.textAccent}`} />
              </div>

              {card.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/30">
                  {card.badge}
                </span>
              )}

              {card.alert && (
                <span
                  title="Atenção para risco de concentração em clientes"
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Risco
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9090aa]">
                {card.label}
              </span>
              <div className="text-2xl font-black tracking-tight text-white">
                {card.value}
              </div>
              <p className="text-[11px] text-[#9090aa]">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
