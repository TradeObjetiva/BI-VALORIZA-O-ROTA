import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { FiltersBar } from './components/FiltersBar';
import { KPISection } from './components/KPISection';
import { SimulatorPanel } from './components/SimulatorPanel';
import { CostAndEfficiencySection } from './components/CostAndEfficiencySection';
import { ChartsSection } from './components/ChartsSection';
import { RedeRegiaoTables } from './components/RedeRegiaoTables';
import { AgenteRankingTable } from './components/AgenteRankingTable';
import { AgentMatrixGrid } from './components/AgentMatrixGrid';
import { FrequencyAndLojasSection } from './components/FrequencyAndLojasSection';
import { AIAssistantSection } from './components/AIAssistantSection';
import { IdeasRoadmapModal } from './components/IdeasRoadmapModal';
import { SavedBasesModal } from './components/SavedBasesModal';

import { DEMO_TRADE_DATA } from './data/demoData';
import {
  RawTradeRow,
  TradeRecord,
  FilterState,
  SimulationConfig,
} from './types/trade';
import {
  transformRawRow,
  applySimulationToRecord,
  calculateKPIs,
  calculateRedeAnalysis,
  calculateRegiaoAnalysis,
  calculateFormAnalysis,
  calculateAgentAnalysis,
  calculateMatrixData,
  calculateLojasFormsAnalysis,
  calculateFreqCrossAnalysis,
} from './utils/tradeCalculations';
import {
  getDefaultOrLastSheet,
  persistLastUploadedSheet,
  getAllSavedSheets,
} from './utils/storageService';

export default function App() {
  // Raw Data loaded
  const [rawData, setRawData] = useState<RawTradeRow[]>([]);
  const [fileName, setFileName] = useState<string>('base_valorizacao.xlsx');
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState<boolean>(false);
  const [hasSavedBases, setHasSavedBases] = useState<boolean>(false);

  // Modals & Panels visibility
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState<boolean>(false);
  const [isBasesModalOpen, setIsBasesModalOpen] = useState<boolean>(false);

  // Check persistent storage on initial launch
  useEffect(() => {
    async function checkStorage() {
      try {
        const savedList = await getAllSavedSheets();
        setHasSavedBases(savedList.length > 0);

        const defaultSheet = await getDefaultOrLastSheet();
        if (defaultSheet && defaultSheet.data && defaultSheet.data.length > 0) {
          setRawData(defaultSheet.data);
          setFileName(defaultSheet.name || defaultSheet.fileName);
          setIsDemo(false);
        }
      } catch (err) {
        console.error('Erro ao ler base do IndexedDB:', err);
      } finally {
        setHasCheckedStorage(true);
      }
    }
    checkStorage();
  }, []);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    form: '',
    rede: '',
    agente: '',
    regiao: '',
    freq: '',
    search: '',
  });

  // What-If Simulation Config
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    active: false,
    percentage: 0,
    scopeType: 'todos',
    scopeValue: '',
  });

  // Load Excel File Data and persist in IndexedDB
  const handleDataLoaded = useCallback(
    async (rows: RawTradeRow[], name: string, isDemoData = false) => {
      setRawData(rows);
      setFileName(name);
      setIsDemo(isDemoData);
      setFilters({
        form: '',
        rede: '',
        agente: '',
        regiao: '',
        freq: '',
        search: '',
      });
      setSimConfig({
        active: false,
        percentage: 0,
        scopeType: 'todos',
        scopeValue: '',
      });

      // Auto-save user file to browser cache (IndexedDB)
      if (!isDemoData && rows.length > 0) {
        try {
          await persistLastUploadedSheet(name.replace(/\.(xlsx|xls)$/i, ''), name, rows);
          setHasSavedBases(true);
        } catch (e) {
          console.error('Erro ao salvar no cache:', e);
        }
      }
    },
    []
  );

  // Quick Demo Loader
  const handleLoadDemo = useCallback(() => {
    handleDataLoaded(DEMO_TRADE_DATA, 'base_demonstrativa_objetiva.xlsx', true);
  }, [handleDataLoaded]);

  // Reset to Upload Screen
  const handleReset = useCallback(() => {
    setRawData([]);
    setFileName('');
    setIsDemo(false);
  }, []);

  // Filter change helper
  const handleFilterChange = useCallback(
    (key: keyof FilterState, val: string) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: val };
        if (key === 'regiao') {
          next.rede = '';
        }
        return next;
      });
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      form: '',
      rede: '',
      agente: '',
      regiao: '',
      freq: '',
      search: '',
    });
  }, []);

  // Base records transformed from rawData
  const baseRecords: TradeRecord[] = useMemo(() => {
    return rawData.map((r, i) => transformRawRow(r, i));
  }, [rawData]);

  // Filter options derived from rawData
  const filterOptions = useMemo(() => {
    const unique = (rows: TradeRecord[], pick: (r: TradeRecord) => string) =>
      Array.from(new Set(rows.map(pick).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
      );

    const regioes = unique(baseRecords, (r) => r.regiao);

    const afterRegiao = filters.regiao
      ? baseRecords.filter((r) => r.regiao === filters.regiao)
      : baseRecords;
    const redes = unique(afterRegiao, (r) => r.rede);

    const afterRede = filters.rede
      ? afterRegiao.filter((r) => r.rede === filters.rede)
      : afterRegiao;
    const forms = unique(afterRede, (r) => r.form);

    const afterForm = filters.form
      ? afterRede.filter((r) => r.form === filters.form)
      : afterRede;
    const agentes = unique(afterForm, (r) => r.agente);
    const freqs = unique(afterForm, (r) => r.freqSemanal);

    return { forms, redes, agentes, regioes, freqs };
  }, [baseRecords, filters.regiao, filters.rede, filters.form]);

  useEffect(() => {
    setFilters((prev) => {
      const next = { ...prev };
      let changed = false;
      if (prev.rede && !filterOptions.redes.includes(prev.rede)) {
        next.rede = '';
        changed = true;
      }
      if (prev.form && !filterOptions.forms.includes(prev.form)) {
        next.form = '';
        changed = true;
      }
      if (prev.agente && !filterOptions.agentes.includes(prev.agente)) {
        next.agente = '';
        changed = true;
      }
      if (prev.freq && !filterOptions.freqs.includes(prev.freq)) {
        next.freq = '';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [filterOptions]);

  // Filtered records before simulation
  const filteredBaseRecords = useMemo(() => {
    return baseRecords.filter((r) => {
      if (filters.form && r.form !== filters.form) return false;
      if (filters.rede && r.rede !== filters.rede) return false;
      if (filters.agente && r.agente !== filters.agente) return false;
      if (filters.regiao && r.regiao !== filters.regiao) return false;
      if (filters.freq && r.freqSemanal !== filters.freq) return false;
      return true;
    });
  }, [baseRecords, filters]);

  // Records with simulation applied (active for tables, calculations & charts)
  const activeRecords = useMemo(() => {
    return filteredBaseRecords.map((r) => applySimulationToRecord(r, simConfig));
  }, [filteredBaseRecords, simConfig]);

  // Base KPIs (without simulation)
  const baseKPIs = useMemo(() => {
    return calculateKPIs(filteredBaseRecords);
  }, [filteredBaseRecords]);

  // Simulated / Active KPIs
  const activeKPIs = useMemo(() => {
    return calculateKPIs(activeRecords);
  }, [activeRecords]);

  // Aggregated tables data
  const redesData = useMemo(() => {
    return calculateRedeAnalysis(activeRecords);
  }, [activeRecords]);

  const regioesData = useMemo(() => {
    return calculateRegiaoAnalysis(activeRecords);
  }, [activeRecords]);

  const formsData = useMemo(() => {
    return calculateFormAnalysis(activeRecords);
  }, [activeRecords]);

  const agentsData = useMemo(() => {
    return calculateAgentAnalysis(activeRecords);
  }, [activeRecords]);

  const matrixData = useMemo(() => {
    return calculateMatrixData(activeRecords);
  }, [activeRecords]);

  const lojasAnalysis = useMemo(() => {
    return calculateLojasFormsAnalysis(activeRecords);
  }, [activeRecords]);

  const freqAnalysis = useMemo(() => {
    return calculateFreqCrossAnalysis(activeRecords);
  }, [activeRecords]);

  // Export consolidated data to Excel (.xlsx)
  const handleExportExcel = useCallback(() => {
    if (activeRecords.length === 0) return;

    const wb = XLSX.utils.book_new();

    // 1. Base Filtrada
    const sheetData = activeRecords.map((r) => ({
      FORMULÁRIO: r.form,
      REDE: r.rede,
      AGENTE: r.agente,
      CPF: r.cpf,
      REGIÃO: r.regiao,
      LOCAL_PDV: r.local,
      FREQ_SEMANAL: r.freqSemanal,
      VISITAS_SEM: r.visitasSemanais,
      HORAS_VISITA: r.horasPorVisita,
      HORAS_SEM: r.horasSemanais,
      VALOR_SEMANAL: r.valorSemanal,
      VALOR_MENSAL_52_12: r.valorMensal,
      CUSTO_POR_VISITA: r.custoPorVisita,
      VALOR_POR_HORA: r.valorPorHora,
    }));
    const wsBase = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, wsBase, 'Base_Valorizacao');

    // 2. Ranking Redes
    const redesExport = redesData.map((rd) => ({
      REDE: rd.label,
      VALOR_MENSAL: rd.value,
      SHARE_PCT: `${rd.pct.toFixed(2)}%`,
      VISITAS_SEMANAIS: rd.visitasSem,
      CUSTO_MEDIO_VISITA: rd.custoVisita,
      PDVS_UNICOS: rd.locais,
      PROMOTORES_ALOCADOS: rd.agentesCount,
    }));
    const wsRedes = XLSX.utils.json_to_sheet(redesExport);
    XLSX.utils.book_append_sheet(wb, wsRedes, 'Resumo_Redes');

    // 3. Ranking Agentes
    const agentesExport = agentsData.map((ag) => ({
      PROMOTOR: ag.nome,
      CPF: ag.cpf,
      REGIAO: ag.regiao,
      VALOR_MENSAL: ag.valor,
      HORAS_SEM: ag.horasSemanais,
      VALOR_POR_HORA: ag.valorHora,
      CONCENTRACAO_PRINCIPAL_REDE: `${ag.concentracaoPct.toFixed(1)}% (${ag.topRedeName})`,
      RISCO_CONCENTRACAO_50: ag.isConcentrado ? 'SIM (Risco CLT)' : 'NÃO',
      RISCO_HORAS_44: ag.isOverworked ? 'SIM (>44h)' : 'NÃO',
      PDVS_ATENDIDOS: ag.locais,
      FORMS_ATENDIDOS: ag.forms,
    }));
    const wsAgentes = XLSX.utils.json_to_sheet(agentesExport);
    XLSX.utils.book_append_sheet(wb, wsAgentes, 'Resumo_Promotores');

    XLSX.writeFile(wb, `BI_Valorizacao_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [activeRecords, redesData, agentsData]);

  // Print PDF Trigger
  const handlePrintPDF = useCallback(() => {
    window.print();
  }, []);

  // If no data is loaded yet, show the Upload Screen
  if (!hasCheckedStorage) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#9090aa]">Carregando última planilha salva no navegador...</p>
        </div>
      </div>
    );
  }

  if (rawData.length === 0) {
    return (
      <>
        <UploadZone
          onDataLoaded={handleDataLoaded}
          onLoadDemo={handleLoadDemo}
          onOpenIdeas={() => setIsIdeasModalOpen(true)}
          onOpenBasesModal={() => setIsBasesModalOpen(true)}
          hasSavedBases={hasSavedBases}
        />
        <IdeasRoadmapModal
          isOpen={isIdeasModalOpen}
          onClose={() => setIsIdeasModalOpen(false)}
        />
        <SavedBasesModal
          isOpen={isBasesModalOpen}
          onClose={() => setIsBasesModalOpen(false)}
          currentData={rawData}
          currentFileName={fileName}
          onSelectBase={(rows, name) => {
            handleDataLoaded(rows, name, false);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-[#f0f0f5] flex flex-col font-sans selection:bg-[#6c63ff]/30 selection:text-white">
      {/* Sticky Header */}
      <Header
        fileName={fileName}
        isDemo={isDemo}
        totalRecords={rawData.length}
        onReset={handleReset}
        onOpenIdeas={() => setIsIdeasModalOpen(true)}
        onToggleSimulator={() => setIsSimulatorOpen((prev) => !prev)}
        isSimulatorOpen={isSimulatorOpen}
        onOpenAIModal={() => {
          const aiElem = document.getElementById('ai-advisor-section');
          aiElem?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenBasesModal={() => setIsBasesModalOpen(true)}
        onExportExcel={handleExportExcel}
        onPrintPDF={handlePrintPDF}
        onLoadDemo={handleLoadDemo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Dynamic Filters */}
        <FiltersBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          options={filterOptions}
          totalFiltered={activeRecords.length}
          totalRecords={baseRecords.length}
        />

        {/* What-If Simulator Panel (Collapsible / Toggleable) */}
        {isSimulatorOpen && (
          <SimulatorPanel
            config={simConfig}
            onChange={setSimConfig}
            baseValorMensal={baseKPIs.valorMensalTotal}
            simValorMensal={activeKPIs.valorMensalTotal}
            baseCustoVisita={baseKPIs.custoMedioVisita}
            simCustoVisita={activeKPIs.custoMedioVisita}
            baseValorHora={baseKPIs.valorPorHoraMedio}
            simValorHora={activeKPIs.valorPorHoraMedio}
            redesList={filterOptions.redes}
            regioesList={filterOptions.regioes}
            formsList={filterOptions.forms}
            onClose={() => setIsSimulatorOpen(false)}
          />
        )}

        {/* 8 Core KPIs */}
        <KPISection
          kpis={activeKPIs}
          isSimulated={simConfig.active && simConfig.percentage !== 0}
        />

        {/* AI Trade Advisor & Rule-based Insights */}
        <div id="ai-advisor-section">
          <AIAssistantSection
            kpis={activeKPIs}
            agentsData={agentsData}
            redesData={redesData}
            regioesData={regioesData}
            isSimulated={simConfig.active && simConfig.percentage !== 0}
          />
        </div>

        {/* Charts: Região & Form */}
        <ChartsSection
          regioesData={regioesData}
          formsData={formsData}
        />

        {/* Blocos 2.3 & 1.3: Custo por Visita & Eficiência de Horas */}
        <CostAndEfficiencySection
          redesData={redesData}
          agentsData={agentsData}
          mediaCustoVisitaGeral={activeKPIs.custoMedioVisita}
          mediaHoraGeral={activeKPIs.valorPorHoraMedio}
          totalVisitasSemanais={activeKPIs.totalVisitasSemanais}
          totalHorasSemanais={activeKPIs.totalHorasSemanais}
        />

        {/* Rankings: Redes e Regiões */}
        <RedeRegiaoTables
          redesData={redesData}
          regioesData={regioesData}
          totalValorMensal={activeKPIs.valorMensalTotal}
        />

        {/* Bloco 1.1: Tabela de Promotores com Alerta de Concentração */}
        <AgenteRankingTable
          agentsData={agentsData}
          totalValorMensal={activeKPIs.valorMensalTotal}
        />

        {/* Bloco 1.6: Matriz Cruzada Agente × Rede */}
        <AgentMatrixGrid matrixData={matrixData} />

        {/* Lojas por Formulários & Cruzamento Frequência × Marca */}
        <FrequencyAndLojasSection
          lojasAnalysis={lojasAnalysis}
          freqAnalysis={freqAnalysis}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2c] py-6 px-4 text-center text-xs text-[#5a5a75] bg-[#0c0c10]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            BI Valorização & Trade Intelligence • Base de Cálculo:{' '}
            <strong className="text-[#a78bfa]">52 semanas ÷ 12 meses</strong> (~4,33 semanas/mês)
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsIdeasModalOpen(true)}
              className="text-[#ffd166] hover:underline font-semibold"
            >
              Banco de Ideias
            </button>
            <span className="text-[#333348]">•</span>
            <span>Objetiva Mkt Intelligence</span>
          </div>
        </div>
      </footer>

      {/* Ideas Roadmap Modal */}
      <IdeasRoadmapModal
        isOpen={isIdeasModalOpen}
        onClose={() => setIsIdeasModalOpen(false)}
      />

      {/* Saved Bases Modal */}
      <SavedBasesModal
        isOpen={isBasesModalOpen}
        onClose={() => setIsBasesModalOpen(false)}
        currentData={rawData}
        currentFileName={fileName}
        onSelectBase={(rows, name) => {
          handleDataLoaded(rows, name, false);
        }}
      />
    </div>
  );
}
