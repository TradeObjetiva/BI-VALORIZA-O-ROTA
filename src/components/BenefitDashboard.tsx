import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Users,
  Briefcase,
  TrendingDown,
  Bus,
  Utensils,
  Smartphone,
  ShieldAlert,
  Percent,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowUpDown,
  Calculator,
} from 'lucide-react';
import { BenefitRecord, BenefitKPIData } from '../types/benefit';
import { fmt, fmtNumber } from '../utils/tradeCalculations';
import * as XLSX from 'xlsx';

interface BenefitDashboardProps {
  benefitRecords: BenefitRecord[];
  benefitKPIs: BenefitKPIData;
  fileName: string;
}

export const BenefitDashboard: React.FC<BenefitDashboardProps> = ({
  benefitRecords,
  benefitKPIs,
  fileName,
}) => {
  // Filtros de Tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipoVT, setSelectedTipoVT] = useState('todos');
  const [selectedCesta, setSelectedCesta] = useState('todos');
  const [sortField, setSortField] = useState<keyof BenefitRecord>('custoTotalPromotor');
  const [sortAsc, setSortAsc] = useState(false);

  // Simulador de Faltas/Atestados
  const [simColaboradorId, setSimColaboradorId] = useState<string>('');
  const [simFaltas, setSimFaltas] = useState<number>(0);
  const [simAtestados, setSimAtestados] = useState<number>(0);

  // Colaborador em simulação
  const targetPromotor = useMemo(() => {
    if (!simColaboradorId) return benefitRecords[0] || null;
    return benefitRecords.find((b) => b.id === simColaboradorId) || benefitRecords[0] || null;
  }, [benefitRecords, simColaboradorId]);

  // Recálculo do promotor simulado
  const simulatedPromotor = useMemo(() => {
    if (!targetPromotor) return null;
    const diasMesVT = targetPromotor.diasMesSegSab;
    const diasMesVR = targetPromotor.diasUteisSegSex;

    const novosDiasVT = Math.max(0, diasMesVT - simFaltas - simAtestados);
    const novosDiasVR = Math.max(0, diasMesVR - simFaltas - simAtestados);

    const novoVtTotal = (targetPromotor.mediaJae + targetPromotor.mediaRcardUsuario + targetPromotor.mediaRcardEmpresa + targetPromotor.mediaCajuMob + targetPromotor.mediaCajuSaldoLivre) * novosDiasVT;
    const novoVrTotal = targetPromotor.vrDiario * novosDiasVR;
    const novoCelular = targetPromotor.celularDiario * novosDiasVT;
    const novoTotBenCaju = novoVrTotal + novoCelular + targetPromotor.cestaTotal + targetPromotor.kmValor + targetPromotor.homeOfficeTotal;
    const novosTributos = (novoTotBenCaju + targetPromotor.salarioComEncargos + targetPromotor.epiSeguro + targetPromotor.subtotalDiversos + targetPromotor.taxaSupervisao) * 0.1986;
    const novoCustoTot = targetPromotor.salarioComEncargos + novoTotBenCaju + novoVtTotal + targetPromotor.epiSeguro + targetPromotor.subtotalDiversos + targetPromotor.taxaSupervisao + novosTributos;

    const economia = targetPromotor.custoTotalPromotor - novoCustoTot;

    return {
      novosDiasVT,
      novosDiasVR,
      novoVtTotal,
      novoVrTotal,
      novoCelular,
      novoTotBenCaju,
      novoCustoTot,
      economia,
    };
  }, [targetPromotor, simFaltas, simAtestados]);

  // Registros filtrados e ordenados
  const filteredRecords = useMemo(() => {
    return benefitRecords
      .filter((r) => {
        const matchSearch =
          r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.cpf.includes(searchTerm) ||
          (r.colaborador && String(r.colaborador).includes(searchTerm));
        const matchVT =
          selectedTipoVT === 'todos' ||
          (selectedTipoVT === 'jae' && r.vtJae > 0) ||
          (selectedTipoVT === 'rcard' && (r.vtRcardUsuario > 0 || r.vtRcardEmpresa > 0)) ||
          (selectedTipoVT === 'caju' && (r.vtCajuMob > 0 || r.vtCajuSaldoLivre > 0));
        const matchCesta =
          selectedCesta === 'todos' ||
          (selectedCesta === 'sim' && r.cestaTotal > 0) ||
          (selectedCesta === 'nao' && r.cestaTotal === 0);

        return matchSearch && matchVT && matchCesta;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA || '').localeCompare(String(valB || ''))
          : String(valB || '').localeCompare(String(valA || ''));
      });
  }, [benefitRecords, searchTerm, selectedTipoVT, selectedCesta, sortField, sortAsc]);

  const handleSort = (field: keyof BenefitRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Exportar para Excel
  const handleExport = () => {
    const exportData = filteredRecords.map((r) => ({
      Matrícula: r.colaborador || '—',
      Nome: r.nome,
      CPF: r.cpf,
      Função: r.funcao,
      'Salário Base': r.salarioBase,
      'Encargos (60,25%)': r.salarioComEncargos - r.salarioBase,
      'Salário + Encargos': r.salarioComEncargos,
      'VT Total': r.vtTotal,
      'VR Caju': r.vrTotal,
      'Aux. Celular': r.celularTotal,
      'Cesta Básica': r.cestaTotal,
      'Total Benefícios': r.totalBeneficiosCaju,
      'EPI / Uniforme': r.epiSeguro,
      Diversos: r.subtotalDiversos,
      'Taxa Supervisão (25%)': r.taxaSupervisao,
      'Tributos (19,86%)': r.tributos,
      'Custo Total Mensal': r.custoTotalPromotor,
      '% VT sobre Salário': `${r.pctVtSalario}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Custos Operacionais');
    XLSX.writeFile(wb, `custo_operacional_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Top 5 maiores custos de VT
  const topVtOffenders = useMemo(() => {
    return [...benefitRecords].sort((a, b) => b.vtTotal - a.vtTotal).slice(0, 5);
  }, [benefitRecords]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Identificação do Módulo */}
      <div className="bg-gradient-to-r from-[#181824] via-[#1a162b] to-[#121c24] border border-[#2e2a44] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] text-xs font-semibold border border-[#6c63ff]/30">
            <Briefcase className="w-3.5 h-3.5 text-[#00d4aa]" />
            Módulo de RH & Custo Operacional • Promotores Compartilhados
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Gestão de Folha, Encargos & Benefícios
          </h2>
          <p className="text-xs text-[#9090aa] max-w-2xl leading-relaxed">
            Apuração exata da equipe: Encargos Trabalhistas (68,25%), Fee de Supervisão (10%), Taxa Administrativa (15%), Impostos Fiscais (19,86%) e Bilhetagem Multimodal (Jaé, Riocard e Caju).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-bold text-white hover:border-[#6c63ff] hover:bg-[#252538] transition shadow-md"
          >
            <Download className="w-4 h-4 text-[#00d4aa]" />
            Exportar XLS
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Custo Operacional Total */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group hover:border-[#6c63ff]/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6c63ff]/10 rounded-full blur-2xl group-hover:bg-[#6c63ff]/20 transition" />
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>CUSTO OPERACIONAL TOTAL</span>
            <DollarSign className="w-4 h-4 text-[#6c63ff]" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {fmt(benefitKPIs.custoTotalOperacional)}
          </div>
          <div className="text-[11px] text-[#00d4aa] mt-2 font-medium">
            Média: {fmt(benefitKPIs.custoMedioPorPromotor)} / promotor
          </div>
        </div>

        {/* Card 2: Folha Salarial Base */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group hover:border-[#00d4aa]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>FOLHA SALARIAL BASE</span>
            <Users className="w-4 h-4 text-[#00d4aa]" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {fmt(benefitKPIs.folhaSalarialBase)}
          </div>
          <div className="text-[11px] text-[#9090aa] mt-2">
            {benefitKPIs.totalPromotores} promotores (44h semanais)
          </div>
        </div>

        {/* Card 3: Encargos Trabalhistas (60,25%) */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group hover:border-[#ffd166]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>ENCARGOS TRABALHISTAS</span>
            <Percent className="w-4 h-4 text-[#ffd166]" />
          </div>
          <div className="text-2xl font-black text-[#ffd166] tracking-tight">
            {fmt(benefitKPIs.encargosTrabalhistas)}
          </div>
          <div className="text-[11px] text-[#9090aa] mt-2">
            Alíquota oficial: <strong className="text-white">68,25%</strong> sobre folha
          </div>
        </div>

        {/* Card 4: Vale Transporte Total */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group hover:border-[#ff6b6b]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>VALE TRANSPORTE (VT)</span>
            <Bus className="w-4 h-4 text-[#ff6b6b]" />
          </div>
          <div className="text-2xl font-black text-[#ff6b6b] tracking-tight">
            {fmt(benefitKPIs.totalVT)}
          </div>
          <div className="text-[11px] text-[#ff6b6b] mt-2 font-medium">
            {benefitKPIs.promotoresVtCritico} promotores c/ VT &gt; 50% salário
          </div>
        </div>

        {/* Card 5: Benefícios Caju */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group hover:border-[#a78bfa]/50 transition">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>BENEFÍCIOS CAJU</span>
            <Utensils className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div className="text-2xl font-black text-[#a78bfa] tracking-tight">
            {fmt(benefitKPIs.totalBeneficiosCaju)}
          </div>
          <div className="text-[11px] text-[#9090aa] mt-2">
            Desc. PAT (5%): -{fmt(benefitKPIs.totalDescontoPAT)}
          </div>
        </div>
      </div>

      {/* Grid Secundário de Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#121218] border border-[#222230] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#9090aa]">Taxa de Supervisão (25%)</div>
            <div className="text-base font-bold text-white mt-0.5">{fmt(benefitKPIs.totalTaxaSupervisao)}</div>
          </div>
          <ShieldAlert className="w-5 h-5 text-[#6c63ff]" />
        </div>

        <div className="p-4 rounded-xl bg-[#121218] border border-[#222230] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#9090aa]">Tributos e Impostos (19,86%)</div>
            <div className="text-base font-bold text-white mt-0.5">{fmt(benefitKPIs.totalTributos)}</div>
          </div>
          <Percent className="w-5 h-5 text-[#ffd166]" />
        </div>

        <div className="p-4 rounded-xl bg-[#121218] border border-[#222230] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#9090aa]">Custo da Hora Operacional</div>
            <div className="text-base font-bold text-[#00d4aa] mt-0.5">{fmt(benefitKPIs.custoMedioHora)} / hora</div>
          </div>
          <Calculator className="w-5 h-5 text-[#00d4aa]" />
        </div>

        <div className="p-4 rounded-xl bg-[#121218] border border-[#222230] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#9090aa]">Equipamentos & Diversos</div>
            <div className="text-base font-bold text-white mt-0.5">{fmt(benefitKPIs.totalDiversos + benefitKPIs.totalEpiSeguro)}</div>
          </div>
          <Smartphone className="w-5 h-5 text-[#9090aa]" />
        </div>
      </div>

      {/* Seção Gráfica: Composição de Custo + Modais de Transporte + Maiores Custos de VT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Composição do Custo Operacional */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#242434] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#242434] mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6c63ff]" />
                Composição do Custo Operacional
              </h3>
              <span className="text-[11px] font-semibold text-[#a78bfa]">100% Base Outubro</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Folha Salarial Base', val: benefitKPIs.folhaSalarialBase, pct: (benefitKPIs.folhaSalarialBase / benefitKPIs.custoTotalOperacional) * 100, color: '#00d4aa' },
                { label: 'Encargos Sociais (60,25%)', val: benefitKPIs.encargosTrabalhistas, pct: (benefitKPIs.encargosTrabalhistas / benefitKPIs.custoTotalOperacional) * 100, color: '#ffd166' },
                { label: 'Subtotal Diversos (Ferramentas)', val: benefitKPIs.totalDiversos, pct: (benefitKPIs.totalDiversos / benefitKPIs.custoTotalOperacional) * 100, color: '#6c63ff' },
                { label: 'Tributos Fiscais (19,86%)', val: benefitKPIs.totalTributos, pct: (benefitKPIs.totalTributos / benefitKPIs.custoTotalOperacional) * 100, color: '#f72585' },
                { label: 'Taxa de Supervisão (Fee 25%)', val: benefitKPIs.totalTaxaSupervisao, pct: (benefitKPIs.totalTaxaSupervisao / benefitKPIs.custoTotalOperacional) * 100, color: '#4cc9f0' },
                { label: 'Benefícios Caju (VR/Cel/Cesta)', val: benefitKPIs.totalBeneficiosCaju, pct: (benefitKPIs.totalBeneficiosCaju / benefitKPIs.custoTotalOperacional) * 100, color: '#a78bfa' },
                { label: 'Vale Transporte (VT)', val: benefitKPIs.totalVT, pct: (benefitKPIs.totalVT / benefitKPIs.custoTotalOperacional) * 100, color: '#ff6b6b' },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9090aa]">{item.label}</span>
                    <span className="font-semibold text-white">
                      {fmt(item.val)} <span className="text-[#5a5a75]">({item.pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#1e1e2c] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Divisão dos Modais de Transporte */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#242434] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#242434] mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b6b]" />
                Modais de Vale-Transporte (RJ)
              </h3>
              <span className="text-[11px] font-semibold text-[#ff6b6b]">Total: {fmt(benefitKPIs.totalVT)}</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#2e2e40] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00d4aa]" /> Jaé (Municipal RJ)
                  </span>
                  <span className="font-bold text-[#00d4aa]">{fmt(benefitKPIs.totalVtJae)}</span>
                </div>
                <div className="text-[11px] text-[#9090aa]">
                  Representa {((benefitKPIs.totalVtJae / benefitKPIs.totalVT) * 100 || 0).toFixed(1)}% do custo de transporte da equipe
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#2e2e40] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#6c63ff]" /> Riocard (Intermunicipal/Trens/Metrô)
                  </span>
                  <span className="font-bold text-[#6c63ff]">{fmt(benefitKPIs.totalVtRcard)}</span>
                </div>
                <div className="text-[11px] text-[#9090aa]">
                  Representa {((benefitKPIs.totalVtRcard / benefitKPIs.totalVT) * 100 || 0).toFixed(1)}% do total
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a24] border border-[#2e2e40] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffd166]" /> Caju Mobilidade & Saldo Livre
                  </span>
                  <span className="font-bold text-[#ffd166]">{fmt(benefitKPIs.totalVtCaju)}</span>
                </div>
                <div className="text-[11px] text-[#9090aa]">
                  Representa {((benefitKPIs.totalVtCaju / benefitKPIs.totalVT) * 100 || 0).toFixed(1)}% do total
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 3: Ranking de Ofensores de Custo de VT */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#242434] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#242434] mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f72585]" />
                Top 5 Maiores Custos de Deslocamento
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f72585]/20 text-[#f72585]">
                Alerta de Rota
              </span>
            </div>

            <div className="space-y-3">
              {topVtOffenders.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-[#161622] border border-[#262638] flex items-center justify-between text-xs hover:border-[#f72585]/40 transition"
                >
                  <div className="space-y-0.5 max-w-[180px]">
                    <div className="font-bold text-white truncate" title={p.nome}>
                      {idx + 1}. {p.nome}
                    </div>
                    <div className="text-[10px] text-[#9090aa]">
                      Modal: {p.tipoVT} • Salário: {fmt(p.salarioBase)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[#f72585]">{fmt(p.vtTotal)}</div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#f72585]/15 text-[#f72585]">
                      {p.pctVtSalario.toFixed(0)}% do salário
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Simulador Interativo de Faltas e Atestados (Regra da Daniele) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#161622] to-[#12121a] border border-[#2a2a40] shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-[#262638] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6c63ff]/20 flex items-center justify-center text-[#6c63ff]">
              <Calculator className="w-4 h-4 text-[#a78bfa]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Simulador Operacional de Faltas & Atestados</h3>
              <p className="text-xs text-[#9090aa]">
                Recálculo em tempo real do crédito de VT e VR seguindo os abatimentos oficiais de compras da agência
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Seletor de Promotor */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs text-[#9090aa] font-semibold">Promotor para Simulação:</label>
            <select
              value={simColaboradorId}
              onChange={(e) => setSimColaboradorId(e.target.value)}
              className="w-full bg-[#1c1c28] border border-[#2e2e42] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
            >
              {benefitRecords.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome} — Matrícula: {b.colaborador || 'S/N'} (VT: {fmt(b.vtTotal)})
                </option>
              ))}
            </select>
          </div>

          {/* Input Faltas */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9090aa] font-semibold">Faltas no Mês (dias):</label>
            <input
              type="number"
              min="0"
              max="25"
              value={simFaltas}
              onChange={(e) => setSimFaltas(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-[#1c1c28] border border-[#2e2e42] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          {/* Input Atestados */}
          <div className="space-y-1.5">
            <label className="text-xs text-[#9090aa] font-semibold">Atestados no Mês (dias):</label>
            <input
              type="number"
              min="0"
              max="25"
              value={simAtestados}
              onChange={(e) => setSimAtestados(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-[#1c1c28] border border-[#2e2e42] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
            />
          </div>
        </div>

        {/* Resultado da Simulação */}
        {simulatedPromotor && targetPromotor && (
          <div className="mt-5 p-4 rounded-2xl bg-[#191926] border border-[#2e2e46] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#9090aa] block">Dias Efetivos VT:</span>
              <strong className="text-white text-sm">
                {simulatedPromotor.novosDiasVT} dias{' '}
                <span className="text-[#5a5a75] font-normal">(era {targetPromotor.diasEfetivosVT})</span>
              </strong>
            </div>
            <div>
              <span className="text-[#9090aa] block">Novo VT a Pagar:</span>
              <strong className="text-[#00d4aa] text-sm">
                {fmt(simulatedPromotor.novoVtTotal)}{' '}
                <span className="text-[#5a5a75] font-normal">(-{fmt(targetPromotor.vtTotal - simulatedPromotor.novoVtTotal)})</span>
              </strong>
            </div>
            <div>
              <span className="text-[#9090aa] block">Novo VR Caju:</span>
              <strong className="text-[#a78bfa] text-sm">
                {fmt(simulatedPromotor.novoVrTotal)}{' '}
                <span className="text-[#5a5a75] font-normal">(-{fmt(targetPromotor.vrTotal - simulatedPromotor.novoVrTotal)})</span>
              </strong>
            </div>
            <div>
              <span className="text-[#9090aa] block">Economia Operacional:</span>
              <strong className="text-[#ffd166] text-sm">
                {fmt(simulatedPromotor.economia)} no mês
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Tabela Interativa de Promotores de Custo */}
      <div className="bg-[#15151e] border border-[#242434] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 bg-[#1a1a26] border-b border-[#242434] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tabela de Promotores & Formação de Custos
            </h3>
            <p className="text-xs text-[#9090aa]">
              {filteredRecords.length} colaboradores exibidos • Ordenação dinâmica por qualquer coluna
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#9090aa] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar promotor ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#121218] border border-[#2a2a3c] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
              />
            </div>

            <select
              value={selectedTipoVT}
              onChange={(e) => setSelectedTipoVT(e.target.value)}
              className="bg-[#121218] border border-[#2a2a3c] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
            >
              <option value="todos">Todos Modais</option>
              <option value="jae">Usa Jaé</option>
              <option value="rcard">Usa Riocard</option>
              <option value="caju">Usa Caju VT</option>
            </select>

            <select
              value={selectedCesta}
              onChange={(e) => setSelectedCesta(e.target.value)}
              className="bg-[#121218] border border-[#2a2a3c] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#6c63ff]"
            >
              <option value="todos">Cesta Básica (Todos)</option>
              <option value="sim">Com Cesta</option>
              <option value="nao">Sem Cesta</option>
            </select>
          </div>
        </div>

        {/* Tabela Scrollável */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#121218] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242434] z-10">
              <tr>
                <th className="py-3 px-4 font-semibold">#</th>
                <th
                  onClick={() => handleSort('nome')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Promotor {sortField === 'nome' && <ArrowUpDown className="w-3 h-3 text-[#6c63ff]" />}
                  </div>
                </th>
                <th className="py-3 px-3 font-semibold">CPF</th>
                <th
                  onClick={() => handleSort('salarioBase')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Salário Base
                </th>
                <th
                  onClick={() => handleSort('vtTotal')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  VT Total
                </th>
                <th
                  onClick={() => handleSort('vrTotal')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  VR Caju
                </th>
                <th
                  onClick={() => handleSort('totalBeneficiosCaju')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Benefícios
                </th>
                <th
                  onClick={() => handleSort('taxaSupervisao')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Supervisão (25%)
                </th>
                <th
                  onClick={() => handleSort('tributos')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Tributos (19,86%)
                </th>
                <th
                  onClick={() => handleSort('custoTotalPromotor')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white text-[#00d4aa]"
                >
                  Custo Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {filteredRecords.map((r, i) => (
                <tr key={r.id} className="hover:bg-[#1a1a26] transition-colors">
                  <td className="py-2.5 px-4 text-[#5a5a75] font-mono">{i + 1}</td>
                  <td className="py-2.5 px-4 font-bold text-white">
                    <div className="flex flex-col">
                      <span>{r.nome}</span>
                      <span className="text-[10px] text-[#5a5a75] font-normal">
                        Matrícula: {r.colaborador || '—'} • {r.departamento}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#9090aa]">{r.cpf}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-white">{fmt(r.salarioBase)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${r.pctVtSalario >= 50 ? 'text-[#ff6b6b]' : 'text-white'}`}>
                        {fmt(r.vtTotal)}
                      </span>
                      <span className="text-[10px] text-[#5a5a75]">{r.pctVtSalario.toFixed(0)}% sal</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white">{fmt(r.vrTotal)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-[#a78bfa]">{fmt(r.totalBeneficiosCaju)}</td>
                  <td className="py-2.5 px-3 text-right text-[#9090aa]">{fmt(r.taxaSupervisao)}</td>
                  <td className="py-2.5 px-3 text-right text-[#ffd166]">{fmt(r.tributos)}</td>
                  <td className="py-2.5 px-4 text-right font-black text-[#00d4aa]">
                    {fmt(r.custoTotalPromotor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
