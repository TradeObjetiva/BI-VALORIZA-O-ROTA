import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Scale,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Filter,
  Sparkles,
  PieChart,
  BarChart2,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Link2,
  Info,
  X,
  Receipt,
  Layers,
} from 'lucide-react';
import { ConfrontoRecord, ConfrontoKPIData } from '../types/benefit';
import { fmt, fmtNumber } from '../utils/tradeCalculations';
import * as XLSX from 'xlsx';

interface ConfrontoDashboardProps {
  confrontoRecords: ConfrontoRecord[];
  confrontoKPIs: ConfrontoKPIData;
  rotaFileName: string;
  custoFileName: string;
  onOpenLinkerModal?: () => void;
}

export const ConfrontoDashboard: React.FC<ConfrontoDashboardProps> = ({
  confrontoRecords,
  confrontoKPIs,
  rotaFileName,
  custoFileName,
  onOpenLinkerModal,
}) => {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'lucro' | 'alerta' | 'prejuizo'>('todos');
  const [conciliacaoFilter, setConciliacaoFilter] = useState<'todos' | 'conciliados' | 'apenas_custo' | 'apenas_rota'>('todos');
  const [showAuditoriaDrawer, setShowAuditoriaDrawer] = useState(false);
  const [showCustoRhModal, setShowCustoRhModal] = useState(false);
  const [sortField, setSortField] = useState<keyof ConfrontoRecord>('margemContribuicao');
  const [sortAsc, setSortAsc] = useState(false);

  const activeKPIs = confrontoKPIs;

  // Decomposição analítica oficial do Custo RH
  const custoRhBreakdown = useMemo(() => {
    let salarioBase = 0;
    let encargos = 0;
    let beneficiosCaju = 0;
    let subtotalDiversos = 0;
    let taxaSupervisao = 0;
    let taxaAdm = 0;
    let tributos = 0;
    let premiacao = 0;

    confrontoRecords.forEach((r) => {
      salarioBase += r.salarioBase || 0;
      encargos += r.encargos || 0;
      beneficiosCaju += r.beneficiosCaju || 0;
      subtotalDiversos += r.subtotalDiversos || 0;
      taxaSupervisao += r.taxaSupervisao || 0;
      taxaAdm += r.taxaAdm || 0;
      tributos += r.tributos || 0;
      premiacao += r.premiacao || 0;
    });

    const totalCustoRh = activeKPIs.custoRhTotal;

    const items = [
      {
        id: 'salario',
        nome: 'Salário Base (CLT)',
        coluna: 'Coluna SALÁRIO / SALÁRIO BASE',
        valor: salarioBase,
        cor: '#a78bfa',
        descricao: 'Remuneração base contratual dos promotores de vendas',
      },
      {
        id: 'encargos',
        nome: 'Encargos Trabalhistas Provisionados (68,25%)',
        coluna: 'Custos Trabalhistas / Provisões',
        valor: encargos,
        cor: '#818cf8',
        descricao: 'FGTS (8%), INSS Patronal (28,8%), 13º salário e férias proporcionais + 1/3 constitucional',
      },
      {
        id: 'caju',
        nome: 'Benefícios Flexíveis Caju',
        coluna: 'Total Benefícios Caju (VR + Celular + Cesta)',
        valor: beneficiosCaju,
        cor: '#00d4aa',
        descricao: 'Vale Refeição / Alimentação, Auxílio Conectividade (Celular) e Cesta Básica via Cartão Caju',
      },
      {
        id: 'supervisao',
        nome: 'Taxa de Supervisão Operacional',
        coluna: 'Coluna TAXA SUPERVISÃO',
        valor: taxaSupervisao,
        cor: '#38bdf8',
        descricao: 'Coordenação operacional, liderança de campo e acompanhamento de rota',
      },
      {
        id: 'tributos',
        nome: 'Tributos Fiscais & Impostos',
        coluna: 'Coluna TRIBUTOS',
        valor: tributos,
        cor: '#ffd166',
        descricao: 'Impostos sobre faturamento e operação (ISS, PIS, COFINS sobre prestação de serviços)',
      },
      {
        id: 'adm',
        nome: 'Taxa Administrativa (Fee)',
        coluna: 'Coluna TAXA ADM',
        valor: taxaAdm,
        cor: '#f472b6',
        descricao: 'Fee de gestão e sustentação de retaguarda da agência',
      },
      {
        id: 'diversos',
        nome: 'Saúde, Segurança & Tecnologia (Diversos)',
        coluna: 'EPI, Seguro, ASO, PGR, Mob2con',
        valor: subtotalDiversos,
        cor: '#fb923c',
        descricao: 'Equipamentos de Proteção, Exames Médicos Ocupacionais (ASO), PGR e licenças de software de campo',
      },
      {
        id: 'premiacao',
        nome: 'Premiação Operacional',
        coluna: 'Coluna PREMIAÇÃO',
        valor: premiacao,
        cor: '#34d399',
        descricao: 'Incentivos variáveis por metas de execução e assiduidade em loja',
      },
    ];

    return {
      items,
      totalCustoRh,
    };
  }, [confrontoRecords, activeKPIs.custoRhTotal]);

  // Filtros aplicados
  const filteredRecords = useMemo(() => {
    return confrontoRecords
      .filter((r) => {
        const matchSearch =
          r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.cpf.includes(searchTerm);
        const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
        const matchConciliacao =
          conciliacaoFilter === 'todos' ||
          (conciliacaoFilter === 'conciliados' && r.matchedRota && r.matchedCusto) ||
          (conciliacaoFilter === 'apenas_custo' && r.matchedCusto && !r.matchedRota) ||
          (conciliacaoFilter === 'apenas_rota' && r.matchedRota && !r.matchedCusto);
        return matchSearch && matchStatus && matchConciliacao;
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
  }, [confrontoRecords, searchTerm, statusFilter, conciliacaoFilter, sortField, sortAsc]);

  // Totais da tabela filtrada
  const tableTotals = useMemo(() => {
    let faturamento = 0;
    let custoRh = 0;
    let vtReal = 0;
    let custoTotal = 0;
    filteredRecords.forEach((r) => {
      faturamento += r.faturamentoMensal;
      custoRh += r.custoRh;
      vtReal += r.vtTotal;
      custoTotal += r.custoTotalMensal;
    });
    const margemLiq = faturamento - custoTotal;
    const margemPct = faturamento > 0 ? (margemLiq / faturamento) * 100 : 0;
    return { faturamento, custoRh, vtReal, custoTotal, margemLiq, margemPct };
  }, [filteredRecords]);

  const handleSort = (field: keyof ConfrontoRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Exportar Excel
  const handleExport = () => {
    const exportData = filteredRecords.map((r) => ({
      Promotor: r.nome,
      CPF: r.cpf,
      'Visitas / Semana': r.visitasSemanais,
      'Horas / Semana': r.horasSemanais,
      'Valor Semanal Rota': r.valorSemanalRota,
      'Faturamento Rota (4,334x)': r.faturamentoMensal,
      'Custo RH (Folha, Encargos, Benefícios, Impostos)': r.custoRh,
      'VT Real (Logística Transporte)': r.vtTotal,
      'Custo Total Operação (Custo RH + VT Real)': r.custoTotalMensal,
      'Margem Líquida Real (R$)': r.margemContribuicao,
      'Margem Líquida (%)': `${r.margemPct}%`,
      Status: r.status === 'lucro' ? 'Rentável' : r.status === 'alerta' ? 'Margem Baixa' : 'Deficitário',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Confronto Valor x Custo');
    XLSX.writeFile(wb, `confronto_dre_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner Principal de Confronto */}
      <div className="bg-gradient-to-r from-[#161a29] via-[#1a182e] to-[#121c22] border border-[#2b2b48] p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] text-xs font-semibold border border-[#00d4aa]/30">
            <Scale className="w-3.5 h-3.5 text-[#00d4aa]" />
            DRE & Rentabilidade • Confronto Oficial de Valorização × Custo Operacional
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Margem Real de Contribuição por Promotor
          </h2>
          <p className="text-xs text-[#9090aa] max-w-2xl leading-relaxed">
            Cruzamento automatizado da <strong>Receita Comercial de Rotas</strong> com o <strong>Custo Real de RH</strong> (Salário + 68,25% Encargos + VT Multimodal + Benefícios Caju + 25% Fee + Impostos).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-xs text-[#9090aa] bg-[#12121a] px-3 py-2 rounded-xl border border-[#262638]">
            <span className="block text-[10px] text-[#5a5a75] uppercase font-bold">Bases Cruzadas</span>
            <span className="text-white font-mono truncate max-w-[150px] inline-block">{rotaFileName}</span> × <span className="text-white font-mono truncate max-w-[150px] inline-block">{custoFileName}</span>
          </div>

          {onOpenLinkerModal && (
            <button
              onClick={onOpenLinkerModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] text-xs font-black text-white hover:opacity-95 transition shadow-lg border border-[#a78bfa]/30"
            >
              <Link2 className="w-4 h-4 text-white" />
              Sincronizador AGENTE ↔ NOME
              {activeKPIs.auditoriaConciliacao?.totalVinculosManuais > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {activeKPIs.auditoriaConciliacao.totalVinculosManuais}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-bold text-white hover:border-[#00d4aa] hover:bg-[#252538] transition shadow-md"
          >
            <Download className="w-4 h-4 text-[#00d4aa]" />
            Exportar Confronto XLS
          </button>
        </div>
      </div>

      {/* Banner / Card Executivo de Auditoria & Conciliação de Nomes */}
      {activeKPIs.auditoriaConciliacao && (
        <div
          className={`p-4 md:p-5 rounded-3xl border transition-all shadow-xl ${
            activeKPIs.auditoriaConciliacao.isTotalmenteConciliado
              ? 'bg-gradient-to-r from-[#14231e] to-[#121b18] border-[#00d4aa]/40 shadow-[#00d4aa]/5'
              : 'bg-gradient-to-r from-[#262014] via-[#1c1a17] to-[#1a1715] border-[#ffd166]/40 shadow-[#ffd166]/5'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  activeKPIs.auditoriaConciliacao.isTotalmenteConciliado
                    ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30'
                    : 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/30'
                }`}
              >
                {activeKPIs.auditoriaConciliacao.isTotalmenteConciliado ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    {activeKPIs.auditoriaConciliacao.isTotalmenteConciliado
                      ? 'Auditoria de Conciliação: 100% dos Nomes Batem!'
                      : `Auditoria de Conciliação: ${activeKPIs.auditoriaConciliacao.taxaConciliacaoPct}% de Aderência`}
                  </h4>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      activeKPIs.auditoriaConciliacao.isTotalmenteConciliado
                        ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                        : 'bg-[#ffd166]/20 text-[#ffd166]'
                    }`}
                  >
                    {activeKPIs.auditoriaConciliacao.totalConciliados} conciliados com sucesso
                  </span>
                </div>
                <p className="text-xs text-[#9090aa] mt-1">
                  Comparação cruzada entre a coluna <strong className="text-white">AGENTE</strong> da Planilha de Valorização ({activeKPIs.auditoriaConciliacao.totalNomesValorizacao} nomes) e a coluna <strong className="text-white">NOME</strong> da Planilha de Custo ({activeKPIs.auditoriaConciliacao.totalNomesCusto} nomes).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
              {onOpenLinkerModal && (
                <button
                  onClick={onOpenLinkerModal}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6c63ff]/20 text-[#a78bfa] hover:bg-[#6c63ff]/30 border border-[#6c63ff]/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Vincular Nomes
                </button>
              )}

              {/* Filtro Rápido: Todos */}
              <button
                onClick={() => setConciliacaoFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  conciliacaoFilter === 'todos'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#181824] text-[#9090aa] hover:text-white border border-[#2a2a3c]'
                }`}
              >
                Todos ({confrontoRecords.length})
              </button>

              {/* Filtro Rápido: 100% Conciliados */}
              <button
                onClick={() => setConciliacaoFilter('conciliados')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  conciliacaoFilter === 'conciliados'
                    ? 'bg-[#00d4aa] text-black shadow-md'
                    : 'bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25 border border-[#00d4aa]/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conciliados ({activeKPIs.auditoriaConciliacao.totalConciliados})
              </button>

              {/* Filtro Rápido: Apenas no Custo */}
              {activeKPIs.auditoriaConciliacao.nomesApenasNoCusto.length > 0 && (
                <button
                  onClick={() => setConciliacaoFilter('apenas_custo')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    conciliacaoFilter === 'apenas_custo'
                      ? 'bg-[#ff6b6b] text-white shadow-md'
                      : 'bg-[#ff6b6b]/15 text-[#ff6b6b] hover:bg-[#ff6b6b]/25 border border-[#ff6b6b]/30'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  Sem Rota ({activeKPIs.auditoriaConciliacao.nomesApenasNoCusto.length})
                </button>
              )}

              {/* Filtro Rápido: Apenas na Valorização */}
              {activeKPIs.auditoriaConciliacao.nomesApenasNaValorizacao.length > 0 && (
                <button
                  onClick={() => setConciliacaoFilter('apenas_rota')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    conciliacaoFilter === 'apenas_rota'
                      ? 'bg-[#ffd166] text-black shadow-md'
                      : 'bg-[#ffd166]/15 text-[#ffd166] hover:bg-[#ffd166]/25 border border-[#ffd166]/30'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Sem Custo RH ({activeKPIs.auditoriaConciliacao.nomesApenasNaValorizacao.length})
                </button>
              )}

              {!activeKPIs.auditoriaConciliacao.isTotalmenteConciliado && (
                <button
                  onClick={() => setShowAuditoriaDrawer(!showAuditoriaDrawer)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#222232] border border-[#34344a] text-xs font-bold text-white hover:bg-[#2c2c42] hover:border-[#ffd166] transition flex items-center gap-1"
                >
                  {showAuditoriaDrawer ? 'Fechar Nomes' : 'Ver Nomes'}
                  {showAuditoriaDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Gaveta detalhada de promotores faltantes */}
          {showAuditoriaDrawer && !activeKPIs.auditoriaConciliacao.isTotalmenteConciliado && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Nomes apenas no Custo */}
              <div className="p-4 rounded-2xl bg-[#14141e] border border-[#ff6b6b]/30">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-bold text-[#ff6b6b] flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    Presentes na Planilha de Custo mas SEM ROTA ({activeKPIs.auditoriaConciliacao.nomesApenasNoCusto.length})
                  </span>
                  <span className="text-[10px] text-[#9090aa]">Custo Total sem Faturamento</span>
                </div>
                {activeKPIs.auditoriaConciliacao.nomesApenasNoCusto.length === 0 ? (
                  <p className="text-[11px] text-[#00d4aa]">Nenhum colaborador nesta lista.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {activeKPIs.auditoriaConciliacao.nomesApenasNoCusto.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSearchTerm(item.nome);
                          setConciliacaoFilter('todos');
                        }}
                        className="flex items-center justify-between p-2 px-3 rounded-xl bg-[#1a1a28] hover:bg-[#222236] transition cursor-pointer border border-[#2a2a3e]"
                        title="Clique para filtrar na tabela"
                      >
                        <div>
                          <div className="text-white font-semibold">{item.nome}</div>
                          <div className="text-[10px] text-[#5a5a75] font-mono">CPF: {item.cpf}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#ff6b6b] font-bold font-mono">{fmt(item.custoTotalMensal || 0)}</div>
                          <div className="text-[9px] text-[#9090aa]">Custo Total RH</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nomes apenas na Valorização */}
              <div className="p-4 rounded-2xl bg-[#14141e] border border-[#ffd166]/30">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-bold text-[#ffd166] flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Presentes na Planilha de Valorização mas SEM CUSTO ({activeKPIs.auditoriaConciliacao.nomesApenasNaValorizacao.length})
                  </span>
                  <span className="text-[10px] text-[#9090aa]">Faturando sem Custo Cadastrado</span>
                </div>
                {activeKPIs.auditoriaConciliacao.nomesApenasNaValorizacao.length === 0 ? (
                  <p className="text-[11px] text-[#00d4aa]">Nenhum promotor nesta lista.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {activeKPIs.auditoriaConciliacao.nomesApenasNaValorizacao.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSearchTerm(item.nome);
                          setConciliacaoFilter('todos');
                        }}
                        className="flex items-center justify-between p-2 px-3 rounded-xl bg-[#1a1a28] hover:bg-[#222236] transition cursor-pointer border border-[#2a2a3e]"
                        title="Clique para filtrar na tabela"
                      >
                        <div>
                          <div className="text-white font-semibold">{item.nome}</div>
                          <div className="text-[10px] text-[#5a5a75] font-mono">CPF: {item.cpf}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#00d4aa] font-bold font-mono">{fmt(item.faturamentoMensal || 0)}</div>
                          <div className="text-[9px] text-[#9090aa]">{fmt(item.valorSemanal || 0)}/sem</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid de KPIs de Confronto Executivo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Faturamento Total */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>FATURAMENTO ROTAS</span>
            <ArrowUpRight className="w-4 h-4 text-[#00d4aa]" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {fmt(activeKPIs.faturamentoTotal)}
          </div>
          <div className="text-[11px] text-[#00d4aa] mt-2 font-medium">
            Receita comercial (4,334x)
          </div>
        </div>

        {/* KPI 2: Custo RH */}
        <div
          onClick={() => setShowCustoRhModal(true)}
          className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group cursor-pointer hover:border-[#a78bfa]/60 hover:shadow-[#a78bfa]/10 transition-all"
          title="Clique para ver o detalhamento exato de todas as colunas que compõem o Custo RH"
        >
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span className="flex items-center gap-1.5">
              <span>CUSTO RH (FOLHA & BENEFÍCIOS)</span>
              <Info className="w-3.5 h-3.5 text-[#a78bfa] opacity-70 group-hover:opacity-100 transition" />
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/30 group-hover:bg-[#6c63ff]/30 transition">
              Ver Detalhes 🔍
            </span>
          </div>
          <div className="text-2xl font-black text-[#a78bfa] tracking-tight">
            {fmt(activeKPIs.custoRhTotal)}
          </div>
          <div className="text-[11px] text-[#9090aa] mt-2 font-medium flex items-center justify-between">
            <span>Salário, 68,25%, Caju, Fee, Tributos</span>
            <span className="text-[10px] text-[#a78bfa] font-semibold underline underline-offset-2">Clique p/ abrir</span>
          </div>
        </div>

        {/* KPI 3: VT Real */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#2a2a3c] shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>VT REAL (LOGÍSTICA)</span>
            <ArrowDownRight className="w-4 h-4 text-[#ff6b6b]" />
          </div>
          <div className="text-2xl font-black text-[#ff6b6b] tracking-tight">
            {fmt(activeKPIs.vtRealTotal)}
          </div>
          <div className="text-[11px] text-[#9090aa] mt-2 font-medium">
            Jaé + Riocard + Caju Mob
          </div>
        </div>

        {/* KPI 4: Custo Total (Custo RH + VT Real) */}
        <div className="p-5 rounded-2xl bg-[#15151e] border border-[#ff6b6b]/30 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>CUSTO TOTAL (RH + VT REAL)</span>
            <Scale className="w-4 h-4 text-[#ff6b6b]" />
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {fmt(activeKPIs.custoTotal)}
          </div>
          <div className="text-[11px] text-[#ff6b6b] mt-2 font-semibold">
            Soma: Custo RH + VT Real
          </div>
        </div>

        {/* KPI 5: Margem Líquida */}
        <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden group ${
          activeKPIs.margemLiquidaTotal >= 0
            ? 'bg-[#15151e] border-[#00d4aa]/50 shadow-[#00d4aa]/10'
            : 'bg-[#15151e] border-[#ff6b6b]/50 shadow-[#ff6b6b]/10'
        }`}>
          <div className="flex items-center justify-between text-xs text-[#9090aa] mb-2 font-semibold">
            <span>MARGEM LÍQUIDA REAL</span>
            <DollarSign className={`w-4 h-4 ${activeKPIs.margemLiquidaTotal >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`} />
          </div>
          <div className={`text-2xl font-black tracking-tight ${activeKPIs.margemLiquidaTotal >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
            {fmt(activeKPIs.margemLiquidaTotal)}
          </div>
          <div className="text-[11px] font-bold mt-2 flex items-center justify-between">
            <span className="text-[#9090aa]">Faturamento - (RH + VT)</span>
            <span className={activeKPIs.margemPercentualGeral >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
              {activeKPIs.margemPercentualGeral}%
            </span>
          </div>
        </div>
      </div>



      {/* Tabela Mestra de Confronto por Promotor */}
      <div className="bg-[#15151e] border border-[#242434] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-5 bg-[#1a1a26] border-b border-[#242434] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              DRE Operacional & Lucratividade por Promotor
            </h3>
            <p className="text-xs text-[#9090aa]">
              {filteredRecords.length} promotores • Comparação de Faturamento vs Custo Total Real
            </p>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#9090aa] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por promotor ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#121218] border border-[#2a2a3c] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
              />
            </div>

            <div className="flex rounded-xl bg-[#121218] border border-[#2a2a3c] p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'todos' ? 'bg-[#2a2a3c] text-white' : 'text-[#9090aa] hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('lucro')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'lucro' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'text-[#9090aa] hover:text-white'
                }`}
              >
                Rentáveis
              </button>
              <button
                onClick={() => setStatusFilter('prejuizo')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'prejuizo' ? 'bg-[#ff6b6b]/20 text-[#ff6b6b]' : 'text-[#9090aa] hover:text-white'
                }`}
              >
                Deficitários
              </button>
            </div>
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
                  Promotor
                </th>
                <th className="py-3 px-3 font-semibold">CPF</th>
                <th
                  onClick={() => handleSort('faturamentoMensal')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white text-[#00d4aa]"
                >
                  Faturamento (+)
                </th>
                <th
                  onClick={() => handleSort('custoRh')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white text-[#a78bfa]"
                >
                  Custo RH (-)
                </th>
                <th
                  onClick={() => handleSort('vtTotal')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white text-[#ff6b6b]"
                >
                  VT Real (-)
                </th>
                <th
                  onClick={() => handleSort('custoTotalMensal')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white text-white bg-white/5"
                >
                  Custo Total (RH + VT)
                </th>
                <th
                  onClick={() => handleSort('margemContribuicao')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Margem Líquida (=)
                </th>
                <th
                  onClick={() => handleSort('margemPct')}
                  className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-white"
                >
                  Margem (%)
                </th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2c]">
              {filteredRecords.map((r, i) => (
                <tr key={r.id} className="hover:bg-[#1a1a26] transition-colors">
                  <td className="py-2.5 px-4 text-[#5a5a75] font-mono">{i + 1}</td>
                  <td className="py-2.5 px-4 font-bold text-white">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{r.nome}</span>
                        {r.matchedRota && r.matchedCusto ? (
                          r.vinculoManual ? (
                            <span className="text-[9px] font-bold text-[#a78bfa] bg-[#6c63ff]/15 border border-[#6c63ff]/30 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5" /> Manual
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-[#00d4aa] bg-[#00d4aa]/15 border border-[#00d4aa]/30 px-1.5 py-0.2 rounded">
                              Auto ({r.matchScore || 100}%)
                            </span>
                          )
                        ) : !r.matchedRota ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-[#ff6b6b] bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 px-1.5 py-0.2 rounded">
                              Sem Rota
                            </span>
                            {onOpenLinkerModal && (
                              <button
                                onClick={() => onOpenLinkerModal()}
                                className="text-[9px] text-[#a78bfa] hover:underline font-semibold"
                              >
                                Vincular
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-[#ffd166] bg-[#ffd166]/15 border border-[#ffd166]/30 px-1.5 py-0.2 rounded">
                              Sem Custo
                            </span>
                            {onOpenLinkerModal && (
                              <button
                                onClick={() => onOpenLinkerModal()}
                                className="text-[9px] text-[#a78bfa] hover:underline font-semibold"
                              >
                                Vincular
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-[#5a5a75] font-normal">
                        {r.visitasSemanais} visitas/sem • {r.locaisAtendidos} lojas
                        {r.nomeRota && r.nomeBeneficio && r.nomeRota !== r.nomeBeneficio && (
                          <span className="text-[#9090aa] ml-2">
                            (Rota: {r.nomeRota} ↔ Custo: {r.nomeBeneficio})
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#9090aa]">{r.cpf}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-white">{fmt(r.faturamentoMensal)}</span>
                      {r.valorSemanalRota > 0 ? (
                        <span className="text-[10px] text-[#00d4aa] font-mono">
                          {fmt(r.valorSemanalRota)}/sem × 4,334
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#5a5a75]">Sem rota</span>
                      )}
                    </div>
                  </td>
                  <td
                    className="py-2.5 px-3 text-right font-semibold text-[#a78bfa] font-mono"
                    title={`Composição do Promotor:\n• Salário Base: ${fmt(r.salarioBase || 0)}\n• Encargos 68,25%: ${fmt(r.encargos || 0)}\n• Benefícios Caju: ${fmt(r.beneficiosCaju || 0)}\n• Taxa Supervisão: ${fmt(r.taxaSupervisao || 0)}\n• Tributos: ${fmt(r.tributos || 0)}\n• Outros/Fee: ${fmt((r.taxaAdm || 0) + (r.premiacao || 0) + (r.subtotalDiversos || 0))}\n= Total Custo RH: ${fmt(r.custoRh)}`}
                  >
                    <span className="border-b border-dashed border-[#a78bfa]/40 hover:border-[#a78bfa] cursor-help">
                      {fmt(r.custoRh)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#ff6b6b] font-mono">{fmt(r.vtTotal)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-white bg-white/5 font-mono">{fmt(r.custoTotalMensal)}</td>
                  <td className="py-2.5 px-4 text-right font-black font-mono">
                    <span className={r.margemContribuicao >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
                      {fmt(r.margemContribuicao)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono">
                    <span className={r.margemPct >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
                      {r.margemPct}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {r.status === 'lucro' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
                        <CheckCircle className="w-3 h-3" /> Rentável
                      </span>
                    )}
                    {r.status === 'alerta' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffd166]/15 text-[#ffd166] border border-[#ffd166]/30">
                        <AlertTriangle className="w-3 h-3" /> Margem Baixa
                      </span>
                    )}
                    {r.status === 'prejuizo' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30">
                        <AlertTriangle className="w-3 h-3" /> Deficitário
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#14141e] font-bold text-white border-t-2 border-[#242434] text-xs">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-[#a78bfa]">
                  Total ({filteredRecords.length} promotores)
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#00d4aa]">
                  {fmt(tableTotals.faturamento)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#a78bfa]">
                  {fmt(tableTotals.custoRh)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-[#ff6b6b]">
                  {fmt(tableTotals.vtReal)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-white bg-white/5">
                  {fmt(tableTotals.custoTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black">
                  <span className={tableTotals.margemLiq >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
                    {fmt(tableTotals.margemLiq)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  <span className={tableTotals.margemPct >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
                    {tableTotals.margemPct.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-[10px] text-[#9090aa]">
                  RH + VT somados
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal de Detalhamento do Custo RH */}
      {showCustoRhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#14141c] border border-[#2e2e42] rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#242434]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6c63ff]/20 border border-[#6c63ff]/40 flex items-center justify-center text-[#a78bfa]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white">
                    Detalhamento Oficial do Custo RH (Folha & Benefícios)
                  </h3>
                  <p className="text-xs text-[#9090aa] mt-0.5">
                    Memória analítica de todas as colunas somadas da Planilha de Custo Operacional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustoRhModal(false)}
                className="p-2 text-[#9090aa] hover:text-white rounded-xl bg-[#1e1e2c] hover:bg-[#252538] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Card */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-[#1e1b38] to-[#161624] border border-[#6c63ff]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#a78bfa] uppercase tracking-wider">
                  Total Geral Custo RH da Operação
                </span>
                <div className="text-3xl font-black text-white mt-0.5">
                  {fmt(custoRhBreakdown.totalCustoRh)}
                </div>
                <div className="text-[11px] text-[#9090aa] mt-1">
                  Somatório de {confrontoRecords.filter((r) => r.matchedCusto).length} colaboradores ativos
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#121218] border border-[#242434] text-right shrink-0">
                <div className="text-[10px] text-[#9090aa] uppercase font-bold">O que NÃO entra aqui?</div>
                <div className="text-xs font-semibold text-[#ff6b6b] mt-0.5">
                  VT Real: {fmt(activeKPIs.vtRealTotal)}
                </div>
                <div className="text-[9px] text-[#5a5a75] mt-0.5">Apartado no card vizinho</div>
              </div>
            </div>

            {/* Lista Detalhada das Colunas Somadas */}
            <div className="mt-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Colunas e Rubricas Somadas (8 Componentes)
              </h4>

              <div className="space-y-2.5">
                {custoRhBreakdown.items.map((item, idx) => {
                  const pct = custoRhBreakdown.totalCustoRh > 0 ? (item.valor / custoRhBreakdown.totalCustoRh) * 100 : 0;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#181824] border border-[#242434] hover:border-[#6c63ff]/40 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {idx + 1}. {item.nome}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e1e2c] text-[#a78bfa] border border-[#2a2a3e]">
                              {item.coluna}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#9090aa] mt-0.5 leading-relaxed">
                            {item.descricao}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold font-mono text-white">
                            {fmt(item.valor)}
                          </div>
                          <div className="text-[10px] text-[#a78bfa] font-mono">
                            {pct.toFixed(1)}% do Custo RH
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full h-1.5 rounded-full bg-[#121218] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.cor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rodapé Explicativo */}
            <div className="mt-6 p-4 rounded-xl bg-[#121218] border border-[#242434] text-xs text-[#9090aa] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#00d4aa]" />
                Regra DRE de Fechamento:
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-white">Custo Total = Custo RH + VT Real (Logística)</strong>. O Vale Transporte não entra na base de cálculo de encargos trabalhistas nem de taxas operacionais, por isso é apartado no card <span className="text-[#ff6b6b] font-semibold">VT REAL</span>, permitindo à diretoria apurar com precisão a margem de contribuição de cada rota.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
