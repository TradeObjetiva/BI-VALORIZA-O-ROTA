import {
  RawTradeRow,
  TradeRecord,
  KPIData,
  RedeMetrics,
  RegiaoMetrics,
  AgentMetrics,
  FormMetrics,
  MatrixData,
  SimulationConfig
} from '../types/trade';

export const MULTIPLIER = 52 / 12; // 4.3333333...

export function parseNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  const s = String(val)
    .replace('R$', '')
    .replace(/\s+/g, '')
    .trim();

  if (!s) return 0;

  // If contains both dot and comma (Brazilian currency/thousand format: e.g. 1.250,50)
  if (s.includes('.') && s.includes(',')) {
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  // If contains comma only (e.g. 3,5 or 1250,50)
  if (s.includes(',')) {
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  // If contains dot only with 1 or 2 decimals (e.g. 3.5, 3.50, 240.0) -> decimal
  if (/^\d+\.\d{1,2}$/.test(s)) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  // Fallback
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

/**
 * Parses hours from varied formats:
 * - Time format: "03:30", "3:30", "03:30:00" -> 3.5
 * - Text format: "3h30", "3h 30m", "3h30min", "3h" -> 3.5
 * - Decimal: "3,5", "3.5", "3,50" -> 3.5
 * - Excel time serial fraction: 0.14583333333333334 -> 3.5 (0.1458 * 24)
 */
export function parseHours(val: any): number {
  if (val === null || val === undefined || val === '') return 0;

  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    // Excel time fraction (e.g. 0.14583333333333334 for 03:30)
    if (val > 0 && val < 1 && val.toString().length > 6) {
      return Math.round(val * 24 * 100) / 100;
    }
    return val;
  }

  const s = String(val).trim();
  if (!s) return 0;

  // 1. Time format "HH:MM" or "HH:MM:SS" (e.g. "03:30", "3:30", "03:30:00")
  if (s.includes(':')) {
    const parts = s.replace(/[^0-9:]/g, '').split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const sec = parseInt(parts[2], 10) || 0;
    return Math.round((h + m / 60 + sec / 3600) * 100) / 100;
  }

  // 2. Portuguese format "3h30", "3h 30m", "3h30min", "3h"
  const hMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*h(?:oras?)?(?:\s*(\d+)(?:m|min)?)?/i);
  if (hMatch) {
    const h = parseFloat(hMatch[1].replace(',', '.'));
    const m = hMatch[2] ? parseFloat(hMatch[2]) : 0;
    return Math.round(((isNaN(h) ? 0 : h) + m / 60) * 100) / 100;
  }

  // 3. Decimal number with comma or dot (e.g. "3,5", "3.5", "3,50")
  return parseNum(s);
}

function normalizeKey(k: string): string {
  return k
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function findRowValue(r: RawTradeRow, aliases: string[]): any {
  if (!r || typeof r !== 'object') return undefined;
  const normalizedAliases = aliases.map(normalizeKey);
  const keys = Object.keys(r);

  // 1. Exact normalized match
  for (const alias of normalizedAliases) {
    for (const key of keys) {
      if (normalizeKey(key) === alias) {
        const val = r[key];
        if (val !== null && val !== undefined && val !== '') return val;
      }
    }
  }

  // 2. Partial match
  for (const alias of normalizedAliases) {
    for (const key of keys) {
      const nk = normalizeKey(key);
      if (nk.includes(alias) || alias.includes(nk)) {
        const val = r[key];
        if (val !== null && val !== undefined && val !== '') return val;
      }
    }
  }

  return undefined;
}

export function fmt(v: number): string {
  return (
    'R$ ' +
    v.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function fmtNumber(v: number, decimals = 1): string {
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getRowVisitasSemanais(r: RawTradeRow): number {
  const rawFreq = findRowValue(r, [
    'FREQ. SEMANAL',
    'FREQ SEMANAL',
    'FREQUENCIA SEMANAL',
    'FREQUENCIA',
    'FREQ',
    'VISITAS SEMANAIS',
    'VISITAS',
    'DIAS POR SEMANA',
    'DIAS NA SEMANA',
    'DIAS SEMANAIS',
    'QTD DIAS',
    'DIAS',
  ]);

  if (rawFreq === null || rawFreq === undefined || rawFreq === '') return 1;

  if (typeof rawFreq === 'number') {
    return rawFreq > 0 ? rawFreq : 1;
  }

  const s = String(rawFreq).toUpperCase().trim();

  if (s.includes('15/15') || s.includes('QUINZENAL')) return 0.5;
  if (s.includes('SEG A SAB') || s.includes('SEGUNDA A SABADO') || s.includes('SEG A SÁB')) return 6;
  if (s.includes('SEG A SEX') || s.includes('SEGUNDA A SEXTA')) return 5;

  // Regex matches e.g. "6X", "6 X", "6X/SEM", "7X", "5X", "4X", "3X", "2X", "1X"
  const xMatch = s.match(/(\d+(?:[.,]\d+)?)\s*X/i);
  if (xMatch) {
    const val = parseFloat(xMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }

  // Regex matches e.g. "6 DIAS", "6 VEZES", "6 VISITAS"
  const wordMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(?:DIAS?|VEZES|VISITAS?)/i);
  if (wordMatch) {
    const val = parseFloat(wordMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }

  const n = parseNum(s);
  return n > 0 ? n : 1;
}

export const DAY_COLUMN_PATTERNS = [
  { day: 'dom', aliases: ['DOM', 'DOMINGO', 'DOM.'] },
  { day: 'seg', aliases: ['SEG', 'SEGUNDA', 'SEG.'] },
  { day: 'ter', aliases: ['TER', 'TERCA', 'TERÇA', 'TER.'] },
  { day: 'qua', aliases: ['QUA', 'QUARTA', 'QUA.'] },
  { day: 'qui', aliases: ['QUI', 'QUINTA', 'QUI.'] },
  { day: 'sex', aliases: ['SEX', 'SEXTA', 'SEX.'] },
  { day: 'sab', aliases: ['SAB', 'SABADO', 'SÁBADO', 'SAB.'] },
];

/**
 * Calculates total scheduled hours and active days from the day-of-week columns (DOM, SEG, TER, QUA, QUI, SEX, SAB).
 */
export function getRowHorasDosDias(r: RawTradeRow): {
  totalHorasDias: number;
  hasDayColumns: boolean;
  diasAtivos: number;
} {
  let total = 0;
  let hasDayColumns = false;
  let diasAtivos = 0;

  for (const { aliases } of DAY_COLUMN_PATTERNS) {
    const val = findRowValue(r, aliases);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      hasDayColumns = true;
      const h = parseHours(val);
      if (h > 0) {
        total += h;
        diasAtivos++;
      }
    }
  }

  return {
    totalHorasDias: Math.round(total * 100) / 100,
    hasDayColumns,
    diasAtivos,
  };
}

export function getRowHorasUnitarias(r: RawTradeRow): number {
  // If day columns exist (DOM, SEG, TER, QUA, QUI, SEX, SAB):
  const { totalHorasDias, hasDayColumns } = getRowHorasDosDias(r);
  if (hasDayColumns && totalHorasDias > 0) {
    const visitas = getRowVisitasSemanais(r);
    return visitas > 0 ? Math.round((totalHorasDias / visitas) * 100) / 100 : totalHorasDias;
  }

  const rawHours = findRowValue(r, [
    'HORAS DIARIAS',
    'HORA DIARIA',
    'HORAS/DIA',
    'HORAS / DIA',
    'HORAS POR DIA',
    'HORA POR DIA',
    'HORAS DIA',
    'CARGA HORARIA DIARIA',
    'CARGA HORARIA',
    'JORNADA DIARIA',
    'JORNADA',
    'HORAS POR VISITA',
    'HORA POR VISITA',
    'HORAS/VISITA',
    'HORAS VISITA',
    'HORA VISITA',
    'TEMPO POR VISITA',
    'TEMPO VISITA',
    'TEMPO EM LOJA',
    'HORAS',
    'HORA',
    'TEMPO',
  ]);

  const h = parseHours(rawHours);
  return h > 0 ? h : 1;
}

export function getRowHorasSemanais(r: RawTradeRow): number {
  // 1. If spreadsheet has columns for days of the week (DOM, SEG, TER, QUA, QUI, SEX, SAB):
  // The weekly hours of this row is the sum of hours scheduled across the days of the week!
  const { totalHorasDias, hasDayColumns } = getRowHorasDosDias(r);
  if (hasDayColumns && totalHorasDias > 0) {
    return totalHorasDias;
  }

  // 2. If spreadsheet already has an explicit weekly hours column, respect it
  const rawWeeklyHours = findRowValue(r, [
    'HORAS SEMANAIS',
    'HORA SEMANAL',
    'HORAS/SEMANA',
    'HORAS / SEMANA',
    'HORAS/SEM',
    'HORAS / SEM',
    'HORAS POR SEMANA',
    'CARGA SEMANAL',
    'CARGA HORARIA SEMANAL',
    'TOTAL HORAS SEMANAIS',
    'TOTAL HORAS',
    'TOTAL DE HORAS',
  ]);

  if (rawWeeklyHours !== undefined && rawWeeklyHours !== null && rawWeeklyHours !== '') {
    const weeklyHours = parseHours(rawWeeklyHours);
    if (weeklyHours > 0) {
      return weeklyHours;
    }
  }

  // 3. Otherwise calculate: horas unitárias (diárias / por visita) * frequência semanal
  return Math.round(getRowHorasUnitarias(r) * getRowVisitasSemanais(r) * 100) / 100;
}

export function getRowValorSemanal(r: RawTradeRow): number {
  const rawVs = findRowValue(r, [
    'VALOR SEMANAL',
    'VALOR/SEM',
    'VALOR / SEM',
    'FATURAMENTO SEMANAL',
    'TOTAL SEMANAL',
  ]);
  const vs = parseNum(rawVs);
  if (vs > 0) return vs;

  const rawVu = findRowValue(r, [
    'VALOR',
    'VALOR UNITARIO',
    'VALOR/VISITA',
    'VALOR POR VISITA',
  ]);
  const vu = parseNum(rawVu);
  return vu * getRowVisitasSemanais(r);
}

export function valorMensal(r: RawTradeRow): number {
  return getRowValorSemanal(r) * MULTIPLIER;
}

export function transformRawRow(r: RawTradeRow, idx: number): TradeRecord {
  const visitasSemanais = getRowVisitasSemanais(r);
  const horasPorVisita = getRowHorasUnitarias(r);
  const horasSemanais = getRowHorasSemanais(r);
  const horasMensais = horasSemanais * MULTIPLIER;
  const valorSemanal = getRowValorSemanal(r);
  const rawValor = findRowValue(r, ['VALOR', 'VALOR UNITARIO', 'VALOR/VISITA']);
  const valorUnitario = parseNum(rawValor) || (visitasSemanais > 0 ? valorSemanal / visitasSemanais : 0);
  const vm = valorSemanal * MULTIPLIER;
  const custoPorVisita = visitasSemanais > 0 ? valorSemanal / visitasSemanais : 0;
  const valorPorHora = horasSemanais > 0 ? valorSemanal / horasSemanais : 0;

  const formVal = findRowValue(r, ['FORM', 'FORMULARIO', 'MARCA', 'PESQUISA', 'PROJETO']) || '';
  const redeVal = findRowValue(r, ['REDE', 'CLIENTE', 'BANDEIRA', 'REDE DE VAREJO']) || '';
  const agenteVal = findRowValue(r, ['AGENTE', 'PROMOTOR', 'PROMOTORA', 'NOME DO AGENTE', 'NOME']) || '';
  const cpfVal = findRowValue(r, ['CPF', 'DOCUMENTO']) || '—';
  const regiaoVal = findRowValue(r, ['REGIAO', 'ESTADO', 'UF', 'CIDADE', 'PRACA']) || '';
  const localVal = findRowValue(r, ['LOCAL', 'RAZAO SOCIAL', 'NOME FANTASIA', 'LOJA', 'PDV', 'PONTO DE VENDA']) || '';
  const freqSemanalVal = findRowValue(r, ['FREQ. SEMANAL', 'FREQ SEMANAL', 'FREQUENCIA']) || `${visitasSemanais}X`;

  return {
    id: `rec-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    form: String(formVal).trim() || '(Sem Formulário)',
    rede: String(redeVal).trim() || '(Sem Rede)',
    agente: String(agenteVal).trim() || '(Sem Agente)',
    cpf: String(cpfVal).trim() || '—',
    regiao: String(regiaoVal).trim() || '(Sem Região)',
    local: String(localVal).trim() || '(Sem Local)',
    freqSemanal: String(freqSemanalVal).trim(),
    visitasSemanais,
    horasPorVisita,
    horasSemanais,
    horasMensais,
    valorUnitario,
    valorSemanal,
    valorMensal: vm,
    custoPorVisita,
    valorPorHora,
  };
}

export function applySimulationToRecord(
  rec: TradeRecord,
  sim: SimulationConfig
): TradeRecord {
  if (!sim.active || sim.percentage === 0) return rec;

  let applies = false;
  if (sim.scopeType === 'todos') {
    applies = true;
  } else if (sim.scopeType === 'rede' && rec.rede === sim.scopeValue) {
    applies = true;
  } else if (sim.scopeType === 'regiao' && rec.regiao === sim.scopeValue) {
    applies = true;
  } else if (sim.scopeType === 'form' && rec.form === sim.scopeValue) {
    applies = true;
  }

  if (!applies) return rec;

  const factor = 1 + sim.percentage / 100;
  const newValorSemanal = rec.valorSemanal * factor;
  const newValorMensal = newValorSemanal * MULTIPLIER;
  const newValorUnitario = rec.valorUnitario * factor;
  const newCustoPorVisita =
    rec.visitasSemanais > 0 ? newValorSemanal / rec.visitasSemanais : 0;
  const newValorPorHora =
    rec.horasSemanais > 0 ? newValorSemanal / rec.horasSemanais : 0;

  return {
    ...rec,
    valorSemanal: newValorSemanal,
    valorMensal: newValorMensal,
    valorUnitario: newValorUnitario,
    custoPorVisita: newCustoPorVisita,
    valorPorHora: newValorPorHora,
  };
}

export function calculateKPIs(records: TradeRecord[]): KPIData {
  const agentesSet = new Set<string>();
  const locaisSet = new Set<string>();
  const redesSet = new Set<string>();
  const formsSet = new Set<string>();

  let valorSemanalTotal = 0;
  let valorMensalTotal = 0;
  let totalVisitasSemanais = 0;
  let totalHorasSemanais = 0;

  const agentHoursMap: Record<string, number> = {};
  const agentRedeMap: Record<string, Record<string, number>> = {};
  const agentValMap: Record<string, number> = {};

  records.forEach((r) => {
    if (r.agente && r.agente !== '(Sem Agente)') {
      agentesSet.add(r.agente);
      agentHoursMap[r.agente] = (agentHoursMap[r.agente] || 0) + r.horasSemanais;
      agentValMap[r.agente] = (agentValMap[r.agente] || 0) + r.valorMensal;
      if (!agentRedeMap[r.agente]) agentRedeMap[r.agente] = {};
      agentRedeMap[r.agente][r.rede] =
        (agentRedeMap[r.agente][r.rede] || 0) + r.valorMensal;
    }
    if (r.local && r.local !== '(Sem Local)') locaisSet.add(r.local);
    if (r.rede && r.rede !== '(Sem Rede)') redesSet.add(r.rede);
    if (r.form && r.form !== '(Sem Formulário)') formsSet.add(r.form);

    valorSemanalTotal += r.valorSemanal;
    valorMensalTotal += r.valorMensal;
    totalVisitasSemanais += r.visitasSemanais;
    totalHorasSemanais += r.horasSemanais;
  });

  const agentesAtivos = agentesSet.size;
  const locaisUnicos = locaisSet.size;
  const redesAtendidas = redesSet.size;
  const marcasAtivas = formsSet.size;

  const ticketMedioAgente = agentesAtivos > 0 ? valorMensalTotal / agentesAtivos : 0;
  const custoMedioVisita =
    totalVisitasSemanais > 0 ? valorSemanalTotal / totalVisitasSemanais : 0;
  const valorPorHoraMedio =
    totalHorasSemanais > 0 ? valorSemanalTotal / totalHorasSemanais : 0;

  let agentesConcentradosQtd = 0;
  let agentesOverworkedQtd = 0;

  Object.entries(agentValMap).forEach(([ag, totalVal]) => {
    const redes = agentRedeMap[ag] || {};
    const maxRedeVal = Math.max(...Object.values(redes), 0);
    const conc = totalVal > 0 ? (maxRedeVal / totalVal) * 100 : 0;
    if (conc >= 50) agentesConcentradosQtd++;
    if ((agentHoursMap[ag] || 0) > 44) agentesOverworkedQtd++;
  });

  return {
    valorMensalTotal,
    valorSemanalTotal,
    agentesAtivos,
    locaisUnicos,
    redesAtendidas,
    marcasAtivas,
    ticketMedioAgente,
    custoMedioVisita,
    valorPorHoraMedio,
    totalVisitasSemanais,
    totalHorasSemanais,
    totalHorasMensais: totalHorasSemanais * MULTIPLIER,
    agentesConcentradosQtd,
    agentesOverworkedQtd,
  };
}

export function calculateRedeAnalysis(records: TradeRecord[]): RedeMetrics[] {
  const map: Record<
    string,
    {
      value: number;
      valorSem: number;
      visitasSem: number;
      locais: Set<string>;
      agentes: Set<string>;
    }
  > = {};

  records.forEach((r) => {
    const rd = r.rede || '(Sem Rede)';
    if (!map[rd]) {
      map[rd] = {
        value: 0,
        valorSem: 0,
        visitasSem: 0,
        locais: new Set(),
        agentes: new Set(),
      };
    }
    map[rd].value += r.valorMensal;
    map[rd].valorSem += r.valorSemanal;
    map[rd].visitasSem += r.visitasSemanais;
    if (r.local) map[rd].locais.add(r.local);
    if (r.agente) map[rd].agentes.add(r.agente);
  });

  const total = Object.values(map).reduce((s, v) => s + v.value, 0);

  return Object.entries(map)
    .map(([label, d]) => ({
      label,
      value: d.value,
      valorSem: d.valorSem,
      visitasSem: d.visitasSem,
      custoVisita: d.visitasSem > 0 ? d.valorSem / d.visitasSem : 0,
      pct: total > 0 ? (d.value / total) * 100 : 0,
      locais: d.locais.size,
      agentesCount: d.agentes.size,
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateRegiaoAnalysis(records: TradeRecord[]): RegiaoMetrics[] {
  const map: Record<
    string,
    { value: number; locais: Set<string>; agentes: Set<string> }
  > = {};

  records.forEach((r) => {
    const reg = r.regiao || '(Sem Região)';
    if (!map[reg]) {
      map[reg] = { value: 0, locais: new Set(), agentes: new Set() };
    }
    map[reg].value += r.valorMensal;
    if (r.local) map[reg].locais.add(r.local);
    if (r.agente) map[reg].agentes.add(r.agente);
  });

  const total = Object.values(map).reduce((s, v) => s + v.value, 0);

  return Object.entries(map)
    .map(([label, d]) => ({
      label,
      value: d.value,
      pct: total > 0 ? (d.value / total) * 100 : 0,
      locais: d.locais.size,
      agentesCount: d.agentes.size,
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateFormAnalysis(records: TradeRecord[]): FormMetrics[] {
  const map: Record<string, { value: number; locais: Set<string> }> = {};

  records.forEach((r) => {
    const form = r.form || '(Sem Formulário)';
    if (!map[form]) {
      map[form] = { value: 0, locais: new Set() };
    }
    map[form].value += r.valorMensal;
    if (r.local) map[form].locais.add(r.local);
  });

  const total = Object.values(map).reduce((s, v) => s + v.value, 0);

  return Object.entries(map)
    .map(([label, d]) => ({
      label,
      value: d.value,
      pct: total > 0 ? (d.value / total) * 100 : 0,
      locais: d.locais.size,
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateAgentAnalysis(records: TradeRecord[]): AgentMetrics[] {
  const map: Record<
    string,
    {
      nome: string;
      cpf: string;
      regiao: string;
      valor: number;
      valorSemanal: number;
      locaisSet: Set<string>;
      formsSet: Set<string>;
      redesMap: Record<string, number>;
      horasSemanais: number;
    }
  > = {};

  records.forEach((r) => {
    const ag = r.agente;
    if (!ag || ag === '(Sem Agente)') return;
    if (!map[ag]) {
      map[ag] = {
        nome: ag,
        cpf: r.cpf,
        regiao: r.regiao,
        valor: 0,
        valorSemanal: 0,
        locaisSet: new Set(),
        formsSet: new Set(),
        redesMap: {},
        horasSemanais: 0,
      };
    }
    map[ag].valor += r.valorMensal;
    map[ag].valorSemanal += r.valorSemanal;
    if (r.local) map[ag].locaisSet.add(r.local);
    if (r.form) map[ag].formsSet.add(r.form);
    map[ag].horasSemanais += r.horasSemanais;
    map[ag].redesMap[r.rede] = (map[ag].redesMap[r.rede] || 0) + r.valorMensal;
  });

  const totalGeral = Object.values(map).reduce((s, a) => s + a.valor, 0);

  return Object.values(map).map((a) => {
    const horasMensais = a.horasSemanais * MULTIPLIER;
    const valorHora = horasMensais > 0 ? a.valor / horasMensais : 0;

    let topRedeName = '—';
    let topRedeVal = 0;
    Object.entries(a.redesMap).forEach(([rd, val]) => {
      if (val > topRedeVal) {
        topRedeVal = val;
        topRedeName = rd;
      }
    });

    const concentracaoPct = a.valor > 0 ? (topRedeVal / a.valor) * 100 : 0;
    const isConcentrado = concentracaoPct >= 50;
    const isOverworked = a.horasSemanais > 44;

    return {
      nome: a.nome,
      cpf: a.cpf,
      regiao: a.regiao,
      valor: a.valor,
      valorSemanal: a.valorSemanal,
      locais: a.locaisSet.size,
      forms: a.formsSet.size,
      horasSemanais: a.horasSemanais,
      horasMensais,
      valorHora,
      topRedeName,
      topRedeVal,
      concentracaoPct,
      isConcentrado,
      isOverworked,
      pct: totalGeral > 0 ? (a.valor / totalGeral) * 100 : 0,
      redesMap: a.redesMap,
    };
  });
}

export function calculateMatrixData(records: TradeRecord[]): MatrixData {
  const redeTotals: Record<string, number> = {};
  records.forEach((r) => {
    redeTotals[r.rede] = (redeTotals[r.rede] || 0) + r.valorMensal;
  });

  const topRedes = Object.entries(redeTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((x) => x[0]);

  const agentMap: Record<
    string,
    {
      nome: string;
      regiao: string;
      totalVal: number;
      totalLocSet: Set<string>;
      totalHr: number;
      redes: Record<
        string,
        { valor: number; locaisSet: Set<string>; horas: number }
      >;
    }
  > = {};

  records.forEach((r) => {
    const ag = r.agente;
    if (!ag || ag === '(Sem Agente)') return;

    if (!agentMap[ag]) {
      agentMap[ag] = {
        nome: ag,
        regiao: r.regiao,
        totalVal: 0,
        totalLocSet: new Set(),
        totalHr: 0,
        redes: {},
      };
    }

    if (!agentMap[ag].redes[r.rede]) {
      agentMap[ag].redes[r.rede] = {
        valor: 0,
        locaisSet: new Set(),
        horas: 0,
      };
    }

    agentMap[ag].redes[r.rede].valor += r.valorMensal;
    agentMap[ag].redes[r.rede].horas += r.horasSemanais;
    if (r.local) agentMap[ag].redes[r.rede].locaisSet.add(r.local);

    agentMap[ag].totalVal += r.valorMensal;
    agentMap[ag].totalHr += r.horasSemanais;
    if (r.local) agentMap[ag].totalLocSet.add(r.local);
  });

  const agents = Object.values(agentMap)
    .map((a) => ({
      nome: a.nome,
      regiao: a.regiao,
      totalVal: a.totalVal,
      totalLoc: a.totalLocSet.size,
      totalHr: a.totalHr,
      redes: Object.fromEntries(
        Object.entries(a.redes).map(([rd, cell]) => [
          rd,
          {
            valor: cell.valor,
            locaisCount: cell.locaisSet.size,
            horas: cell.horas,
          },
        ])
      ),
    }))
    .sort((a, b) => b.totalVal - a.totalVal);

  return { agents, topRedes };
}

export function calculateLojasFormsAnalysis(records: TradeRecord[]) {
  const lojaForms: Record<string, Set<string>> = {};
  records.forEach((r) => {
    if (!r.local || !r.form) return;
    if (!lojaForms[r.local]) lojaForms[r.local] = new Set();
    lojaForms[r.local].add(r.form);
  });

  const distrib: Record<number, number> = {};
  Object.values(lojaForms).forEach((fset) => {
    const n = fset.size;
    distrib[n] = (distrib[n] || 0) + 1;
  });

  const totalLojas = Object.keys(lojaForms).length;
  const maxForms = Math.max(...Object.keys(distrib).map(Number), 1);
  const totalFormsSum = Object.values(lojaForms).reduce(
    (s, v) => s + v.size,
    0
  );
  const mediaFormsPorLoja = totalLojas > 0 ? totalFormsSum / totalLojas : 0;

  return {
    lojaForms,
    distrib,
    totalLojas,
    maxForms,
    mediaFormsPorLoja,
  };
}

export function calculateFreqCrossAnalysis(records: TradeRecord[]) {
  const ORDER_FREQ = ['1X', '2X', '3X', '5X', '15/15'];

  const allFreqs = Array.from(
    new Set(records.map((r) => r.freqSemanal).filter(Boolean))
  ).sort((a, b) => {
    const ia = ORDER_FREQ.indexOf(a);
    const ib = ORDER_FREQ.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const matrix: Record<
    string,
    Record<string, { records: number; lojas: Set<string> }>
  > = {};
  const freqTotals: Record<string, number> = {};

  records.forEach((r) => {
    const { form, freqSemanal, local } = r;
    if (!form || !freqSemanal) return;

    if (!matrix[form]) matrix[form] = {};
    if (!matrix[form][freqSemanal]) {
      matrix[form][freqSemanal] = { records: 0, lojas: new Set() };
    }

    matrix[form][freqSemanal].records++;
    if (local) matrix[form][freqSemanal].lojas.add(local);
    freqTotals[freqSemanal] = (freqTotals[freqSemanal] || 0) + 1;
  });

  const sortedForms = Object.keys(matrix).sort((a, b) => {
    const totalA = Object.values(matrix[a]).reduce(
      (s, v) => s + v.lojas.size,
      0
    );
    const totalB = Object.values(matrix[b]).reduce(
      (s, v) => s + v.lojas.size,
      0
    );
    return totalB - totalA;
  });

  return {
    allFreqs,
    sortedForms,
    matrix,
    freqTotals,
  };
}
