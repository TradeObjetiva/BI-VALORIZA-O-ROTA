export interface RawTradeRow {
  FORM?: string;
  REDE?: string;
  AGENTE?: string;
  CPF?: string;
  REGIAO?: string;
  LOCAL?: string;
  'RAZAO SOCIAL'?: string;
  'FREQ. SEMANAL'?: string;
  'FREQUÊNCIA'?: string | number;
  'FREQUENCIA'?: string | number;
  'FREQUNCIA'?: string | number;
  'HORAS POR VISITA'?: string | number;
  'VALOR SEMANAL'?: string | number;
  VALOR?: string | number;
  [key: string]: any;
}

export interface TradeRecord {
  id: string;
  form: string;
  rede: string;
  agente: string;
  cpf: string;
  regiao: string;
  local: string;
  freqSemanal: string;
  visitasSemanais: number;
  horasPorVisita: number;
  horasSemanais: number;
  horasMensais: number;
  valorUnitario: number;
  valorSemanal: number;
  valorMensal: number;
  custoPorVisita: number;
  valorPorHora: number;
}

export interface FilterState {
  form: string;
  rede: string;
  agente: string;
  regiao: string;
  freq: string;
  search: string;
}

export interface SimulationConfig {
  active: boolean;
  percentage: number;
  scopeType: 'todos' | 'rede' | 'regiao' | 'form';
  scopeValue: string;
}

export interface AgentMetrics {
  nome: string;
  cpf: string;
  regiao: string;
  valor: number;
  valorSemanal: number;
  locais: number;
  forms: number;
  horasSemanais: number;
  horasMensais: number;
  valorHora: number;
  topRedeName: string;
  topRedeVal: number;
  concentracaoPct: number;
  isConcentrado: boolean;
  isOverworked: boolean; // > 44h/sem
  pct: number;
  redesMap: Record<string, number>;
}

export interface RedeMetrics {
  label: string;
  value: number;
  visitasSem: number;
  valorSem: number;
  custoVisita: number;
  pct: number;
  locais: number;
  agentesCount: number;
}

export interface RegiaoMetrics {
  label: string;
  value: number;
  pct: number;
  locais: number;
  agentesCount: number;
}

export interface FormMetrics {
  label: string;
  value: number;
  pct: number;
  locais: number;
}

export interface MatrixData {
  agents: {
    nome: string;
    regiao: string;
    totalVal: number;
    totalLoc: number;
    totalHr: number;
    redes: Record<string, { valor: number; locaisCount: number; horas: number }>;
  }[];
  topRedes: string[];
}

export interface KPIData {
  valorMensalTotal: number;
  valorSemanalTotal: number;
  agentesAtivos: number;
  locaisUnicos: number;
  redesAtendidas: number;
  marcasAtivas: number;
  ticketMedioAgente: number;
  custoMedioVisita: number;
  valorPorHoraMedio: number;
  totalVisitasSemanais: number;
  totalHorasSemanais: number;
  totalHorasMensais: number;
  agentesConcentradosQtd: number;
  agentesOverworkedQtd: number;
}

export interface StrategicIdea {
  id: string;
  categoria: 'financeiro' | 'compliance' | 'roteirizacao' | 'bi' | 'ia';
  titulo: string;
  badge: string;
  icone: string;
  problemaAtual: string;
  solucaoProposta: string;
  impactoEsperado: string;
  comoImplementar: string;
  kpiAlvo: string;
}
