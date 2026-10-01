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
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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
  const fs = String(r['FREQ. SEMANAL'] || '').toUpperCase();
  if (fs.includes('15/15')) return 0.5;
  if (fs.includes('5X')) return 5;
  if (fs.includes('4X')) return 4;
  if (fs.includes('3X')) return 3;
  if (fs.includes('2X')) return 2;
  if (fs.includes('1X')) return 1;

  const freqVal =
    r['FREQUÊNCIA'] ?? r['FREQUENCIA'] ?? r['FREQUNCIA'] ?? r['FREQU?NCIA'];
  const n = parseNum(freqVal);
  return n > 0 ? n : 1;
}

export function getRowHorasUnitarias(r: RawTradeRow): number {
  const h = parseNum(r['HORAS POR VISITA']);
  return h > 0 ? h : 1;
}

export function getRowHorasSemanais(r: RawTradeRow): number {
  return getRowHorasUnitarias(r) * getRowVisitasSemanais(r);
}

export function getRowValorSemanal(r: RawTradeRow): number {
  const vs = parseNum(r['VALOR SEMANAL']);
  if (vs > 0) return vs;
  const vu = parseNum(r['VALOR']);
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
  const valorUnitario = parseNum(r['VALOR']) || (visitasSemanais > 0 ? valorSemanal / visitasSemanais : 0);
  const vm = valorSemanal * MULTIPLIER;
  const custoPorVisita = visitasSemanais > 0 ? valorSemanal / visitasSemanais : 0;
  const valorPorHora = horasSemanais > 0 ? valorSemanal / horasSemanais : 0;

  return {
    id: `rec-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    form: String(r['FORM'] || '').trim() || '(Sem Formulário)',
    rede: String(r['REDE'] || '').trim() || '(Sem Rede)',
    agente: String(r['AGENTE'] || '').trim() || '(Sem Agente)',
    cpf: String(r['CPF'] || '').trim() || '—',
    regiao: String(r['REGIAO'] || '').trim() || '(Sem Região)',
    local: String(r['LOCAL'] || r['RAZAO SOCIAL'] || '').trim() || '(Sem Local)',
    freqSemanal: String(r['FREQ. SEMANAL'] || `${visitasSemanais}X`).trim(),
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
