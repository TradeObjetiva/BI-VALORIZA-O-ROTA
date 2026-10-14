import * as XLSX from 'xlsx';
import {
  BenefitRecord,
  BenefitKPIData,
  ConfrontoRecord,
  ConfrontoKPIData,
  ConciliacaoAuditoria,
  ConciliacaoFaltanteItem,
} from '../types/benefit';
import { TradeRecord } from '../types/trade';
import { parseNum, MULTIPLIER } from './tradeCalculations';

export const TAXA_ENCARGOS = 0.6825; // 68,25% oficial da planilha de benefícios
export const TAXA_SUPERVISAO = 0.10; // 10,00% da planilha oficial
export const TAXA_ADMINISTRATIVA = 0.15; // 15,00% da planilha oficial
export const TAXA_TRIBUTOS = 0.1986; // 19,86% oficial da planilha
export const HORAS_MES_PADRAO = 176; // 44h * 4 semanas

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const STATUS_TAGS = new Set([
  'inss',
  'afastado',
  'afastada',
  'ferias',
  'férias',
  'reserva',
  'banco',
  'vaga',
  'extra',
  'diaria',
  'diária',
  'substituto',
  'substituta',
  'promotor',
  'promotora',
]);

export const STORAGE_KEY_MANUAL_LINKS = 'trade_manual_collaborator_links';

/**
 * Lê os vínculos manuais persistidos no LocalStorage (Agente Rota -> Nome Benefício)
 */
export function getManualLinks(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANUAL_LINKS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Erro ao ler vínculos manuais:', e);
    return {};
  }
}

/**
 * Salva um vínculo manual entre um Agente da Rota e um Colaborador da Planilha de Benefícios
 */
export function saveManualLink(agenteRota: string, nomeBeneficio: string): Record<string, string> {
  const current = getManualLinks();
  current[agenteRota.trim()] = nomeBeneficio.trim();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_MANUAL_LINKS, JSON.stringify(current));
    } catch (e) {
      console.error('Erro ao salvar vínculo manual:', e);
    }
  }
  return current;
}

/**
 * Remove um vínculo manual
 */
export function removeManualLink(agenteRota: string): Record<string, string> {
  const current = getManualLinks();
  delete current[agenteRota.trim()];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_MANUAL_LINKS, JSON.stringify(current));
    } catch (e) {
      console.error('Erro ao remover vínculo manual:', e);
    }
  }
  return current;
}

/**
 * Limpa todos os vínculos manuais
 */
export function clearManualLinks(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY_MANUAL_LINKS);
    } catch (e) {
      console.error('Erro ao limpar vínculos manuais:', e);
    }
  }
}

/**
 * Normaliza CPF removendo pontuações e caracteres estranhos
 */
export function normalizeCpf(cpf: string | undefined | null): string {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '').trim();
}

/**
 * Normaliza Nome removendo acentos, pontuações, quebras de linha e múltiplos espaços
 */
export function normalizeNome(nome: string | undefined | null): string {
  if (!nome) return '';
  return String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza Nome limpando status como 'INSS', 'AFASTADO', 'FERIAS', etc. para cruzamento
 */
export function cleanNomeForMatching(nome: string | undefined | null): string {
  const norm = normalizeNome(nome);
  if (!norm) return '';
  return norm
    .split(' ')
    .filter((w) => w.length > 0 && !STATUS_TAGS.has(w))
    .join(' ')
    .trim();
}

/**
 * Retorna os tokens significativos do nome (sem preposições e sem tags de status)
 */
export function getNomeTokens(nome: string | undefined | null): string[] {
  const cleaned = cleanNomeForMatching(nome);
  if (!cleaned) return [];
  return cleaned
    .split(' ')
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t) && !STATUS_TAGS.has(t));
}

/**
 * Distância de Levenshtein entre duas palavras/strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Calcula score de compatibilidade entre duas pessoas (0 a 100).
 */
export function calcularScoreCompatibilidade(
  nomeA: string,
  cpfA: string | undefined,
  nomeB: string,
  cpfB: string | undefined
): number {
  const cA = normalizeCpf(cpfA);
  const cB = normalizeCpf(cpfB);

  const nA = normalizeNome(nomeA);
  const nB = normalizeNome(nomeB);
  if (!nA || !nB) return 0;

  // 1. Nomes normalizados idênticos
  if (nA === nB) return 100;

  const cleanA = cleanNomeForMatching(nomeA);
  const cleanB = cleanNomeForMatching(nomeB);

  // 2. Nomes limpos (sem sufixos como INSS, FÉRIAS, etc.) idênticos
  if (cleanA && cleanB && cleanA === cleanB) {
    return 100;
  }

  // 3. CPFs válidos com 8 ou mais dígitos iguais (desde que os nomes não sejam de pessoas totalmente diferentes)
  if (cA.length >= 8 && cB.length >= 8 && cA === cB) {
    const tokA = getNomeTokens(cleanA);
    const tokB = getNomeTokens(cleanB);
    const setB = new Set(tokB);
    const hasCommonToken = tokA.some((t) => setB.has(t));
    if (hasCommonToken || levenshteinDistance(cleanA, cleanB) <= Math.max(cleanA.length, cleanB.length) * 0.6) {
      return 100;
    }
  }

  // Ignora match entre vaga/banco e pessoa real
  const isVagaA = cleanA.startsWith('vaga') || cleanA.includes('banco');
  const isVagaB = cleanB.startsWith('vaga') || cleanB.includes('banco');
  if (isVagaA !== isVagaB) return 0;

  // 4. Um nome limpo é prefixo ou está totalmente contido no outro
  const minLen = Math.min(cleanA.length, cleanB.length);
  if (minLen >= 10 && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return 95;
  }

  const tokensA = getNomeTokens(cleanA);
  const tokensB = getNomeTokens(cleanB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Primeiro nome deve ser idêntico ou fuzzy muito próximo
  const primeiroA = tokensA[0];
  const primeiroB = tokensB[0];
  const primeiroIgual = primeiroA === primeiroB;
  const primeiroFuzzy =
    !primeiroIgual &&
    Math.min(primeiroA.length, primeiroB.length) >= 4 &&
    levenshteinDistance(primeiroA, primeiroB) <= 1;

  if (!primeiroIgual && !primeiroFuzzy) {
    return 0;
  }

  // Tokens em comum
  const setB = new Set(tokensB);
  const tokensComuns = tokensA.filter((t) => setB.has(t));
  const menorQtdTokens = Math.min(tokensA.length, tokensB.length);

  // 5. Todos os tokens do menor estão no maior (ex: sobrenome omitido)
  if (tokensComuns.length >= menorQtdTokens && menorQtdTokens >= 2) {
    return 92;
  }

  // 6. Primeiro nome + 2 sobrenomes em comum
  if (tokensComuns.length >= 3) {
    return 89;
  }

  // 7. Ambos têm 2 palavras e ambas batem
  if (tokensA.length === 2 && tokensB.length === 2 && tokensComuns.length === 2) {
    return 90;
  }

  // 8. Pelo menos 2 tokens em comum com alta similaridade
  if (tokensComuns.length >= 2) {
    const maxStrLen = Math.max(cleanA.length, cleanB.length);
    const dist = levenshteinDistance(cleanA, cleanB);
    const similarity = 1 - dist / maxStrLen;
    if (similarity >= 0.78) {
      return 85;
    }
  }

  return 0;
}

/**
 * Encontra o melhor candidato em uma lista com score mínimo
 */
export function findBestMatch<T extends { nome: string; cpf?: string }>(
  targetNome: string,
  targetCpf: string | undefined,
  candidates: T[],
  minScore = 80
): { item: T; score: number } | null {
  let bestItem: T | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const score = calcularScoreCompatibilidade(targetNome, targetCpf, c.nome, c.cpf);
    if (score > bestScore && score >= minScore) {
      bestScore = score;
      bestItem = c;
      if (score === 100) break;
    }
  }

  return bestItem ? { item: bestItem, score: bestScore } : null;
}

/**
 * Retorna os top candidatos sugeridos ordenados por score
 */
export function findTopCandidates<T extends { nome: string; cpf?: string }>(
  targetNome: string,
  targetCpf: string | undefined,
  candidates: T[],
  limit = 5
): { item: T; score: number }[] {
  const results: { item: T; score: number }[] = [];

  for (const c of candidates) {
    const score = calcularScoreCompatibilidade(targetNome, targetCpf, c.nome, c.cpf);
    if (score > 30) {
      results.push({ item: c, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Normaliza string de cabeçalho para comparação flexível
 */
function normHeader(h: any): string {
  if (!h) return '';
  return String(h)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parser inteligente e dinâmico de planilhas de benefícios
 * Mapeia as colunas por palavras-chave com resiliência total a layouts e acentos
 */
export function parseBenefitWorkbook(workbook: XLSX.WorkBook): BenefitRecord[] {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!json || json.length < 3) {
    throw new Error('Planilha de benefícios inválida ou vazia.');
  }

  // 1. Encontra dinamicamente a linha de cabeçalho
  let headerIdx = -1;
  for (let r = 0; r < Math.min(10, json.length); r++) {
    const row = json[r];
    if (Array.isArray(row)) {
      const rowNorm = row.map(normHeader).join(' ');
      if (
        rowNorm.includes('nome') &&
        (rowNorm.includes('salario') ||
          rowNorm.includes('beneficio') ||
          rowNorm.includes('carga') ||
          rowNorm.includes('jornada') ||
          rowNorm.includes('transporte'))
      ) {
        headerIdx = r;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    headerIdx = 2; // Fallback linha 2 (índice 2)
  }

  const rawHeaders = json[headerIdx] || [];
  const normalizedHeaders = rawHeaders.map(normHeader);

  // Função auxiliar para achar índice de coluna por palavras-chave
  const findCol = (keywords: string[], exclude: string[] = []): number => {
    return normalizedHeaders.findIndex((h) => {
      if (!h) return false;
      const hasAll = keywords.every((k) => h.includes(k));
      const hasExclude = exclude.some((e) => h.includes(e));
      return hasAll && !hasExclude;
    });
  };

  // Mapeamento dinâmico de todas as colunas
  const cNome = findCol(['nome']);
  const cCarga = findCol(['carga']);
  const cJornada = findCol(['jornada']);
  const cDepto = findCol(['departamento']);
  const cDiasMes = findCol(['diasmes']) !== -1 ? findCol(['diasmes']) : findCol(['segsab']);
  const cDiasUteis = findCol(['diasuteis']) !== -1 ? findCol(['diasuteis']) : findCol(['segsex']);
  const cAttSegSex = findCol(['atestado'], ['sab']);
  const cAttSab = findCol(['att']) !== -1 ? findCol(['att']) : findCol(['atestado', 'sab']);
  const cFaltaSegSex = findCol(['falta'], ['sab']);
  const cFaltaSab = findCol(['falta', 'sab']);
  const cTipoVt = findCol(['tipobeneficio']) !== -1 ? findCol(['tipobeneficio']) : findCol(['tipovt']);
  const cMediaJae = findCol(['media', 'jae']);
  const cMediaRcard = findCol(['media', 'rcard', 'usuario']);
  const cMediaRcardEmp = findCol(['media', 'rcard', 'empresa']);
  const cMediaCajuMob = findCol(['media', 'caju', 'mob']);
  const cMediaCajuLivre = findCol(['media', 'caju', 'saldo']);
  const cVtJae = findCol(['pagar', 'jae']) !== -1 ? findCol(['pagar', 'jae']) : findCol(['vtjae']);
  const cVtRcard = findCol(['pagar', 'rcard', 'usuario']);
  const cVtRcardEmp = findCol(['pagar', 'rcard', 'empresa']);
  const cVtCajuMob = findCol(['pagar', 'caju', 'mob']);
  const cVtCajuLivre = findCol(['pagar', 'caju', 'saldo']);
  const cVtTot = findCol(['totalvt']);
  const cVrDiario = findCol(['vrdiario']);
  const cVrTot = findCol(['valerefeicao']) !== -1 ? findCol(['valerefeicao']) : findCol(['refeicao']);
  const cCelDiario = findCol(['celular', 'diario']);
  const cCelTot = findCol(['celular'], ['diario']);
  const cCestaDir = findCol(['direito']);
  const cCestaTot = findCol(['cestabasica']) !== -1 ? findCol(['cestabasica']) : findCol(['cesta']);
  const cTotBen = findCol(['totalbeneficios']);
  const cSalario = findCol(['salario'], ['encargos', 'trabalhistas']);
  const cCustosTrab = findCol(['trabalhistas']) !== -1 ? findCol(['trabalhistas']) : findCol(['encargos']);
  const cEpi = findCol(['seguro']) !== -1 ? findCol(['seguro']) : findCol(['epi']);
  const cAso = findCol(['aso']);
  const cPgr = findCol(['pgr']) !== -1 ? findCol(['pgr']) : findCol(['pcmso']);
  const cMob = findCol(['mob2con']) !== -1 ? findCol(['mob2con']) : findCol(['mob']);
  const cApp = findCol(['aplicativo']) !== -1 ? findCol(['aplicativo']) : findCol(['produtividade']);
  const cTaxaSup = findCol(['supervisao']);
  const cTaxaAdm = findCol(['administrativa']);
  const cTributos = findCol(['tributos']) !== -1 ? findCol(['tributos']) : findCol(['irpj']);
  const cPrem = findCol(['premiacao']) !== -1 ? findCol(['premiacao']) : findCol(['premio']);

  const records: BenefitRecord[] = [];

  for (let r = headerIdx + 1; r < json.length; r++) {
    const row = json[r];
    if (!row || !Array.isArray(row)) continue;

    const rawNome = cNome !== -1 ? row[cNome] : row[0];
    if (
      !rawNome ||
      String(rawNome).trim() === '' ||
      String(rawNome).toUpperCase().includes('TOTAL') ||
      String(rawNome).toUpperCase().includes('SUBTOTAL')
    ) {
      continue;
    }

    const nome = String(rawNome).trim();
    if (!nome || nome.length < 2) continue;

    const cargaHoraria = cCarga !== -1 && row[cCarga] ? String(row[cCarga]).trim() : '8H';
    const jornada = cJornada !== -1 && row[cJornada] ? String(row[cJornada]).trim() : 'SEG A SEX, 8H-17H. SAB 8H-12H';
    const departamento = cDepto !== -1 && row[cDepto] ? String(row[cDepto]).trim() : 'COMPARTILHADO';

    const diasMesSegSab = cDiasMes !== -1 ? parseNum(row[cDiasMes]) || 25 : 25;
    const diasUteisSegSex = cDiasUteis !== -1 ? parseNum(row[cDiasUteis]) || 20 : 20;
    const atestadosSegSex = cAttSegSex !== -1 ? parseNum(row[cAttSegSex]) : 0;
    const atestadosSab = cAttSab !== -1 ? parseNum(row[cAttSab]) : 0;
    const faltasSegSex = cFaltaSegSex !== -1 ? parseNum(row[cFaltaSegSex]) : 0;
    const faltasSab = cFaltaSab !== -1 ? parseNum(row[cFaltaSab]) : 0;

    const diasEfetivosVT = Math.max(0, diasMesSegSab - atestadosSegSex - atestadosSab - faltasSegSex - faltasSab);
    const diasEfetivosVR = Math.max(0, diasUteisSegSex - atestadosSegSex - faltasSegSex);

    const tipoVT = cTipoVt !== -1 && row[cTipoVt] ? String(row[cTipoVt]).trim() : 'VT';
    const mediaJae = cMediaJae !== -1 ? parseNum(row[cMediaJae]) : 0;
    const mediaRcardUsuario = cMediaRcard !== -1 ? parseNum(row[cMediaRcard]) : 0;
    const mediaRcardEmpresa = cMediaRcardEmp !== -1 ? parseNum(row[cMediaRcardEmp]) : 0;
    const mediaCajuMob = cMediaCajuMob !== -1 ? parseNum(row[cMediaCajuMob]) : 0;
    const mediaCajuSaldoLivre = cMediaCajuLivre !== -1 ? parseNum(row[cMediaCajuLivre]) : 0;

    const vtJae = cVtJae !== -1 ? parseNum(row[cVtJae]) : mediaJae * diasEfetivosVT;
    const vtRcardUsuario = cVtRcard !== -1 ? parseNum(row[cVtRcard]) : mediaRcardUsuario * diasEfetivosVT;
    const vtRcardEmpresa = cVtRcardEmp !== -1 ? parseNum(row[cVtRcardEmp]) : mediaRcardEmpresa * diasEfetivosVT;
    const vtCajuMob = cVtCajuMob !== -1 ? parseNum(row[cVtCajuMob]) : mediaCajuMob * diasEfetivosVT;
    const vtCajuSaldoLivre = cVtCajuLivre !== -1 ? parseNum(row[cVtCajuLivre]) : mediaCajuSaldoLivre * diasEfetivosVT;

    const vtTotal =
      cVtTot !== -1 && parseNum(row[cVtTot]) > 0
        ? parseNum(row[cVtTot])
        : vtJae + vtRcardUsuario + vtRcardEmpresa + vtCajuMob + vtCajuSaldoLivre;

    const vrDiario = cVrDiario !== -1 && parseNum(row[cVrDiario]) > 0 ? parseNum(row[cVrDiario]) : 30;
    const vrTotal = cVrTot !== -1 && parseNum(row[cVrTot]) > 0 ? parseNum(row[cVrTot]) : vrDiario * diasEfetivosVR;
    const vrDescontoFolha = vrTotal * 0.05;

    const celularDiario = cCelDiario !== -1 && parseNum(row[cCelDiario]) > 0 ? parseNum(row[cCelDiario]) : 2.5;
    const celularTotal = cCelTot !== -1 && parseNum(row[cCelTot]) > 0 ? parseNum(row[cCelTot]) : celularDiario * diasEfetivosVT;

    const cestaDireito = cCestaDir !== -1 && row[cCestaDir] ? String(row[cCestaDir]).trim() : 'Sim';
    const cestaTotal =
      cCestaTot !== -1 && parseNum(row[cCestaTot]) > 0
        ? parseNum(row[cCestaTot])
        : cestaDireito.toLowerCase().includes('sim') ? 77.24 : 0;

    const totalBeneficiosCaju =
      cTotBen !== -1 && parseNum(row[cTotBen]) > 0
        ? parseNum(row[cTotBen])
        : vrTotal + celularTotal + cestaTotal;

    const salarioBase = cSalario !== -1 && parseNum(row[cSalario]) > 0 ? parseNum(row[cSalario]) : 1765.12;

    const encargosTrabalhistas =
      cCustosTrab !== -1 && parseNum(row[cCustosTrab]) > 0
        ? parseNum(row[cCustosTrab])
        : salarioBase * TAXA_ENCARGOS;

    const salarioComEncargos = salarioBase + encargosTrabalhistas;

    const epiSeguro = cEpi !== -1 && parseNum(row[cEpi]) > 0 ? parseNum(row[cEpi]) : 55;
    const aso = cAso !== -1 && parseNum(row[cAso]) > 0 ? parseNum(row[cAso]) : 50;
    const pgr = cPgr !== -1 && parseNum(row[cPgr]) > 0 ? parseNum(row[cPgr]) : 18.9;
    const mob2con = cMob !== -1 && parseNum(row[cMob]) > 0 ? parseNum(row[cMob]) : 13.5;
    const appProdutividade = cApp !== -1 && parseNum(row[cApp]) > 0 ? parseNum(row[cApp]) : 69.9;
    const subtotalDiversos = epiSeguro + aso + pgr + mob2con + appProdutividade;

    const taxaSupervisao =
      cTaxaSup !== -1 && parseNum(row[cTaxaSup]) > 0
        ? parseNum(row[cTaxaSup])
        : salarioComEncargos * TAXA_SUPERVISAO;

    const taxaAdm =
      cTaxaAdm !== -1 && parseNum(row[cTaxaAdm]) > 0
        ? parseNum(row[cTaxaAdm])
        : salarioComEncargos * TAXA_ADMINISTRATIVA;

    const tributos =
      cTributos !== -1 && parseNum(row[cTributos]) > 0
        ? parseNum(row[cTributos])
        : (totalBeneficiosCaju + encargosTrabalhistas + epiSeguro + aso + taxaSupervisao) * TAXA_TRIBUTOS;

    const premiacao = cPrem !== -1 && parseNum(row[cPrem]) > 0 ? parseNum(row[cPrem]) : 150;

    const custoTotalPromotor =
      salarioComEncargos +
      totalBeneficiosCaju +
      vtTotal +
      subtotalDiversos +
      taxaSupervisao +
      taxaAdm +
      tributos +
      premiacao;

    const pctVtSalario = salarioBase > 0 ? (vtTotal / salarioBase) * 100 : 0;

    records.push({
      id: `ben-${r}-${Math.random().toString(36).substring(2, 6)}`,
      nome,
      empresaCompra: 'PROMOCIONAL',
      colaborador: null,
      cpf: '—',
      dataAdmissao: null,
      funcao: 'PROMOTOR DE MERCHANDISING',
      tipoContrato: 'INDETERMINADO',
      modalidade: 'MENSAL',
      cargaHoraria,
      jornada,
      departamento,
      diasMesSegSab,
      diasUteisSegSex,
      atestadosSegSex,
      atestadosSab,
      faltasSegSex,
      faltasSab,
      diasEfetivosVT,
      diasEfetivosVR,
      tipoVT,
      mediaJae,
      mediaRcardUsuario,
      mediaRcardEmpresa,
      mediaCajuMob,
      mediaCajuSaldoLivre,
      vtJae,
      vtRcardUsuario,
      vtRcardEmpresa,
      vtCajuMob,
      vtCajuSaldoLivre,
      vtTotal,
      km: 'NÃO',
      kmValor: 0,
      vrDiario,
      vrTotal,
      vrDescontoFolha,
      celularDiario,
      celularTotal,
      cestaDireito,
      cestaTotal,
      homeOfficeDireito: 'Não',
      homeOfficeTotal: 0,
      totalBeneficiosCaju,
      salarioBase,
      salarioComEncargos,
      epiSeguro,
      subtotalDiversos,
      taxaSupervisao,
      taxaAdm,
      tributos,
      premiacao,
      aso,
      pgr,
      mob2con,
      appProdutividade,
      custoTotalPromotor,
      pctVtSalario: Math.round(pctVtSalario * 10) / 10,
    });
  }

  return records;
}

/**
 * Calcula os KPIs Consolidados da Gestão de Custo Operacional
 */
export function calculateBenefitKPIs(records: BenefitRecord[]): BenefitKPIData {
  const totalPromotores = records.length;
  if (totalPromotores === 0) {
    return {
      totalPromotores: 0,
      folhaSalarialBase: 0,
      encargosTrabalhistas: 0,
      totalBeneficiosCaju: 0,
      totalVT: 0,
      totalEpiSeguro: 0,
      totalDiversos: 0,
      totalTaxaSupervisao: 0,
      totalTaxaAdm: 0,
      totalTributos: 0,
      totalPremiacao: 0,
      custoTotalOperacional: 0,
      custoMedioPorPromotor: 0,
      custoMedioHora: 0,
      totalDescontoPAT: 0,
      promotoresVtCritico: 0,
      totalVtJae: 0,
      totalVtRcard: 0,
      totalVtCaju: 0,
    };
  }

  let folhaSalarialBase = 0;
  let encargosTrabalhistas = 0;
  let totalBeneficiosCaju = 0;
  let totalVT = 0;
  let totalEpiSeguro = 0;
  let totalDiversos = 0;
  let totalTaxaSupervisao = 0;
  let totalTaxaAdm = 0;
  let totalTributos = 0;
  let totalPremiacao = 0;
  let custoTotalOperacional = 0;
  let totalDescontoPAT = 0;
  let promotoresVtCritico = 0;
  let totalVtJae = 0;
  let totalVtRcard = 0;
  let totalVtCaju = 0;

  records.forEach((r) => {
    folhaSalarialBase += r.salarioBase;
    encargosTrabalhistas += (r.salarioComEncargos - r.salarioBase);
    totalBeneficiosCaju += r.totalBeneficiosCaju;
    totalVT += r.vtTotal;
    totalEpiSeguro += r.epiSeguro;
    totalDiversos += r.subtotalDiversos;
    totalTaxaSupervisao += r.taxaSupervisao;
    totalTaxaAdm += (r.taxaAdm || 0);
    totalTributos += r.tributos;
    totalPremiacao += (r.premiacao || 0);
    custoTotalOperacional += r.custoTotalPromotor;
    totalDescontoPAT += r.vrDescontoFolha;

    totalVtJae += r.vtJae;
    totalVtRcard += (r.vtRcardUsuario + r.vtRcardEmpresa);
    totalVtCaju += (r.vtCajuMob + r.vtCajuSaldoLivre);

    if (r.pctVtSalario >= 50) {
      promotoresVtCritico++;
    }
  });

  const custoMedioPorPromotor = custoTotalOperacional / totalPromotores;
  const custoMedioHora = custoTotalOperacional / (totalPromotores * HORAS_MES_PADRAO);

  return {
    totalPromotores,
    folhaSalarialBase,
    encargosTrabalhistas,
    totalBeneficiosCaju,
    totalVT,
    totalEpiSeguro,
    totalDiversos,
    totalTaxaSupervisao,
    totalTaxaAdm,
    totalTributos,
    totalPremiacao,
    custoTotalOperacional,
    custoMedioPorPromotor,
    custoMedioHora,
    totalDescontoPAT,
    promotoresVtCritico,
    totalVtJae,
    totalVtRcard,
    totalVtCaju,
  };
}

/**
 * Confronta Planilha de Rotas (Valorização) com Planilha de Custo Operacional (Benefícios)
 * Suporta sincronização automática inteligente + vínculos manuais do usuário
 */
export function calculateConfronto(
  tradeRecords: TradeRecord[],
  benefitRecords: BenefitRecord[],
  customManualLinks?: Record<string, string>
): { records: ConfrontoRecord[]; kpis: ConfrontoKPIData } {
  const manualLinks = customManualLinks || getManualLinks();

  // Agrupador unificado de rotas por promotor
  interface RotaAgg {
    chave: string;
    nome: string;
    cpf: string;
    visitasSemanais: number;
    valorSemanal: number;
    horasSemanais: number;
    horasMensais: number;
    locais: Set<string>;
    redes: Set<string>;
    matched: boolean;
  }

  const rotaAggsMap: Record<string, RotaAgg> = {};

  tradeRecords.forEach((tr) => {
    const agName = (tr.agente && tr.agente.trim()) ? tr.agente.trim() : '(Sem Agente Atribuído)';
    const agKey = agName.toUpperCase().replace(/\s+/g, ' ');

    if (!rotaAggsMap[agKey]) {
      rotaAggsMap[agKey] = {
        chave: agKey,
        nome: agName,
        cpf: tr.cpf || '—',
        visitasSemanais: 0,
        valorSemanal: 0,
        horasSemanais: 0,
        horasMensais: 0,
        locais: new Set<string>(),
        redes: new Set<string>(),
        matched: false,
      };
    }

    const agg = rotaAggsMap[agKey];
    agg.visitasSemanais += tr.visitasSemanais;
    agg.valorSemanal += tr.valorSemanal;
    agg.horasSemanais += tr.horasSemanais;
    agg.horasMensais += (tr.horasSemanais * MULTIPLIER);
    if (tr.local) agg.locais.add(tr.local);
    if (tr.rede) agg.redes.add(tr.rede);
    if (tr.cpf && tr.cpf !== '—' && (!agg.cpf || agg.cpf === '—' || agg.cpf.length < 8)) {
      agg.cpf = tr.cpf;
    }
  });

  const rotaAggs = Object.values(rotaAggsMap);

  const confrontoRecords: ConfrontoRecord[] = [];

  // 1. Processa todos os colaboradores da planilha de benefícios
  benefitRecords.forEach((br) => {
    let rotaMatch: RotaAgg | undefined;
    let vinculoManual = false;
    let matchScore = 0;
    let tipoMatch: 'manual' | 'exato' | 'aproximado' | 'pendente' = 'pendente';

    // A. Verifica se existe vínculo manual explícito (Agente -> Nome)
    const agenteManualKey = Object.keys(manualLinks).find(
      (agKey) => manualLinks[agKey] === br.nome || cleanNomeForMatching(manualLinks[agKey]) === cleanNomeForMatching(br.nome)
    );

    if (agenteManualKey) {
      rotaMatch = rotaAggs.find(
        (r) => !r.matched && (r.nome === agenteManualKey || cleanNomeForMatching(r.nome) === cleanNomeForMatching(agenteManualKey))
      );
      if (rotaMatch) {
        vinculoManual = true;
        matchScore = 100;
        tipoMatch = 'manual';
      }
    }

    // B. Se não tem vínculo manual, faz o cruzamento inteligente
    if (!rotaMatch) {
      const best = findBestMatch(
        br.nome,
        br.cpf,
        rotaAggs.filter((r) => !r.matched),
        80
      );
      if (best) {
        rotaMatch = best.item;
        matchScore = best.score;
        tipoMatch = best.score >= 98 ? 'exato' : 'aproximado';
      }
    }

    let faturamentoMensal = 0;
    let valorSemanalRota = 0;
    let visitasSemanais = 0;
    let horasSemanais = 0;
    let horasMensais = 0;
    let locaisAtendidos = 0;
    let redesAtendidas = 0;
    let matchedRota = false;

    if (rotaMatch) {
      matchedRota = true;
      rotaMatch.matched = true;
      valorSemanalRota = rotaMatch.valorSemanal;
      faturamentoMensal = valorSemanalRota * MULTIPLIER;
      visitasSemanais = rotaMatch.visitasSemanais;
      horasSemanais = rotaMatch.horasSemanais;
      horasMensais = horasSemanais * MULTIPLIER;
      locaisAtendidos = rotaMatch.locais.size;
      redesAtendidas = rotaMatch.redes.size;
    }

    const vtTotal = br.vtTotal;
    const custoRh = Math.max(0, br.custoTotalPromotor - vtTotal);
    const custoTotalMensal = custoRh + vtTotal;
    const margemContribuicao = faturamentoMensal - custoTotalMensal;
    const margemPct = faturamentoMensal > 0 ? (margemContribuicao / faturamentoMensal) * 100 : -100;

    let status: 'lucro' | 'alerta' | 'prejuizo' = 'lucro';
    if (margemContribuicao < 0) {
      status = 'prejuizo';
    } else if (margemPct < 15) {
      status = 'alerta';
    }

    confrontoRecords.push({
      id: `conf-rh-${br.id}`,
      nome: br.nome,
      nomeRota: rotaMatch?.nome,
      nomeBeneficio: br.nome,
      cpf: br.cpf,
      matchedRota,
      visitasSemanais,
      valorSemanalRota,
      horasSemanais,
      horasMensais,
      locaisAtendidos,
      redesAtendidas,
      faturamentoMensal,
      faturamentoPorHora: horasMensais > 0 ? faturamentoMensal / horasMensais : 0,
      matchedCusto: true,
      salarioBase: br.salarioBase,
      encargos: br.salarioComEncargos - br.salarioBase,
      beneficiosCaju: br.totalBeneficiosCaju,
      vtTotal,
      taxaSupervisao: br.taxaSupervisao,
      taxaAdm: br.taxaAdm,
      premiacao: br.premiacao,
      tributos: br.tributos,
      subtotalDiversos: br.subtotalDiversos,
      epiSeguro: br.epiSeguro,
      custoRh,
      custoTotalMensal,
      custoPorHora: HORAS_MES_PADRAO > 0 ? custoTotalMensal / HORAS_MES_PADRAO : 0,
      margemContribuicao,
      margemPct: Math.round(margemPct * 10) / 10,
      status,
      vinculoManual,
      matchScore,
      tipoMatch: matchedRota ? tipoMatch : 'pendente',
    });
  });

  // 2. Inclui promotores da base de rotas que não foram vinculados a nenhum colaborador de custo
  rotaAggs.forEach((rAgg, idx) => {
    if (!rAgg.matched) {
      const faturamentoMensal = rAgg.valorSemanal * MULTIPLIER;
      confrontoRecords.push({
        id: `conf-rota-${idx}-${rAgg.chave}`,
        nome: rAgg.nome,
        nomeRota: rAgg.nome,
        cpf: rAgg.cpf,
        matchedRota: true,
        visitasSemanais: rAgg.visitasSemanais,
        valorSemanalRota: rAgg.valorSemanal,
        horasSemanais: rAgg.horasSemanais,
        horasMensais: rAgg.horasMensais,
        locaisAtendidos: rAgg.locais.size,
        redesAtendidas: rAgg.redes.size,
        faturamentoMensal,
        faturamentoPorHora: rAgg.horasMensais > 0 ? faturamentoMensal / rAgg.horasMensais : 0,
        matchedCusto: false,
        salarioBase: 0,
        encargos: 0,
        beneficiosCaju: 0,
        vtTotal: 0,
        taxaSupervisao: 0,
        taxaAdm: 0,
        premiacao: 0,
        tributos: 0,
        custoRh: 0,
        custoTotalMensal: 0,
        custoPorHora: 0,
        margemContribuicao: faturamentoMensal,
        margemPct: 100,
        status: 'lucro',
        tipoMatch: 'pendente',
      });
    }
  });

  // KPIs de confronto
  let faturamentoTotal = 0;
  let custoRhTotal = 0;
  let vtRealTotal = 0;
  let custoTotal = 0;
  let promotoresLucro = 0;
  let promotoresPrejuizo = 0;
  let promotoresAlerta = 0;

  confrontoRecords.forEach((c) => {
    faturamentoTotal += c.faturamentoMensal;
    custoRhTotal += c.custoRh;
    vtRealTotal += c.vtTotal;
    custoTotal += c.custoTotalMensal;
    if (c.status === 'lucro') promotoresLucro++;
    else if (c.status === 'prejuizo') promotoresPrejuizo++;
    else promotoresAlerta++;
  });

  const margemLiquidaTotal = faturamentoTotal - (custoRhTotal + vtRealTotal);
  const margemPercentualGeral = faturamentoTotal > 0 ? (margemLiquidaTotal / faturamentoTotal) * 100 : 0;
  const faturamentoMedioPorHora =
    confrontoRecords.length > 0 ? faturamentoTotal / (confrontoRecords.length * HORAS_MES_PADRAO) : 0;
  const custoMedioPorHora =
    confrontoRecords.length > 0 ? custoTotal / (confrontoRecords.length * HORAS_MES_PADRAO) : 0;

  const auditoriaConciliacao = auditarConciliacaoNomes(tradeRecords, benefitRecords, manualLinks);

  return {
    records: confrontoRecords,
    kpis: {
      promotoresAnalisados: confrontoRecords.length,
      promotoresConfrontados: confrontoRecords.filter((c) => c.matchedRota && c.matchedCusto).length,
      faturamentoTotal,
      custoRhTotal,
      vtRealTotal,
      custoTotal,
      margemLiquidaTotal,
      margemPercentualGeral: Math.round(margemPercentualGeral * 10) / 10,
      promotoresLucro,
      promotoresPrejuizo,
      promotoresAlerta,
      faturamentoMedioPorHora,
      custoMedioPorHora,
      auditoriaConciliacao,
    },
  };
}

/**
 * Realiza a auditoria de conciliação cruzada comparando:
 * - Coluna AGENTE da Planilha de Valorização (Rotas)
 * - Coluna NOME da Planilha de Custo Operacional (Benefícios/RH)
 * Inclui sugestões automáticas para itens não conciliados
 */
export function auditarConciliacaoNomes(
  tradeRecords: TradeRecord[],
  benefitRecords: BenefitRecord[],
  customManualLinks?: Record<string, string>
): ConciliacaoAuditoria {
  const manualLinks = customManualLinks || getManualLinks();

  interface AgenteValorizacaoItem {
    id: string;
    nome: string;
    cpf: string;
    nomeOriginal: string;
    cpfOriginal: string;
    valorSemanal: number;
    faturamentoMensal: number;
    matched: boolean;
  }

  const agentesValorizacaoMap: Record<string, AgenteValorizacaoItem> = {};

  tradeRecords.forEach((tr) => {
    const agName = (tr.agente && tr.agente.trim()) ? tr.agente.trim() : '(Sem Agente Atribuído)';
    const agKey = agName.toUpperCase().replace(/\s+/g, ' ');

    if (!agentesValorizacaoMap[agKey]) {
      agentesValorizacaoMap[agKey] = {
        id: `ag-${Object.keys(agentesValorizacaoMap).length}`,
        nome: agName,
        cpf: tr.cpf || '—',
        nomeOriginal: agName,
        cpfOriginal: tr.cpf || '—',
        valorSemanal: 0,
        faturamentoMensal: 0,
        matched: false,
      };
    }

    const item = agentesValorizacaoMap[agKey];
    item.valorSemanal += tr.valorSemanal;
    item.faturamentoMensal += tr.valorSemanal * MULTIPLIER;
    if (tr.cpf && tr.cpf !== '—' && (!item.cpf || item.cpf === '—' || item.cpf.length < 8)) {
      item.cpf = tr.cpf;
      item.cpfOriginal = tr.cpf;
    }
  });

  const agentesValorizacao = Object.values(agentesValorizacaoMap);

  const nomesApenasNoCusto: ConciliacaoFaltanteItem[] = [];
  let totalConciliados = 0;
  let totalVinculosManuais = 0;

  benefitRecords.forEach((br) => {
    // 1. Tenta vínculo manual primeiro
    const manualAgenteKey = Object.keys(manualLinks).find(
      (ag) => manualLinks[ag] === br.nome || cleanNomeForMatching(manualLinks[ag]) === cleanNomeForMatching(br.nome)
    );

    let matchItem: AgenteValorizacaoItem | undefined;

    if (manualAgenteKey) {
      matchItem = agentesValorizacao.find(
        (a) => !a.matched && (a.nomeOriginal === manualAgenteKey || cleanNomeForMatching(a.nome) === cleanNomeForMatching(manualAgenteKey))
      );
      if (matchItem) {
        totalVinculosManuais++;
      }
    }

    // 2. Se não houver vínculo manual, faz match inteligente
    if (!matchItem) {
      const match = findBestMatch(
        br.nome,
        br.cpf,
        agentesValorizacao.filter((a) => !a.matched),
        80
      );
      if (match) {
        matchItem = match.item;
      }
    }

    if (matchItem) {
      totalConciliados++;
      matchItem.matched = true;
    } else {
      // Sugere candidatos mais próximos para facilitar o vínculo manual
      const topCandidatos = findTopCandidates(
        br.nome,
        br.cpf,
        agentesValorizacao.filter((a) => !a.matched),
        3
      ).map((c) => ({ nome: c.item.nomeOriginal, score: c.score }));

      nomesApenasNoCusto.push({
        id: `falta-custo-${br.id}`,
        nome: br.nome,
        cpf: br.cpf,
        origem: 'custo',
        motivo: 'sem_rota',
        custoTotalMensal: br.custoTotalPromotor,
        candidatosSugeridos: topCandidatos,
      });
    }
  });

  // Nomes que constam na Valorização (AGENTE), mas NÃO estão no Custo (NOME)
  const nomesApenasNaValorizacao: ConciliacaoFaltanteItem[] = [];
  agentesValorizacao.forEach((ag) => {
    if (!ag.matched) {
      const topCandidatos = findTopCandidates(
        ag.nomeOriginal,
        ag.cpfOriginal,
        benefitRecords,
        3
      ).map((c) => ({ nome: c.item.nome, score: c.score }));

      nomesApenasNaValorizacao.push({
        id: `falta-rota-${ag.id}`,
        nome: ag.nomeOriginal,
        cpf: ag.cpfOriginal,
        origem: 'valorizacao',
        motivo: 'sem_custo_rh',
        valorSemanal: ag.valorSemanal,
        faturamentoMensal: ag.faturamentoMensal,
        candidatosSugeridos: topCandidatos,
      });
    }
  });

  const totalNomesCusto = benefitRecords.length;
  const totalNomesValorizacao = agentesValorizacao.length;
  const maxNomes = Math.max(totalNomesCusto, totalNomesValorizacao, 1);
  const isTotalmenteConciliado = nomesApenasNoCusto.length === 0 && nomesApenasNaValorizacao.length === 0;
  const taxaConciliacaoPct = Math.round((totalConciliados / maxNomes) * 100);

  return {
    totalNomesCusto,
    totalNomesValorizacao,
    totalConciliados,
    totalVinculosManuais,
    isTotalmenteConciliado,
    taxaConciliacaoPct,
    nomesApenasNoCusto,
    nomesApenasNaValorizacao,
  };
}
