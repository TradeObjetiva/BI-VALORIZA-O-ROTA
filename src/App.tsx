import React, { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { UploadZone, AppMode } from './components/UploadZone';
import { FiltersBar } from './components/FiltersBar';
import { KPISection } from './components/KPISection';
import { SimulatorPanel } from './components/SimulatorPanel';
import { CostAndEfficiencySection } from './components/CostAndEfficiencySection';
import { ChartsSection } from './components/ChartsSection';
import { RedeRegiaoTables } from './components/RedeRegiaoTables';
import { AgenteRankingTable } from './components/AgenteRankingTable';
import { AgentMatrixGrid } from './components/AgentMatrixGrid';
import { FrequencyAndLojasSection } from './components/FrequencyAndLojasSection';
import { IdeasRoadmapModal } from './components/IdeasRoadmapModal';
import { SavedBasesModal } from './components/SavedBasesModal';
import { ExportPickerModal } from './components/ExportPickerModal';

// Novos componentes para Custo Operacional e Confronto
import { BenefitDashboard } from './components/BenefitDashboard';
import { ConfrontoDashboard } from './components/ConfrontoDashboard';
import { CollaboratorLinkerModal } from './components/CollaboratorLinkerModal';

import { DEMO_TRADE_DATA } from './data/demoData';
import { DEMO_BENEFIT_DATA } from './data/demoBenefitData';
import {
  RawTradeRow,
  TradeRecord,
  FilterState,
  SimulationConfig,
} from './types/trade';
import { BenefitRecord } from './types/benefit';
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
  calculateBenefitKPIs,
  calculateConfronto,
  getManualLinks,
} from './utils/benefitCalculations';
import {
  getDefaultOrLastSheet,
  persistLastUploadedSheet,
  getAllSavedSheets,
} from './utils/storageService';
import { ExportTableId } from './utils/exportTables';

export default function App() {
  // Modo atual selecionado ('valorizacao' | 'custo' | 'confronto')
  const [currentMode, setCurrentMode] = useState<AppMode>('valorizacao');
  const [showUploadScreen, setShowUploadScreen] = useState<boolean>(true);

  // Dados de Valorização (Rotas)
  const [rawData, setRawData] = useState<RawTradeRow[]>([]);
  const [fileName, setFileName] = useState<string>('PLANILHA DE VALORIZAÇÃO ROTEIRO.xlsx');
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState<boolean>(false);
  const [hasSavedBases, setHasSavedBases] = useState<boolean>(false);

  // Dados de Custo Operacional (Benefícios e Folha)
  const [benefitData, setBenefitData] = useState<BenefitRecord[]>([]);
  const [benefitFileName, setBenefitFileName] = useState<string>(
    'PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx'
  );
  const [isBenefitDemo, setIsBenefitDemo] = useState<boolean>(false);

  // Modais e Painéis
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState<boolean>(false);
  const [isBasesModalOpen, setIsBasesModalOpen] = useState<boolean>(false);
  const [isLinkerModalOpen, setIsLinkerModalOpen] = useState<boolean>(false);
  const [exportPickerMode, setExportPickerMode] = useState<'excel' | 'pdf' | null>(null);

  // Vínculos Manuais de Sincronização (AGENTE -> NOME)
  const [manualLinks, setManualLinks] = useState<Record<string, string>>(() => getManualLinks());

  // Checagem inicial do armazenamento local (IndexedDB)
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
        setShowUploadScreen(true);
        setHasCheckedStorage(true);
      }
    }
    checkStorage();
  }, []);

  // Filtros de Rotas
  const [filters, setFilters] = useState<FilterState>({
    form: '',
    rede: '',
    agente: '',
    regiao: '',
    freq: '',
    forms: null,
    redes: null,
    agentes: null,
    regioes: null,
    freqs: null,
    search: '',
  });

  // What-If Simulation Config
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    active: false,
    percentage: 0,
    scopeType: 'todos',
    scopeValue: '',
  });

  // Carregar Planilha de Valorização
  const handleDataLoaded = useCallback(
    async (rows: RawTradeRow[], name: string, isDemoData = false) => {
      setRawData(rows);
      setFileName(name);
      setIsDemo(isDemoData);
      setCurrentMode('valorizacao');
      setShowUploadScreen(false);
      setFilters({
        form: '',
        rede: '',
        agente: '',
        regiao: '',
        freq: '',
        forms: null,
        redes: null,
        agentes: null,
        regioes: null,
        freqs: null,
        search: '',
      });
      setSimConfig({
        active: false,
        percentage: 0,
        scopeType: 'todos',
        scopeValue: '',
      });

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

  // Carregar Planilha de Custo Operacional (Benefícios)
  const handleBenefitDataLoaded = useCallback(
    (records: BenefitRecord[], name: string, isDemoData = false) => {
      setBenefitData(records);
      setBenefitFileName(name);
      setIsBenefitDemo(isDemoData);
      setCurrentMode('custo');
      setShowUploadScreen(false);
    },
    []
  );

  // Carregar Confronto de Ambos
  const handleConfrontoLoaded = useCallback(
    (tradeRows: RawTradeRow[], tradeName: string, bRecords: BenefitRecord[], bName: string) => {
      setRawData(tradeRows);
      setFileName(tradeName);
      setBenefitData(bRecords);
      setBenefitFileName(bName);
      setCurrentMode('confronto');
      setShowUploadScreen(false);
    },
    []
  );

  // Demo de Valorização
  const handleLoadDemo = useCallback(() => {
    handleDataLoaded(DEMO_TRADE_DATA, 'base_demonstrativa_objetiva.xlsx', true);
  }, [handleDataLoaded]);

  // Reset para Tela de Seleção (UploadZone com os 3 botões)
  const handleReset = useCallback(() => {
    setShowUploadScreen(true);
  }, []);

  // Transforma registros brutos de valorização
  const transformedRecords = useMemo<TradeRecord[]>(() => {
    const dataToUse = rawData.length > 0 ? rawData : (currentMode === 'confronto' ? DEMO_TRADE_DATA : []);
    return dataToUse.map((row, idx) => transformRawRow(row, idx));
  }, [rawData, currentMode]);

  // Lista de filtros para valorização
  const filterOptions = useMemo(() => {
    const forms = Array.from(new Set(transformedRecords.map((r) => r.form).filter(Boolean))).sort();
    const redes = Array.from(new Set(transformedRecords.map((r) => r.rede).filter(Boolean))).sort();
    const agentes = Array.from(new Set(transformedRecords.map((r) => r.agente).filter(Boolean))).sort();
    const regioes = Array.from(new Set(transformedRecords.map((r) => r.regiao).filter(Boolean))).sort();
    const freqs = Array.from(new Set(transformedRecords.map((r) => r.freqSemanal).filter(Boolean))).sort();
    return { forms, redes, agentes, regioes, freqs };
  }, [transformedRecords]);

  // Registros de valorização filtrados
  const filteredRecords = useMemo(() => {
    return transformedRecords.filter((rec) => {
      // Região (Multi-seleção com fallback para single)
      if (filters.regioes !== null && filters.regioes !== undefined) {
        if (!filters.regioes.includes(rec.regiao)) return false;
      } else if (filters.regiao && rec.regiao !== filters.regiao) {
        return false;
      }

      // Rede (Multi-seleção com fallback para single)
      if (filters.redes !== null && filters.redes !== undefined) {
        if (!filters.redes.includes(rec.rede)) return false;
      } else if (filters.rede && rec.rede !== filters.rede) {
        return false;
      }

      // Formulário / Marca (Multi-seleção com fallback para single)
      if (filters.forms !== null && filters.forms !== undefined) {
        if (!filters.forms.includes(rec.form)) return false;
      } else if (filters.form && rec.form !== filters.form) {
        return false;
      }

      // Agente / Promotor (Multi-seleção com fallback para single)
      if (filters.agentes !== null && filters.agentes !== undefined) {
        if (!filters.agentes.includes(rec.agente)) return false;
      } else if (filters.agente && rec.agente !== filters.agente) {
        return false;
      }

      // Frequência Semanal (Multi-seleção com fallback para single)
      if (filters.freqs !== null && filters.freqs !== undefined) {
        if (!filters.freqs.includes(rec.freqSemanal)) return false;
      } else if (filters.freq && rec.freqSemanal !== filters.freq) {
        return false;
      }

      // Busca textual livre
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const str = `${rec.form} ${rec.rede} ${rec.agente} ${rec.cpf} ${rec.regiao} ${rec.local}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [transformedRecords, filters]);

  // Registros com simulação
  const simulatedRecords = useMemo(() => {
    return filteredRecords.map((rec) => applySimulationToRecord(rec, simConfig));
  }, [filteredRecords, simConfig]);

  // KPIs de Valorização
  const baseKPIs = useMemo(() => calculateKPIs(filteredRecords), [filteredRecords]);
  const activeKPIs = useMemo(() => calculateKPIs(simulatedRecords), [simulatedRecords]);

  // Análises de Valorização
  const redesData = useMemo(() => calculateRedeAnalysis(simulatedRecords), [simulatedRecords]);
  const regioesData = useMemo(() => calculateRegiaoAnalysis(simulatedRecords), [simulatedRecords]);
  const formsData = useMemo(() => calculateFormAnalysis(simulatedRecords), [simulatedRecords]);
  const agentsData = useMemo(() => calculateAgentAnalysis(simulatedRecords), [simulatedRecords]);
  const matrixData = useMemo(() => calculateMatrixData(simulatedRecords), [simulatedRecords]);
  const lojasAnalysis = useMemo(() => calculateLojasFormsAnalysis(simulatedRecords), [simulatedRecords]);
  const freqAnalysis = useMemo(() => calculateFreqCrossAnalysis(simulatedRecords), [simulatedRecords]);

  // Dados e KPIs de Custo Operacional (Benefícios)
  const activeBenefitRecords = useMemo(() => {
    if (benefitData.length > 0) return benefitData;
    if (currentMode === 'custo' || currentMode === 'confronto') return DEMO_BENEFIT_DATA;
    return [];
  }, [benefitData, currentMode]);

  const benefitKPIs = useMemo(
    () => calculateBenefitKPIs(activeBenefitRecords),
    [activeBenefitRecords]
  );

  // Dados e KPIs de Confronto
  const confrontoResult = useMemo(
    () => calculateConfronto(transformedRecords, activeBenefitRecords, manualLinks),
    [transformedRecords, activeBenefitRecords, manualLinks]
  );

  // Troca de Modo com validação
  const handleSelectMode = (mode: AppMode) => {
    setCurrentMode(mode);
    if (mode === 'custo' && benefitData.length === 0) {
      // Pré-carrega o modelo compartilhado se o usuário selecionar custo sem ter feito upload
      setBenefitData(DEMO_BENEFIT_DATA);
      setBenefitFileName('PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx');
      setIsBenefitDemo(true);
      setShowUploadScreen(false);
    } else if (mode === 'confronto' && (rawData.length === 0 || benefitData.length === 0)) {
      if (rawData.length === 0) {
        setRawData(DEMO_TRADE_DATA);
        setFileName('PLANILHA DE VALORIZAÇÃO ROTEIRO.xlsx');
      }
      if (benefitData.length === 0) {
        setBenefitData(DEMO_BENEFIT_DATA);
        setBenefitFileName('PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx');
      }
      setShowUploadScreen(false);
    }
  };

  // Exportar Excel da Valorização
  const handleExportExcel = (selected?: ExportTableId[]) => {
    const wb = XLSX.utils.book_new();
    const rows = filteredRecords.map((r) => ({
      Formulário: r.form,
      Rede: r.rede,
      Agente: r.agente,
      CPF: r.cpf,
      Região: r.regiao,
      Local: r.local,
      'Freq. Semanal': r.freqSemanal,
      'Visitas Semanal': r.visitasSemanais,
      'Horas/Visita': r.horasPorVisita,
      'Horas Semanais': r.horasSemanais,
      'Horas Mensais': r.horasMensais,
      'Valor Unitário': r.valorUnitario,
      'Valor Semanal': r.valorSemanal,
      'Valor Mensal': r.valorMensal,
      'Custo/Visita': r.custoPorVisita,
      'R$/Hora': r.valorPorHora,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Valorização');
    XLSX.writeFile(wb, `valorizacao_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrintPDF = (selected?: ExportTableId[]) => {
    window.print();
  };

  // Aguarda leitura do IndexedDB antes de renderizar
  if (!hasCheckedStorage) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Renderiza a Tela Inicial de Upload com os 3 BOTÕES PERSONALIZADOS NO CENTRO
  // quando solicitado ou quando não houver dados ativos
  const hasDataForCurrentMode =
    (currentMode === 'valorizacao' && rawData.length > 0) ||
    (currentMode === 'custo' && activeBenefitRecords.length > 0) ||
    (currentMode === 'confronto' && transformedRecords.length > 0 && activeBenefitRecords.length > 0);

  if (showUploadScreen || !hasDataForCurrentMode) {
    return (
      <UploadZone
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onDataLoaded={handleDataLoaded}
        onBenefitDataLoaded={handleBenefitDataLoaded}
        onConfrontoLoaded={handleConfrontoLoaded}
        onLoadDemo={handleLoadDemo}
        cachedRotaName={rawData.length > 0 ? fileName : null}
        onOpenCachedRota={() => setShowUploadScreen(false)}
        onOpenIdeas={() => setIsIdeasModalOpen(true)}
        onOpenBasesModal={() => setIsBasesModalOpen(true)}
        hasSavedBases={hasSavedBases}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] text-white flex flex-col font-sans selection:bg-[#6c63ff]/30">
      {/* Header com os 3 seletores de modo e ações rápidas */}
      <Header
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        hasValorizacaoData={rawData.length > 0}
        hasCustoData={benefitData.length > 0}
        fileName={
          currentMode === 'custo'
            ? benefitFileName
            : currentMode === 'confronto'
            ? `${fileName} × ${benefitFileName}`
            : fileName
        }
        isDemo={currentMode === 'custo' ? isBenefitDemo : isDemo}
        totalRecords={
          currentMode === 'custo'
            ? activeBenefitRecords.length
            : currentMode === 'confronto'
            ? confrontoResult.records.length
            : filteredRecords.length
        }
        onReset={handleReset}
        onOpenIdeas={() => setIsIdeasModalOpen(true)}
        onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
        isSimulatorOpen={isSimulatorOpen}
        onOpenBasesModal={() => setIsBasesModalOpen(true)}
        onExportExcel={() => setExportPickerMode('excel')}
        onPrintPDF={() => setExportPickerMode('pdf')}
        onLoadDemo={handleLoadDemo}
      />

      {/* Conteúdo Principal do Dashboard Conforme o Modo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ======================================================== */}
        {/* MODO 2: CUSTO OPERACIONAL (Benefícios & Encargos)        */}
        {/* ======================================================== */}
        {currentMode === 'custo' && (
          <BenefitDashboard
            benefitRecords={activeBenefitRecords}
            benefitKPIs={benefitKPIs}
            fileName={benefitFileName}
          />
        )}

        {/* ======================================================== */}
        {/* MODO 3: CONFRONTO DE VALORIZAÇÃO E CUSTO (DRE & Margem)  */}
        {/* ======================================================== */}
        {currentMode === 'confronto' && (
          <ConfrontoDashboard
            confrontoRecords={confrontoResult.records}
            confrontoKPIs={confrontoResult.kpis}
            rotaFileName={fileName}
            custoFileName={benefitFileName}
            onOpenLinkerModal={() => setIsLinkerModalOpen(true)}
          />
        )}

        {/* ======================================================== */}
        {/* MODO 1: ANÁLISE DE VALORIZAÇÃO (Rotas & Pesquisas)       */}
        {/* ======================================================== */}
        {currentMode === 'valorizacao' && (
          <>
            {/* Barra de Filtros */}
            <FiltersBar
              filters={filters}
              onFilterChange={(key, val) => setFilters((prev) => ({ ...prev, [key]: val }))}
              onClearFilters={() =>
                setFilters({
                  form: '',
                  rede: '',
                  agente: '',
                  regiao: '',
                  freq: '',
                  forms: null,
                  redes: null,
                  agentes: null,
                  regioes: null,
                  freqs: null,
                  search: '',
                })
              }
              options={filterOptions}
              totalFiltered={filteredRecords.length}
              totalRecords={transformedRecords.length}
            />

            {/* Painel do Simulador What-If */}
            {isSimulatorOpen && (
              <div className="animate-fadeIn">
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
              </div>
            )}

            {/* KPIs Executivos de Valorização */}
            <div className="print-screen-only">
              <KPISection
                kpis={activeKPIs}
                isSimulated={simConfig.active && simConfig.percentage !== 0}
              />
            </div>

            {/* Gráficos: Regiões & Formulários */}
            <ChartsSection
              regioesData={regioesData}
              formsData={formsData}
            />

            {/* Custo por Visita & Eficiência R$/Hora */}
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

            {/* Tabela de Promotores */}
            <AgenteRankingTable
              agentsData={agentsData}
              totalValorMensal={activeKPIs.valorMensalTotal}
            />

            {/* Matriz Cruzada Agente × Rede */}
            <AgentMatrixGrid matrixData={matrixData} />

            {/* Frequência & Lojas */}
            <FrequencyAndLojasSection
              lojasAnalysis={lojasAnalysis}
              freqAnalysis={freqAnalysis}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2c] py-6 px-4 text-center text-xs text-[#5a5a75] bg-[#0c0c10]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            BI Valorização & Trade Intelligence • Base de Cálculo Oficial:{' '}
            <strong className="text-[#a78bfa]">4,334 semanas/mês</strong> × Valor Semanal
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

      {/* Modais Globais */}
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

      <ExportPickerModal
        isOpen={exportPickerMode !== null}
        mode={exportPickerMode || 'excel'}
        onClose={() => setExportPickerMode(null)}
        onConfirm={(selected) => {
          const mode = exportPickerMode;
          setExportPickerMode(null);
          if (mode === 'excel') handleExportExcel(selected);
          if (mode === 'pdf') {
            window.setTimeout(() => handlePrintPDF(selected), 50);
          }
        }}
      />
      <CollaboratorLinkerModal
        isOpen={isLinkerModalOpen}
        onClose={() => setIsLinkerModalOpen(false)}
        tradeRecords={transformedRecords}
        benefitRecords={activeBenefitRecords}
        manualLinks={manualLinks}
        onUpdateLinks={(newLinks) => {
          setManualLinks({ ...newLinks });
        }}
      />
    </div>
  );
}
