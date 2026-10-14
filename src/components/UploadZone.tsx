import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  TrendingUp,
  DollarSign,
  Scale,
  CheckCircle2,
  UploadCloud,
  ArrowRight,
  Database,
  Layers,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawTradeRow } from '../types/trade';
import { BenefitRecord } from '../types/benefit';
import { parseBenefitWorkbook, auditarConciliacaoNomes } from '../utils/benefitCalculations';
import { transformRawRow, fmt } from '../utils/tradeCalculations';
import { DEMO_BENEFIT_DATA } from '../data/demoBenefitData';
import { DEMO_TRADE_DATA } from '../data/demoData';

export type AppMode = 'valorizacao' | 'custo' | 'confronto';

interface UploadZoneProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onDataLoaded: (rows: RawTradeRow[], fileName: string, isDemo?: boolean) => void;
  onBenefitDataLoaded: (records: BenefitRecord[], fileName: string, isDemo?: boolean) => void;
  onConfrontoLoaded: (
    tradeRows: RawTradeRow[],
    tradeName: string,
    benefitRecords: BenefitRecord[],
    benefitName: string
  ) => void;
  onLoadDemo?: () => void;
  cachedRotaName?: string | null;
  onOpenCachedRota?: () => void;
  onOpenIdeas?: () => void;
  onOpenBasesModal?: () => void;
  hasSavedBases?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  currentMode,
  onSelectMode,
  onDataLoaded,
  onBenefitDataLoaded,
  onConfrontoLoaded,
  onLoadDemo,
  cachedRotaName,
  onOpenCachedRota,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Slots para o modo de confronto (um arquivo de cada vez)
  const [confrontoSlotRota, setConfrontoSlotRota] = useState<{
    name: string;
    rows: RawTradeRow[];
  } | null>(null);

  const [confrontoSlotCusto, setConfrontoSlotCusto] = useState<{
    name: string;
    records: BenefitRecord[];
  } | null>(null);

  const [showAuditoriaDetails, setShowAuditoriaDetails] = useState(false);

  // Auditoria em tempo real assim que os dois arquivos forem carregados
  const previewAuditoria = useMemo(() => {
    if (!confrontoSlotRota || !confrontoSlotCusto) return null;
    const tradeRecords = confrontoSlotRota.rows.map((r, idx) => transformRawRow(r, idx));
    return auditarConciliacaoNomes(tradeRecords, confrontoSlotCusto.records);
  }, [confrontoSlotRota, confrontoSlotCusto]);

  const fileInputRefValorizacao = useRef<HTMLInputElement>(null);
  const fileInputRefCusto = useRef<HTMLInputElement>(null);
  const fileInputRefSlotRota = useRef<HTMLInputElement>(null);
  const fileInputRefSlotCusto = useRef<HTMLInputElement>(null);

  // Processa Planilha de Valorização (Rotas)
  const processValorizacaoFile = (file: File, isForConfronto = false) => {
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
          throw new Error('Nenhum registro de rotas encontrado.');
        }

        if (isForConfronto) {
          setConfrontoSlotRota({ name: file.name, rows });
        } else {
          onDataLoaded(rows, file.name, false);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Erro ao processar a planilha de valorização.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMessage('Erro de leitura do arquivo.');
    };

    reader.readAsArrayBuffer(file);
  };

  // Processa Planilha de Custo Operacional (Benefícios)
  const processCustoFile = (file: File, isForConfronto = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const records = parseBenefitWorkbook(workbook);

        if (records.length === 0) {
          throw new Error('Nenhum registro de benefícios encontrado na planilha.');
        }

        if (isForConfronto) {
          setConfrontoSlotCusto({ name: file.name, records });
        } else {
          onBenefitDataLoaded(records, file.name, false);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Erro ao processar planilha de custos operacionais.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMessage('Erro de leitura do arquivo.');
    };

    reader.readAsArrayBuffer(file);
  };

  // Disparar o confronto quando ambos estiverem prontos
  const handleStartConfronto = () => {
    if (!confrontoSlotRota || !confrontoSlotCusto) {
      setErrorMessage('Carregue os dois arquivos para gerar o confronto.');
      return;
    }
    onConfrontoLoaded(
      confrontoSlotRota.rows,
      confrontoSlotRota.name,
      confrontoSlotCusto.records,
      confrontoSlotCusto.name
    );
  };

  // Atalho para carregar dados demo do confronto
  const handleLoadDemoConfronto = () => {
    onConfrontoLoaded(
      DEMO_TRADE_DATA,
      'base_rotas_demo.xlsx',
      DEMO_BENEFIT_DATA,
      'PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx'
    );
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-[#6c63ff]/15 via-[#00d4aa]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full flex flex-col items-center text-center relative z-10 space-y-8">
        {/* Header Branding */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e1e2c] border border-[#2e2e42] text-xs font-medium text-[#a78bfa]">
            <Sparkles className="w-3.5 h-3.5 text-[#00d4aa]" />
            Inteligência de Trade Marketing & Gestão de Promotores
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-[#f0f0f5] to-[#a78bfa] bg-clip-text text-transparent">
            BI • Sistema de Valorização & Custos
          </h1>

          <p className="text-sm md:text-base text-[#9090aa] max-w-2xl mx-auto leading-relaxed">
            Selecione o módulo de análise desejado. Você pode analisar as <strong>rotas de valorização</strong>, a <strong>planilha de custo operacional (benefícios)</strong> ou realizar o <strong>confronto completo de margem real</strong>.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 3 BOTÕES PERSONALIZADOS NO CENTRO (SELETOR DE MÓDULOS) */}
        {/* ======================================================== */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Botão 1: Análise de Valorização */}
          <button
            type="button"
            onClick={() => {
              onSelectMode('valorizacao');
              setErrorMessage(null);
            }}
            className={`p-5 rounded-2xl border text-left transition-all duration-300 relative group flex flex-col justify-between ${
              currentMode === 'valorizacao'
                ? 'bg-gradient-to-br from-[#1a182e] to-[#12121e] border-[#6c63ff] shadow-xl shadow-[#6c63ff]/20 scale-[1.02]'
                : 'bg-[#14141c]/80 border-[#242434] hover:border-[#6c63ff]/50 hover:bg-[#181824]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentMode === 'valorizacao' ? 'bg-[#6c63ff] text-white' : 'bg-[#1e1e2c] text-[#a78bfa]'
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                currentMode === 'valorizacao'
                  ? 'bg-[#6c63ff]/20 text-[#a78bfa] border border-[#6c63ff]/40'
                  : 'bg-[#1e1e2c] text-[#9090aa]'
              }`}>
                Módulo 1
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Análise de Valorização
              </h3>
              <p className="text-xs text-[#9090aa] leading-relaxed">
                Leitura da planilha de rotas, pesquisa, eficiência em R$/hora e simulações comerciais.
              </p>
            </div>
          </button>

          {/* Botão 2: Custo Operacional */}
          <button
            type="button"
            onClick={() => {
              onSelectMode('custo');
              setErrorMessage(null);
            }}
            className={`p-5 rounded-2xl border text-left transition-all duration-300 relative group flex flex-col justify-between ${
              currentMode === 'custo'
                ? 'bg-gradient-to-br from-[#141d24] to-[#12141c] border-[#00d4aa] shadow-xl shadow-[#00d4aa]/20 scale-[1.02]'
                : 'bg-[#14141c]/80 border-[#242434] hover:border-[#00d4aa]/50 hover:bg-[#181824]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentMode === 'custo' ? 'bg-[#00d4aa] text-black' : 'bg-[#1e1e2c] text-[#00d4aa]'
              }`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                currentMode === 'custo'
                  ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/40'
                  : 'bg-[#1e1e2c] text-[#9090aa]'
              }`}>
                Módulo 2
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Custo Operacional
              </h3>
              <p className="text-xs text-[#9090aa] leading-relaxed">
                Análise exclusiva de folha, benefícios (Caju/Jaé/Riocard), encargos 68,25% e supervisão.
              </p>
            </div>
          </button>

          {/* Botão 3: Confronto Valorização & Custo */}
          <button
            type="button"
            onClick={() => {
              onSelectMode('confronto');
              setErrorMessage(null);
            }}
            className={`p-5 rounded-2xl border text-left transition-all duration-300 relative group flex flex-col justify-between ${
              currentMode === 'confronto'
                ? 'bg-gradient-to-br from-[#261d18] to-[#16121a] border-[#ffd166] shadow-xl shadow-[#ffd166]/20 scale-[1.02]'
                : 'bg-[#14141c]/80 border-[#242434] hover:border-[#ffd166]/50 hover:bg-[#181824]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentMode === 'confronto' ? 'bg-[#ffd166] text-black' : 'bg-[#1e1e2c] text-[#ffd166]'
              }`}>
                <Scale className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                currentMode === 'confronto'
                  ? 'bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40'
                  : 'bg-[#1e1e2c] text-[#9090aa]'
              }`}>
                2 Arquivos
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Confronto Valor × Custo
              </h3>
              <p className="text-xs text-[#9090aa] leading-relaxed">
                Cruze os dois arquivos (1 por vez) para apurar a Margem Real (DRE) e rotas deficitárias.
              </p>
            </div>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ÁREA DE UPLOAD ESPECÍFICA CONFORME O MODO SELECIONADO    */}
        {/* ======================================================== */}

        {/* 1. MODO: ANÁLISE DE VALORIZAÇÃO */}
        {currentMode === 'valorizacao' && (
          <div className="w-full p-8 md:p-10 rounded-3xl border-2 border-dashed border-[#2a2a3c] hover:border-[#6c63ff]/60 bg-[#15151e]/80 backdrop-blur-sm shadow-2xl transition-all space-y-5">
            <input
              ref={fileInputRefValorizacao}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processValorizacaoFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#6c63ff]/20 to-[#a78bfa]/20 border border-[#6c63ff]/30 flex items-center justify-center text-[#6c63ff]">
              {isLoading ? (
                <div className="w-7 h-7 border-3 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-[#a78bfa]" />
              )}
            </div>

            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">
                Carregar Planilha de Valorização
              </h3>
              <p className="text-xs text-[#9090aa] mt-1">
                Arraste o arquivo comercial de rotas ou selecione no seu computador (.xlsx ou .xls)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRefValorizacao.current?.click()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6c63ff] to-[#8b5cf6] text-white text-xs font-semibold shadow-lg shadow-[#6c63ff]/30 hover:shadow-[#6c63ff]/50 hover:scale-105 transition-all"
              >
                Selecionar Arquivo de Valorização
              </button>

              {cachedRotaName && onOpenCachedRota && (
                <button
                  type="button"
                  onClick={onOpenCachedRota}
                  className="px-5 py-2.5 rounded-xl bg-[#00d4aa]/15 border border-[#00d4aa]/40 text-xs font-bold text-[#00d4aa] hover:bg-[#00d4aa]/25 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Abrir Base em Cache ({cachedRotaName})
                </button>
              )}

              <button
                type="button"
                onClick={onLoadDemo}
                className="px-5 py-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-medium text-[#a78bfa] hover:bg-[#252538] hover:text-white transition"
              >
                Carregar Base de Demonstração
              </button>
            </div>
          </div>
        )}

        {/* 2. MODO: CUSTO OPERACIONAL */}
        {currentMode === 'custo' && (
          <div className="w-full p-8 md:p-10 rounded-3xl border-2 border-dashed border-[#2a2a3c] hover:border-[#00d4aa]/60 bg-[#15151e]/80 backdrop-blur-sm shadow-2xl transition-all space-y-5">
            <input
              ref={fileInputRefCusto}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processCustoFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#4cc9f0]/20 border border-[#00d4aa]/30 flex items-center justify-center text-[#00d4aa]">
              {isLoading ? (
                <div className="w-7 h-7 border-3 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
              ) : (
                <DollarSign className="w-8 h-8 text-[#00d4aa]" />
              )}
            </div>

            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">
                Carregar Planilha de Custo Operacional (Benefícios)
              </h3>
              <p className="text-xs text-[#9090aa] mt-1">
                Compatível com o modelo <strong>PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx</strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRefCusto.current?.click()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00d4aa] to-[#00b4d8] text-black text-xs font-bold shadow-lg shadow-[#00d4aa]/30 hover:shadow-[#00d4aa]/50 hover:scale-105 transition-all"
              >
                Selecionar Planilha de Custo Operacional
              </button>

              <button
                type="button"
                onClick={() => {
                  onBenefitDataLoaded(
                    DEMO_BENEFIT_DATA,
                    'PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx',
                    true
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-medium text-[#00d4aa] hover:bg-[#252538] hover:text-white transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00d4aa]" />
                Carregar Modelo Compartilhado (Outubro 2026)
              </button>
            </div>
          </div>
        )}

        {/* 3. MODO: CONFRONTO DOS DOIS ARQUIVOS */}
        {currentMode === 'confronto' && (
          <div className="w-full p-8 md:p-10 rounded-3xl border border-[#2a2a3c] bg-[#15151e]/90 backdrop-blur-sm shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-lg md:text-xl font-bold text-white">
                Upload Duplo para Confronto (Envie um de cada vez)
              </h3>
              <p className="text-xs text-[#9090aa]">
                Carregue o arquivo de rotas e o arquivo de benefícios para calcular a DRE e a margem de cada promotor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slot 1: Planilha de Valorização */}
              <div className={`p-5 rounded-2xl border text-left transition ${
                confrontoSlotRota
                  ? 'bg-[#16221c] border-[#00d4aa]/50'
                  : 'bg-[#12121a] border-[#262638] hover:border-[#6c63ff]/40'
              }`}>
                <input
                  ref={fileInputRefSlotRota}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processValorizacaoFile(e.target.files[0], true);
                    }
                  }}
                />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#6c63ff]/20 text-[#a78bfa]">
                    ARQUIVO 1
                  </span>
                  {confrontoSlotRota ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#00d4aa]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Carregado
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#5a5a75]">Pendente</span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  Planilha de Valorização (Rotas)
                </h4>
                <p className="text-[11px] text-[#9090aa] mb-4">
                  {confrontoSlotRota
                    ? `${confrontoSlotRota.name} (${confrontoSlotRota.rows.length} linhas)`
                    : 'Contém visitas, frequências, redes e faturamento'}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRefSlotRota.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-semibold text-white hover:bg-[#252538] transition"
                  >
                    {confrontoSlotRota ? 'Trocar Arquivo' : 'Carregar Arquivo 1'}
                  </button>
                  {!confrontoSlotRota && (
                    <button
                      type="button"
                      onClick={() => setConfrontoSlotRota({ name: 'base_rotas_demo.xlsx', rows: DEMO_TRADE_DATA })}
                      className="py-2 px-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-[11px] text-[#a78bfa] hover:text-white"
                      title="Usar dados modelo de rotas"
                    >
                      Demo
                    </button>
                  )}
                </div>
              </div>

              {/* Slot 2: Planilha de Custos Operacionais */}
              <div className={`p-5 rounded-2xl border text-left transition ${
                confrontoSlotCusto
                  ? 'bg-[#16221c] border-[#00d4aa]/50'
                  : 'bg-[#12121a] border-[#262638] hover:border-[#00d4aa]/40'
              }`}>
                <input
                  ref={fileInputRefSlotCusto}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processCustoFile(e.target.files[0], true);
                    }
                  }}
                />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00d4aa]/20 text-[#00d4aa]">
                    ARQUIVO 2
                  </span>
                  {confrontoSlotCusto ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#00d4aa]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Carregado
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#5a5a75]">Pendente</span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mb-1">
                  Planilha de Custo (Benefícios)
                </h4>
                <p className="text-[11px] text-[#9090aa] mb-4">
                  {confrontoSlotCusto
                    ? `${confrontoSlotCusto.name} (${confrontoSlotCusto.records.length} promotores)`
                    : 'Contém folha, VT, VR Caju, encargos e tributos'}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRefSlotCusto.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-semibold text-white hover:bg-[#252538] transition"
                  >
                    {confrontoSlotCusto ? 'Trocar Arquivo' : 'Carregar Arquivo 2'}
                  </button>
                  {!confrontoSlotCusto && (
                    <button
                      type="button"
                      onClick={() => setConfrontoSlotCusto({ name: 'PLANILHA DE BENEFÍCIOS COMPARTILHADO.xlsx', records: DEMO_BENEFIT_DATA })}
                      className="py-2 px-2.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-[11px] text-[#00d4aa] hover:text-white"
                      title="Usar dados modelo de benefícios"
                    >
                      Modelo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Alerta de Auditoria & Conciliação de Nomes entre as 2 planilhas */}
            {previewAuditoria && (
              <div
                className={`p-4 md:p-5 rounded-2xl border transition-all text-left shadow-lg ${
                  previewAuditoria.isTotalmenteConciliado
                    ? 'bg-[#00d4aa]/10 border-[#00d4aa]/40 shadow-[#00d4aa]/5'
                    : 'bg-[#ffd166]/10 border-[#ffd166]/40 shadow-[#ffd166]/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        previewAuditoria.isTotalmenteConciliado
                          ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                          : 'bg-[#ffd166]/20 text-[#ffd166]'
                      }`}
                    >
                      {previewAuditoria.isTotalmenteConciliado ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                          {previewAuditoria.isTotalmenteConciliado
                            ? '✅ Conciliação Perfeita: 100% dos Nomes Conferidos!'
                            : `⚠️ Alerta de Conciliação: ${previewAuditoria.taxaConciliacaoPct}% de Nomes Conciliados`}
                        </h5>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            previewAuditoria.isTotalmenteConciliado
                              ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                              : 'bg-[#ffd166]/20 text-[#ffd166]'
                          }`}
                        >
                          {previewAuditoria.totalConciliados} conciliados
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9090aa] mt-0.5">
                        Conferência cruzada entre coluna <strong className="text-white">AGENTE</strong> ({previewAuditoria.totalNomesValorizacao} promotores) e coluna <strong className="text-white">NOME</strong> ({previewAuditoria.totalNomesCusto} colaboradores).
                      </p>
                    </div>
                  </div>

                  {!previewAuditoria.isTotalmenteConciliado && (
                    <button
                      type="button"
                      onClick={() => setShowAuditoriaDetails(!showAuditoriaDetails)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-semibold text-white hover:bg-[#252538] hover:border-[#ffd166] transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
                    >
                      {showAuditoriaDetails ? 'Ocultar Faltantes' : 'Ver Nomes Faltantes'}
                      {showAuditoriaDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Gaveta retrátil de nomes divergentes */}
                {showAuditoriaDetails && !previewAuditoria.isTotalmenteConciliado && (
                  <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    {/* Nomes apenas no Custo (sem rota ativa faturando) */}
                    <div className="p-3.5 rounded-xl bg-[#121218]/90 border border-[#ff6b6b]/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#ff6b6b] flex items-center gap-1.5">
                          <UserX className="w-4 h-4" />
                          Na Planilha de Custo mas SEM ROTA ({previewAuditoria.nomesApenasNoCusto.length})
                        </span>
                        <span className="text-[10px] text-[#9090aa]">Custo RH sem Faturamento</span>
                      </div>
                      {previewAuditoria.nomesApenasNoCusto.length === 0 ? (
                        <p className="text-[11px] text-[#00d4aa]">Nenhum colaborador nesta condição.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {previewAuditoria.nomesApenasNoCusto.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#181824] text-[11px] border border-[#262638]"
                            >
                              <div className="truncate max-w-[170px]">
                                <div className="text-white font-medium truncate" title={item.nome}>
                                  {item.nome}
                                </div>
                                <div className="text-[10px] text-[#5a5a75] font-mono">CPF: {item.cpf}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[#ff6b6b] font-bold font-mono">
                                  {fmt(item.custoTotalMensal || 0)}
                                </div>
                                <div className="text-[9px] text-[#9090aa]">Custo Total</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Nomes apenas na Valorização (sem custo cadastrado) */}
                    <div className="p-3.5 rounded-xl bg-[#121218]/90 border border-[#ffd166]/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#ffd166] flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4" />
                          Na Planilha de Valorização mas SEM CUSTO ({previewAuditoria.nomesApenasNaValorizacao.length})
                        </span>
                        <span className="text-[10px] text-[#9090aa]">Faturando sem Custo RH</span>
                      </div>
                      {previewAuditoria.nomesApenasNaValorizacao.length === 0 ? (
                        <p className="text-[11px] text-[#00d4aa]">Nenhum promotor nesta condição.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {previewAuditoria.nomesApenasNaValorizacao.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#181824] text-[11px] border border-[#262638]"
                            >
                              <div className="truncate max-w-[170px]">
                                <div className="text-white font-medium truncate" title={item.nome}>
                                  {item.nome}
                                </div>
                                <div className="text-[10px] text-[#5a5a75] font-mono">CPF: {item.cpf}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[#00d4aa] font-bold font-mono">
                                  {fmt(item.faturamentoMensal || 0)}
                                </div>
                                <div className="text-[9px] text-[#9090aa]">
                                  {fmt(item.valorSemanal || 0)}/sem
                                </div>
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

            {/* Botão de Disparo do Confronto */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                type="button"
                disabled={!confrontoSlotRota || !confrontoSlotCusto}
                onClick={handleStartConfronto}
                className={`px-8 py-3 rounded-xl text-xs md:text-sm font-bold shadow-xl transition-all flex items-center gap-2 ${
                  confrontoSlotRota && confrontoSlotCusto
                    ? 'bg-gradient-to-r from-[#ffd166] to-[#00d4aa] text-black shadow-[#00d4aa]/30 hover:scale-105 cursor-pointer'
                    : 'bg-[#1c1c28] text-[#5a5a75] border border-[#28283a] cursor-not-allowed'
                }`}
              >
                <Scale className="w-4 h-4" />
                Gerar Confronto & Análise de Margem Real
              </button>

              <button
                type="button"
                onClick={handleLoadDemoConfronto}
                className="px-5 py-3 rounded-xl bg-[#1e1e2c] border border-[#2e2e42] text-xs font-medium text-[#ffd166] hover:bg-[#252538] hover:text-white transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ffd166]" />
                Preencher Ambos c/ Bases Modelo
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 px-5 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 text-[#ff6b6b] text-xs font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};
