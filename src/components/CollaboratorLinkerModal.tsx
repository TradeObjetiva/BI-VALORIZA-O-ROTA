import React, { useState, useMemo } from 'react';
import {
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  X,
  UserCheck,
  UserX,
  Scale,
  DollarSign,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  Filter,
} from 'lucide-react';
import { TradeRecord } from '../types/trade';
import { BenefitRecord } from '../types/benefit';
import { fmt } from '../utils/tradeCalculations';
import {
  saveManualLink,
  removeManualLink,
  clearManualLinks,
  cleanNomeForMatching,
  findTopCandidates,
  calcularScoreCompatibilidade,
} from '../utils/benefitCalculations';

interface CollaboratorLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeRecords: TradeRecord[];
  benefitRecords: BenefitRecord[];
  manualLinks: Record<string, string>;
  onUpdateLinks: (newLinks: Record<string, string>) => void;
}

type TabType = 'pendentes' | 'todos' | 'manuais' | 'automaticos';

export const CollaboratorLinkerModal: React.FC<CollaboratorLinkerModalProps> = ({
  isOpen,
  onClose,
  tradeRecords,
  benefitRecords,
  manualLinks,
  onUpdateLinks,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pendentes');
  const [selectedAgentToLink, setSelectedAgentToLink] = useState<{ [agent: string]: string }>({});

  // 1. Agrupa agentes únicos de rotas com faturamento
  const agentesRotas = useMemo(() => {
    const map = new Map<string, { nome: string; valorSemanal: number; visitas: number }>();
    tradeRecords.forEach((tr) => {
      const nome = tr.agente || '(Sem Agente)';
      if (!map.has(nome)) {
        map.set(nome, { nome, valorSemanal: 0, visitas: 0 });
      }
      const cur = map.get(nome)!;
      cur.valorSemanal += tr.valorSemanal;
      cur.visitas += tr.visitasSemanais;
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tradeRecords]);

  // 2. Colaboradores de benefícios
  const colaboradoresBeneficios = useMemo(() => {
    return [...benefitRecords].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [benefitRecords]);

  // 3. Mapeamento de status de vínculo
  const { vinculosList, pendentesRotas, pendentesBeneficios, estatisticas } = useMemo(() => {
    const matchedAgentesSet = new Set<string>();
    const matchedBeneficiosSet = new Set<string>();

    interface VinculoStatus {
      agente: string;
      nomeBeneficio: string;
      tipo: 'manual' | 'automatico';
      score: number;
      valorSemanal: number;
      faturamentoMensal: number;
      custoTotalMensal: number;
    }

    const vinculos: VinculoStatus[] = [];

    // A. Vínculos manuais primeiro
    Object.entries(manualLinks).forEach(([agKey, benVal]) => {
      const agItem = agentesRotas.find((a) => a.nome === agKey || cleanNomeForMatching(a.nome) === cleanNomeForMatching(agKey));
      const benItem = colaboradoresBeneficios.find(
        (b) => b.nome === benVal || cleanNomeForMatching(b.nome) === cleanNomeForMatching(benVal)
      );

      if (agItem && benItem) {
        matchedAgentesSet.add(agItem.nome);
        matchedBeneficiosSet.add(benItem.nome);
        vinculos.push({
          agente: agItem.nome,
          nomeBeneficio: benItem.nome,
          tipo: 'manual',
          score: 100,
          valorSemanal: agItem.valorSemanal,
          faturamentoMensal: agItem.valorSemanal * 4.334,
          custoTotalMensal: benItem.custoTotalPromotor,
        });
      }
    });

    // B. Vínculos automáticos nos restantes
    colaboradoresBeneficios.forEach((b) => {
      if (matchedBeneficiosSet.has(b.nome)) return;

      const availableAgentes = agentesRotas.filter((a) => !matchedAgentesSet.has(a.nome));
      let bestAgente: typeof availableAgentes[0] | null = null;
      let bestScore = 0;

      for (const ag of availableAgentes) {
        const score = calcularScoreCompatibilidade(b.nome, undefined, ag.nome, undefined);
        if (score > bestScore && score >= 80) {
          bestScore = score;
          bestAgente = ag;
          if (score === 100) break;
        }
      }

      if (bestAgente) {
        matchedAgentesSet.add(bestAgente.nome);
        matchedBeneficiosSet.add(b.nome);
        vinculos.push({
          agente: bestAgente.nome,
          nomeBeneficio: b.nome,
          tipo: 'automatico',
          score: bestScore,
          valorSemanal: bestAgente.valorSemanal,
          faturamentoMensal: bestAgente.valorSemanal * 4.334,
          custoTotalMensal: b.custoTotalPromotor,
        });
      }
    });

    const pRotas = agentesRotas.filter((a) => !matchedAgentesSet.has(a.nome));
    const pBeneficios = colaboradoresBeneficios.filter((b) => !matchedBeneficiosSet.has(b.nome));

    const totalPossivel = Math.max(agentesRotas.length, colaboradoresBeneficios.length, 1);
    const taxaConciliacao = Math.round((vinculos.length / totalPossivel) * 100);

    return {
      vinculosList: vinculos,
      pendentesRotas: pRotas,
      pendentesBeneficios: pBeneficios,
      estatisticas: {
        totalAgentes: agentesRotas.length,
        totalBeneficios: colaboradoresBeneficios.length,
        totalSincronizados: vinculos.length,
        totalManuais: vinculos.filter((v) => v.tipo === 'manual').length,
        totalAutomaticos: vinculos.filter((v) => v.tipo === 'automatico').length,
        totalPendentesRotas: pRotas.length,
        totalPendentesBeneficios: pBeneficios.length,
        taxaConciliacao,
      },
    };
  }, [agentesRotas, colaboradoresBeneficios, manualLinks]);

  // Handler para vincular
  const handleVincular = (agente: string, nomeBeneficio: string) => {
    if (!agente || !nomeBeneficio) return;
    const updated = saveManualLink(agente, nomeBeneficio);
    onUpdateLinks(updated);
    setSelectedAgentToLink((prev) => {
      const copy = { ...prev };
      delete copy[agente];
      return copy;
    });
  };

  // Handler para desvincular
  const handleDesvincular = (agente: string) => {
    const updated = removeManualLink(agente);
    onUpdateLinks(updated);
  };

  // Handler para limpar todos os manuais
  const handleLimparTodos = () => {
    if (window.confirm('Tem certeza de que deseja restaurar os vínculos automáticos originais?')) {
      clearManualLinks();
      onUpdateLinks({});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#12121a] border border-[#2a2a3e] rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-[#161624] border-b border-[#242436] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30">
                <Link2 className="w-5 h-5 text-[#00d4aa]" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Sincronizador & Vínculo de Colaboradores
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/30">
                    AGENTE ↔ NOME
                  </span>
                </h2>
                <p className="text-xs text-[#9090aa]">
                  Sincronize promotores entre a <strong>Planilha de Rotas (Valorização)</strong> e a <strong>Planilha de Benefícios (Custo RH)</strong> para consolidação exata do DRE.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9090aa] hover:text-white hover:bg-[#202030] transition border border-transparent hover:border-[#303046]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Estatísticas de Conciliação */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#141420] border-b border-[#222234]">
          <div className="p-3 rounded-2xl bg-[#181826] border border-[#26263a]">
            <div className="text-[10px] text-[#9090aa] font-bold uppercase">Taxa de Conciliação</div>
            <div className="text-xl font-black text-[#00d4aa] mt-0.5">
              {estatisticas.taxaConciliacao}%
            </div>
            <div className="text-[10px] text-[#5a5a75] mt-0.5">
              {estatisticas.totalSincronizados} de {Math.max(estatisticas.totalAgentes, estatisticas.totalBeneficios)} colaboradores
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#181826] border border-[#26263a]">
            <div className="text-[10px] text-[#9090aa] font-bold uppercase">Sincronizados Automaticamente</div>
            <div className="text-xl font-black text-white mt-0.5">
              {estatisticas.totalAutomaticos}
            </div>
            <div className="text-[10px] text-[#00d4aa] mt-0.5 font-medium">Reconhecimento inteligente</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#181826] border border-[#26263a]">
            <div className="text-[10px] text-[#9090aa] font-bold uppercase">Vínculos Manuais</div>
            <div className="text-xl font-black text-[#a78bfa] mt-0.5">
              {estatisticas.totalManuais}
            </div>
            <div className="text-[10px] text-[#9090aa] mt-0.5">Salvos no LocalStorage</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#181826] border border-[#ff6b6b]/30">
            <div className="text-[10px] text-[#ff6b6b] font-bold uppercase">Pendentes de Vínculo</div>
            <div className="text-xl font-black text-[#ff6b6b] mt-0.5">
              {estatisticas.totalPendentesRotas + estatisticas.totalPendentesBeneficios}
            </div>
            <div className="text-[10px] text-[#9090aa] mt-0.5">
              {estatisticas.totalPendentesRotas} rotas / {estatisticas.totalPendentesBeneficios} custos
            </div>
          </div>
        </div>

        {/* Filtros e Abas */}
        <div className="p-4 bg-[#141420] border-b border-[#222234] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex rounded-xl bg-[#1a1a28] border border-[#2a2a3e] p-1 w-full sm:w-auto text-xs">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'pendentes' ? 'bg-[#ff6b6b]/20 text-[#ff6b6b]' : 'text-[#9090aa] hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Pendentes ({estatisticas.totalPendentesRotas + estatisticas.totalPendentesBeneficios})
            </button>
            <button
              onClick={() => setActiveTab('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'todos' ? 'bg-[#2a2a3e] text-white' : 'text-[#9090aa] hover:text-white'
              }`}
            >
              Todos ({vinculosList.length})
            </button>
            <button
              onClick={() => setActiveTab('manuais')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'manuais' ? 'bg-[#6c63ff]/20 text-[#a78bfa]' : 'text-[#9090aa] hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Manuais ({estatisticas.totalManuais})
            </button>
            <button
              onClick={() => setActiveTab('automaticos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'automaticos' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'text-[#9090aa] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Automáticos ({estatisticas.totalAutomaticos})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#9090aa] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por qualquer nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#181826] border border-[#2a2a3e] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
              />
            </div>

            {estatisticas.totalManuais > 0 && (
              <button
                onClick={handleLimparTodos}
                title="Limpar todos os vínculos manuais e restaurar auto-match"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#ff6b6b] hover:bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Resetar Manuais
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo Principal com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PENDENTES */}
          {activeTab === 'pendentes' && (
            <div className="space-y-6">
              {/* Seção 1: Agentes de Rotas sem Benefício */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UserX className="w-4 h-4 text-[#ffd166]" />
                    Agentes da Planilha de Rotas SEM CUSTO ({pendentesRotas.length})
                  </h3>
                  <span className="text-[11px] text-[#9090aa]">
                    Estes promotores constam faturando, mas não possuem folha de pagamento linkada
                  </span>
                </div>

                {pendentesRotas.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#151522] border border-[#222234] text-center text-xs text-[#00d4aa] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Todos os agentes de rotas foram vinculados com sucesso!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendentesRotas
                      .filter((a) => !searchTerm || a.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((ag) => {
                        const topSugestoes = findTopCandidates(ag.nome, undefined, pendentesBeneficios, 3);
                        const selectedBen = selectedAgentToLink[ag.nome] || (topSugestoes[0]?.item.nome ?? '');

                        return (
                          <div
                            key={ag.nome}
                            className="p-4 rounded-2xl bg-[#161624] border border-[#26263a] hover:border-[#ffd166]/40 transition space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-white">{ag.nome}</span>
                                <div className="text-[10px] text-[#9090aa] flex items-center gap-3 mt-0.5">
                                  <span>{ag.visitas} visitas semanais</span>
                                  <span>•</span>
                                  <span className="text-[#00d4aa] font-semibold">{fmt(ag.valorSemanal * 4.334)} / mês</span>
                                </div>
                              </div>

                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffd166]/15 text-[#ffd166] font-semibold border border-[#ffd166]/30">
                                Sem Vínculo de Benefício
                              </span>
                            </div>

                            {/* Sugestões inteligentes */}
                            {topSugestoes.length > 0 && topSugestoes[0].score > 40 && (
                              <div className="text-[11px] bg-[#1a1a2c] p-2.5 rounded-xl border border-[#2e2e46] flex flex-wrap items-center gap-2">
                                <span className="text-[#a78bfa] font-bold flex items-center gap-1 text-[10px]">
                                  <Sparkles className="w-3 h-3 text-[#a78bfa]" /> Sugestão IA:
                                </span>
                                {topSugestoes.map((sug) => (
                                  <button
                                    key={sug.item.nome}
                                    onClick={() => handleVincular(ag.nome, sug.item.nome)}
                                    className="px-2.5 py-1 rounded-lg bg-[#222238] hover:bg-[#6c63ff]/20 hover:text-[#a78bfa] text-white border border-[#30304a] text-[10px] font-semibold transition flex items-center gap-1.5"
                                  >
                                    <span>{sug.item.nome}</span>
                                    <span className="text-[#00d4aa] text-[9px]">({sug.score}%)</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Ação de Vínculo Manual com Select */}
                            <div className="flex items-center gap-2 pt-1 border-t border-[#202032]">
                              <select
                                value={selectedBen}
                                onChange={(e) =>
                                  setSelectedAgentToLink((prev) => ({
                                    ...prev,
                                    [ag.nome]: e.target.value,
                                  }))
                                }
                                className="flex-1 bg-[#12121a] border border-[#2a2a3e] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
                              >
                                <option value="">Selecione um Colaborador da Planilha de Benefícios...</option>
                                {colaboradoresBeneficios.map((b) => (
                                  <option key={b.nome} value={b.nome}>
                                    {b.nome} ({fmt(b.custoTotalPromotor)})
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => handleVincular(ag.nome, selectedBen)}
                                disabled={!selectedBen}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00d4aa] to-[#00b388] text-[#0d0d12] font-black text-xs hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
                              >
                                <Link2 className="w-3.5 h-3.5" /> Vincular
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Seção 2: Colaboradores da Planilha de Benefícios sem Rotas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UserX className="w-4 h-4 text-[#ff6b6b]" />
                    Colaboradores da Planilha de Benefícios SEM ROTA ({pendentesBeneficios.length})
                  </h3>
                  <span className="text-[11px] text-[#9090aa]">
                    Estes promotores possuem custo de RH e VT, mas não foram localizados gerando faturamento
                  </span>
                </div>

                {pendentesBeneficios.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#151522] border border-[#222234] text-center text-xs text-[#00d4aa] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Todos os colaboradores de benefícios estão vinculados a rotas!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendentesBeneficios
                      .filter((b) => !searchTerm || b.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((b) => {
                        return (
                          <div
                            key={b.nome}
                            className="p-3.5 rounded-2xl bg-[#161624] border border-[#26263a] hover:border-[#ff6b6b]/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">{b.nome}</div>
                              <div className="text-[10px] text-[#9090aa] flex items-center gap-3 mt-0.5">
                                <span>Salário: {fmt(b.salarioBase)}</span>
                                <span>•</span>
                                <span>VT: {fmt(b.vtTotal)}</span>
                                <span>•</span>
                                <span className="text-[#ff6b6b] font-semibold">Custo Total: {fmt(b.custoTotalPromotor)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <select
                                id={`select-ag-${b.id}`}
                                className="bg-[#12121a] border border-[#2a2a3e] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00d4aa]"
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleVincular(e.target.value, b.nome);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="">Vincular a um Agente de Rotas...</option>
                                {agentesRotas.map((ag) => (
                                  <option key={ag.nome} value={ag.nome}>
                                    {ag.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2, 3, 4: TABELA CONSOLIDADA DE VÍNCULOS */}
          {activeTab !== 'pendentes' && (
            <div className="overflow-x-auto rounded-2xl border border-[#242436] bg-[#141420]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#181826] text-[#9090aa] uppercase text-[10px] tracking-wider border-b border-[#242436]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Agente (Rotas)</th>
                    <th className="py-3 px-4 font-semibold">Colaborador (Benefícios)</th>
                    <th className="py-3 px-4 font-semibold text-center">Status / Score</th>
                    <th className="py-3 px-4 font-semibold text-right">Faturamento</th>
                    <th className="py-3 px-4 font-semibold text-right">Custo Total</th>
                    <th className="py-3 px-4 font-semibold text-right">Margem</th>
                    <th className="py-3 px-4 font-semibold text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2e]">
                  {vinculosList
                    .filter((v) => {
                      if (activeTab === 'manuais' && v.tipo !== 'manual') return false;
                      if (activeTab === 'automaticos' && v.tipo !== 'automatico') return false;
                      if (searchTerm) {
                        const q = searchTerm.toLowerCase();
                        return v.agente.toLowerCase().includes(q) || v.nomeBeneficio.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((v) => {
                      const margem = v.faturamentoMensal - v.custoTotalMensal;
                      const margemPct = v.faturamentoMensal > 0 ? (margem / v.faturamentoMensal) * 100 : -100;

                      return (
                        <tr key={v.agente} className="hover:bg-[#181826]/60 transition">
                          <td className="py-3 px-4 font-bold text-white">{v.agente}</td>
                          <td className="py-3 px-4 text-[#e0e0ea]">{v.nomeBeneficio}</td>
                          <td className="py-3 px-4 text-center">
                            {v.tipo === 'manual' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a78bfa] text-[10px] font-bold border border-[#6c63ff]/30">
                                <Link2 className="w-3 h-3" /> Manual
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] text-[10px] font-bold border border-[#00d4aa]/30">
                                <Sparkles className="w-3 h-3" /> Auto ({v.score}%)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#00d4aa] font-semibold">
                            {fmt(v.faturamentoMensal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#ff6b6b]">
                            {fmt(v.custoTotalMensal)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={margem >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}>
                              {fmt(margem)} ({Math.round(margemPct)}%)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {v.tipo === 'manual' ? (
                              <button
                                onClick={() => handleDesvincular(v.agente)}
                                title="Remover vínculo manual"
                                className="p-1.5 rounded-lg text-[#ff6b6b] hover:bg-[#ff6b6b]/15 transition border border-[#ff6b6b]/30"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  // Permite forçar override manual
                                  const novo = prompt(`Substituir colaborador para ${v.agente}:`, v.nomeBeneficio);
                                  if (novo && novo !== v.nomeBeneficio) {
                                    handleVincular(v.agente, novo);
                                  }
                                }}
                                title="Alterar vínculo manual"
                                className="text-[10px] text-[#9090aa] hover:text-white underline"
                              >
                                Alterar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé com Informações de Fechamento */}
        <div className="p-4 bg-[#141420] border-t border-[#222234] flex items-center justify-between">
          <div className="text-xs text-[#9090aa] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00d4aa]" />
            <span>Os vínculos são aplicados instantaneamente a todo o DRE, gráficos e exportações XLS.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#202030] hover:bg-[#28283c] border border-[#303046] text-xs font-bold text-white transition shadow-md"
          >
            Fechar Sincronizador
          </button>
        </div>
      </div>
    </div>
  );
};
