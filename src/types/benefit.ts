export interface BenefitRecord {
  id: string;
  nome: string;
  empresaCompra: string;
  colaborador: number | null;
  cpf: string;
  dataAdmissao: number | string | null;
  funcao: string;
  tipoContrato: string;
  modalidade: string;
  cargaHoraria: string;
  jornada: string;
  departamento: string;
  diasMesSegSab: number;
  diasUteisSegSex: number;
  atestadosSegSex: number;
  atestadosSab: number;
  faltasSegSex: number;
  faltasSab: number;
  diasEfetivosVT: number;
  diasEfetivosVR: number;
  tipoVT: string;
  mediaJae: number;
  mediaRcardUsuario: number;
  mediaRcardEmpresa: number;
  mediaCajuMob: number;
  mediaCajuSaldoLivre: number;
  vtJae: number;
  vtRcardUsuario: number;
  vtRcardEmpresa: number;
  vtCajuMob: number;
  vtCajuSaldoLivre: number;
  vtTotal: number;
  km: string;
  kmValor: number;
  vrDiario: number;
  vrTotal: number;
  vrDescontoFolha: number;
  celularDiario: number;
  celularTotal: number;
  cestaDireito: string;
  cestaTotal: number;
  homeOfficeDireito: string;
  homeOfficeTotal: number;
  totalBeneficiosCaju: number;
  salarioBase: number;
  salarioComEncargos: number;
  epiSeguro: number;
  subtotalDiversos: number;
  taxaSupervisao: number;
  taxaAdm: number;
  tributos: number;
  premiacao: number;
  aso: number;
  pgr: number;
  mob2con: number;
  appProdutividade: number;
  custoTotalPromotor: number;
  pctVtSalario: number;
}

export interface BenefitKPIData {
  totalPromotores: number;
  folhaSalarialBase: number;
  encargosTrabalhistas: number;
  totalBeneficiosCaju: number;
  totalVT: number;
  totalEpiSeguro: number;
  totalDiversos: number;
  totalTaxaSupervisao: number;
  totalTaxaAdm: number;
  totalTributos: number;
  totalPremiacao: number;
  custoTotalOperacional: number;
  custoMedioPorPromotor: number;
  custoMedioHora: number;
  totalDescontoPAT: number;
  promotoresVtCritico: number; // VT > 50% do salário
  totalVtJae: number;
  totalVtRcard: number;
  totalVtCaju: number;
}

export interface ConfrontoRecord {
  id: string;
  nome: string;
  nomeRota?: string;
  nomeBeneficio?: string;
  cpf: string;
  // Dados de Valorização (Rotas)
  matchedRota: boolean;
  visitasSemanais: number;
  valorSemanalRota: number;
  horasSemanais: number;
  horasMensais: number;
  locaisAtendidos: number;
  redesAtendidas: number;
  faturamentoMensal: number;
  faturamentoPorHora: number;
  // Dados de Custo Operacional (Benefícios e Folha)
  matchedCusto: boolean;
  salarioBase: number;
  encargos: number;
  beneficiosCaju: number;
  vtTotal: number; // VT Real Logística
  taxaSupervisao: number;
  taxaAdm?: number;
  premiacao?: number;
  tributos: number;
  subtotalDiversos?: number;
  epiSeguro?: number;
  custoRh: number; // Custo RH (Folha + Encargos + Benefícios Caju + Taxas + Tributos + Premiação)
  custoTotalMensal: number; // Custo Total = Custo RH + VT Real
  custoPorHora: number;
  // Indicadores de Confronto / DRE
  margemContribuicao: number; // faturamentoMensal - (custoRh + vtTotal)
  margemPct: number; // (margemContribuicao / faturamentoMensal) * 100
  status: 'lucro' | 'alerta' | 'prejuizo';
  // Vínculo e Sincronização
  vinculoManual?: boolean;
  matchScore?: number;
  tipoMatch?: 'manual' | 'exato' | 'aproximado' | 'pendente';
}

export interface ConciliacaoFaltanteItem {
  id?: string;
  nome: string;
  cpf: string;
  origem: 'valorizacao' | 'custo';
  motivo: 'sem_rota' | 'sem_custo_rh';
  valorSemanal?: number;
  faturamentoMensal?: number;
  custoTotalMensal?: number;
  candidatosSugeridos?: { nome: string; score: number }[];
}

export interface VinculoManualItem {
  agenteRota: string;
  nomeBeneficio: string;
  dataVinculo?: string;
}

export interface ConciliacaoAuditoria {
  totalNomesCusto: number;
  totalNomesValorizacao: number;
  totalConciliados: number;
  totalVinculosManuais: number;
  isTotalmenteConciliado: boolean;
  taxaConciliacaoPct: number;
  nomesApenasNoCusto: ConciliacaoFaltanteItem[];
  nomesApenasNaValorizacao: ConciliacaoFaltanteItem[];
}

export interface ConfrontoKPIData {
  promotoresAnalisados: number;
  promotoresConfrontados: number;
  faturamentoTotal: number;
  custoRhTotal: number; // Custo RH sem VT
  vtRealTotal: number; // VT Real Total
  custoTotal: number; // Custo Total = Custo RH + VT Real
  margemLiquidaTotal: number; // Faturamento - (Custo RH + VT Real)
  margemPercentualGeral: number;
  promotoresLucro: number;
  promotoresPrejuizo: number;
  promotoresAlerta: number;
  faturamentoMedioPorHora: number;
  custoMedioPorHora: number;
  auditoriaConciliacao: ConciliacaoAuditoria;
}

