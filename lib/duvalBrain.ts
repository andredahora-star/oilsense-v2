/**
 * DUVAL BRAIN — Motor Normativo OilSense v2
 *
 * Normas implementadas:
 * IEC 60599:2022   — Interpretacao de gases dissolvidos e livres em transformadores
 * IEEE C57.104-2019— Guia para interpretacao de gases em transformadores imersos em oleo mineral
 * IEC 61198:1993   — Métodos para determinacao de compostos furânicos
 * ASTM D5837       — Analise de compostos furânicos para avaliacao da isolacao celulósica
 * NBR 7070:2006    — Amostragem e analise de gases dissolvidos em oleo mineral isolante (cromatografia)
 * NBR 10710:2022   — Determinacao do teor de agua em oleo isolante (metodo Karl Fischer)
 * NBR 12133:1991   — Determinacao do fator de dissipacao dielétrica e permissividade relativa
 * NBR IEC 60156:2019— Determinacao da rigidez dielétrica do óleo isolante
 * NBR 14248:2009   — Determinacao do indice de neutralizacao/acidez de oleos isolantes
 * NBR 6234:2015    — Determinacao da tensao interfacial do óleo isolante a 25°C
 * NBR 14483:2015   — Determinacao da cor do oleo isolante (escala ASTM)
 * NBR 7148:2013    — Determinacao da densidade relativa do oleo mineral isolante
 */

// ============================================================
// 1. LIMITES IEEE C57.104-2019 — CONDIÇÕES DE OPERAÇÃO
// Tabela 1: Concentrações em µL/L (ppm) — para transformadores grandes
// ============================================================
export const IEEE_C57104_LIMITS = {
  condition1: { H2:100,  CH4:120,  C2H2:1,   C2H4:50,  C2H6:65,  CO:350,  CO2:2500, TDCG:720  },
  condition2: { H2:700,  CH4:400,  C2H2:9,   C2H4:100, C2H6:100, CO:570,  CO2:4000, TDCG:1920 },
  condition3: { H2:1800, CH4:1000, C2H2:35,  C2H4:200, C2H6:150, CO:1400, CO2:10000,TDCG:4630 },
  // > condition3 = condition4 (critico — retirar de servico)
}

// Ações por condição (IEEE C57.104-2019 Section 6)
export const IEEE_ACTIONS = {
  condition1: 'Operacao satisfatoria. Monitoramento de rotina. Coletar proxima amostra em 12 meses.',
  condition2: 'Concentracao acima do normal. Investigar. Monitoramento em 3-6 meses. Verificar tendencia.',
  condition3: 'Alto nivel de decomposicao. Investigar imediatamente. Monitoramento em 1-4 semanas.',
  condition4: 'Decomposicao excessiva. Risco de falha. Retirar de servico ou operar com extremo cuidado.',
}

// ============================================================
// 2. LIMITES IEC 60599:2022 — CONCENTRAÇÕES TÍPICAS 90%
// Para transformadores de potencia em servico (mineral oil)
// ============================================================
export const IEC60599_90PCT_LIMITS = {
  H2:  150,  // ppm — acima: investigar
  CH4: 130,  // ppm
  C2H2: 3,   // ppm — qualquer valor acima de 1 ppm exige atencao
  C2H4: 90,  // ppm
  C2H6: 90,  // ppm
  CO:   900, // ppm
  CO2:  14000,// ppm
}

// Relacoes de gases IEC 60599 (CO2/CO para degradacao do papel)
export const IEC60599_RATIOS = {
  CO2_CO_normal_min: 3,   // CO2/CO > 3 = isolacao celulósica OK
  CO2_CO_critical:   3,   // CO2/CO < 3 = degradacao acelerada do papel
  C2H2_H2_oltc_max:  2,   // C2H2/H2 > 2-3 indica contaminacao pelo OLTC
  O2_N2_min: 0.3,          // O2/N2 < 0.3 = consumo excessivo de oxigenio
}

// ============================================================
// 3. TRIANGULO DE DUVAL (IEC 60599 Annex D / IEEE C57.104 Annex C)
// Zonas de falha baseadas em CH4, C2H2, C2H4
// Percentuais relativos: %CH4 + %C2H2 + %C2H4 = 100%
// ============================================================
export const DUVAL_ZONES = {
  PD:  { name:'PD',  desc:'Descarga parcial (corona)',                           norm:'IEC 60599 / IEEE C57.104' },
  D1:  { name:'D1',  desc:'Descarga eletrica de baixa energia',                 norm:'IEC 60599 T1' },
  D2:  { name:'D2',  desc:'Descarga eletrica de alta energia (arco)',            norm:'IEC 60599 T2' },
  DT:  { name:'DT',  desc:'Misto: descarga eletrica + falha termal',            norm:'IEC 60599' },
  T1:  { name:'T1',  desc:'Sobreaquecimento termal T < 300°C',                  norm:'IEC 60599 / IEEE C57.104' },
  T2:  { name:'T2',  desc:'Sobreaquecimento termal 300°C < T < 700°C',         norm:'IEC 60599 / IEEE C57.104' },
  T3:  { name:'T3',  desc:'Sobreaquecimento termal T > 700°C',                  norm:'IEC 60599 / IEEE C57.104' },
}

// Implementacao do Triangulo de Duval
// Ref: Duval M., 'A review of faults detectable by gas-in-oil analysis in transformers'
// IEEE Electrical Insulation Magazine, 2002
export function duvalTriangle(ch4: number, c2h2: number, c2h4: number): keyof typeof DUVAL_ZONES {
  const total = ch4 + c2h2 + c2h4
  if (total <= 0) return 'PD'
  const pCH4  = (ch4  / total) * 100
  const pC2H2 = (c2h2 / total) * 100
  const pC2H4 = (c2h4 / total) * 100
  // Zona DT (mistura): C2H4 >= 20% e C2H2 >= 4%
  if (pC2H4 >= 20 && pC2H2 >= 4) return 'DT'
  // Zonas de descarga (D1, D2): C2H2 >= 4%
  if (pC2H2 >= 4) return pC2H4 > 23 ? 'D2' : 'D1'
  // Zona PD: CH4 >= 98% (sem C2H4 e C2H2 significativos)
  if (pCH4 >= 98) return 'PD'
  // Zonas termais (T1, T2, T3): por percentual de C2H4
  if (pC2H4 >= 50) return 'T3'
  if (pC2H4 >= 20) return pCH4 > 10 ? 'T2' : 'T1'
  return 'PD'
}

// ============================================================
// 4. MÉTODO DE ROGERS RATIO (IEEE C57.104-2019 Annex C)
// Tres relacoes: R1=CH4/H2, R2=C2H2/C2H4, R3=C2H4/C2H6
// ============================================================
export type RogersResult = {
  R1: number; R2: number; R3: number
  fault: string; code: string
}

export function rogersRatio(ch4:number, h2:number, c2h2:number, c2h4:number, c2h6:number): RogersResult {
  const R1 = h2   > 0 ? ch4  / h2   : 0
  const R2 = c2h4 > 0 ? c2h2 / c2h4 : 0
  const R3 = c2h6 > 0 ? c2h4 / c2h6 : 0
  let fault = 'Normal — sem falha identificada'
  let code  = 'N'
  // Tabela de Rogers (IEEE C57.104 Annex C)
  if (R1 < 0.1  && R2 < 0.1  && R3 < 0.01) { fault='PD — Descarga parcial';        code='PD' }
  else if (R1>=0.1&&R1<=1&&R2>0.1&&R2<=3&&R3<=3) { fault='D1 — Descarga baixa energia'; code='D1' }
  else if (R1>=0.1&&R1<=3&&R2>3    &&R3>=3)  { fault='D2 — Descarga alta energia (arco)';code='D2' }
  else if (R1>1  && R2 < 0.1 && R3 < 1  )   { fault='T1 — Termal < 300°C';         code='T1' }
  else if (R1>1  && R2 < 0.1 && R3>=1&&R3<=3){ fault='T2 — Termal 300-700°C';      code='T2' }
  else if (R1>1  && R2 < 0.1 && R3 > 3  )   { fault='T3 — Termal > 700°C';         code='T3' }
  return { R1:+R1.toFixed(4), R2:+R2.toFixed(4), R3:+R3.toFixed(4), fault, code }
}

// ============================================================
// 5. ANALISE DA ISOLACAO CELULÓSICA (IEC 61198 / ASTM D5837)
// Compostos furanicos como indicadores de degradacao do papel
// ============================================================
export const FURANICS_LIMITS = {
  // IEC 61198 / ASTM D5837 — 2-FAL (2-furfuraldeido) em ppb (µg/kg)
  furfural_ppb_normal:   50,    // < 50 ppb: normal
  furfural_ppb_atencao:  250,   // 50-250 ppb: monitorar
  furfural_ppb_critico:  1000,  // > 1000 ppb: degradacao severa
  furfural_ppb_critico2: 5000,  // > 5000 ppb: fim de vida da isolacao
  // Grau de Polimerizacao estimado (correlacao Emsley)
  dp_novo: 1200,     // Papel novo: DP ~ 1000-1200
  dp_bom:  800,      // DP > 800: bom
  dp_atencao: 400,   // DP 400-800: monitorar
  dp_critico: 250,   // DP < 250: substituir
}

// CO2/CO ratio (IEC 60599) — diagnostico do papel
export function diagnosePaper(co:number, co2:number, furfural_ppb:number) {
  const ratio = co > 0 ? co2 / co : 0
  let papelStatus = 'nao_avaliado'
  let papelMsg    = 'CO ou CO2 nao disponivel para avaliacao do papel'
  if (co > 0 && co2 > 0) {
    if (ratio > 10)  { papelStatus='bom';     papelMsg='CO2/CO=' + ratio.toFixed(1) + ' — papel sem degradacao termal significativa (IEC 60599)' }
    else if (ratio > 3) { papelStatus='atencao'; papelMsg='CO2/CO=' + ratio.toFixed(1) + ' — monitorar degradacao do papel (IEC 60599)' }
    else { papelStatus='critico'; papelMsg='CO2/CO=' + ratio.toFixed(1) + ' — possivel degradacao acelerada do papel. Solicitar analise de furânicos (IEC 61198)' }
  }
  let furanicsStatus = 'nao_avaliado'
  if (furfural_ppb > 0) {
    const lim = FURANICS_LIMITS
    if      (furfural_ppb < lim.furfural_ppb_normal)  furanicsStatus='normal'
    else if (furfural_ppb < lim.furfural_ppb_atencao) furanicsStatus='atencao'
    else if (furfural_ppb < lim.furfural_ppb_critico)  furanicsStatus='alto'
    else                                                furanicsStatus='critico'
  }
  return { ratio:+ratio.toFixed(2), papelStatus, papelMsg, furanicsStatus }
}

// ============================================================
// 6. QUALIDADE FÍSICO-QUÍMICA DO OLEO (NBRs Brasileiras)
//
// NBR IEC 60156:2019 — Rigidez Dielétrica
// NBR 10710:2022     — Teor de Agua (Karl Fischer)
// NBR 14248:2009     — Indice de Neutralizacao (Acidez)
// NBR 6234:2015      — Tensao Interfacial
// NBR 12133:1991     — Fator de Potencia / Dissipacao Dieletrica
// NBR 14483:2015     — Cor (escala ASTM)
// NBR 7148:2013      — Densidade
// ============================================================
export const OIL_QUALITY_LIMITS = {
  // Oleo MINERAL NOVO em servico (IEC 60296 / NBR IEC 60156)
  mineral: {
    rigidez_kv_min:     { novo:70, servico:30, critico:20 },  // kV (NBR IEC 60156:2019)
    agua_ppm_max:       { novo:10, servico:35, critico:50 },  // ppm (NBR 10710:2022 — Karl Fischer)
    acidez_mg_koh_max:  { novo:0.03, servico:0.1, critico:0.3 }, // mgKOH/g (NBR 14248:2009)
    tensao_interfacial_min: { novo:40, servico:22, critico:18 }, // mN/m (NBR 6234:2015)
    fator_potencia_max: { novo:0.1, servico:0.5, critico:2.0 }, // % a 90°C (NBR 12133:1991)
    cor_max:            { novo:0.5, servico:3.0, critico:5.0 }, // escala ASTM (NBR 14483:2015)
    densidade_max:      { min:0.820, max:0.895 },              // g/cm³ a 20°C (NBR 7148:2013)
  },
  // Oleo VEGETAL (esteres naturais) — limites distintos (IEC 62770 / NBR 16788)
  vegetal: {
    rigidez_kv_min:     { novo:50, servico:25, critico:15 },
    agua_ppm_max:       { novo:200, servico:600, critico:1000 }, // esteres toleran mais agua
    acidez_mg_koh_max:  { novo:0.06, servico:0.5, critico:1.0 },
    tensao_interfacial_min: { novo:20, servico:15, critico:10 },
    fator_potencia_max: { novo:0.5, servico:5.0, critico:10.0 },
    ponto_fulgor_min:   280, // °C — muito mais alto que mineral (seguranca incendio)
  },
}

// ============================================================
// 7. FUNCAO PRINCIPAL: SEVERIDADE INTEGRADA
// Combina IEC 60599 + IEEE C57.104 + NBRs
// ============================================================
export type SeverityLevel = 'normal' | 'medium' | 'high' | 'critical'

export type SeverityResult = {
  level: SeverityLevel
  score: number          // 0-100
  ieee_condition: 1|2|3|4
  duval_code: string
  rogers_code: string
  paper_status: string
  triggered_rules: string[]
}

export function calcSeverity(
  h2:number, ch4:number, c2h2:number, c2h4:number, c2h6:number,
  co:number, co2:number, furfural_ppm:number
): SeverityResult {
  const rules: string[] = []
  let score = 0

  // --- IEEE C57.104-2019: Condicao da maquina ---
  const lim = IEEE_C57104_LIMITS
  const TDCG = h2 + ch4 + c2h2 + c2h4 + c2h6 + co
  let ieee_condition: 1|2|3|4 = 1
  if (TDCG > lim.condition3.TDCG || h2>lim.condition3.H2 || ch4>lim.condition3.CH4 ||
      c2h2>lim.condition3.C2H2 || c2h4>lim.condition3.C2H4 || co>lim.condition3.CO) {
    ieee_condition = 4; score = Math.max(score, 95)
    rules.push('IEEE C57.104 Condicao 4 — decomposicao excessiva — risco de falha critica')
  } else if (TDCG > lim.condition2.TDCG || h2>lim.condition2.H2 || ch4>lim.condition2.CH4 ||
             c2h2>lim.condition2.C2H2 || c2h4>lim.condition2.C2H4 || co>lim.condition2.CO) {
    ieee_condition = 3; score = Math.max(score, 70)
    rules.push('IEEE C57.104 Condicao 3 — alto nivel de decomposicao — investigar imediatamente')
  } else if (TDCG > lim.condition1.TDCG || h2>lim.condition1.H2 || ch4>lim.condition1.CH4 ||
             c2h2>lim.condition1.C2H2 || c2h4>lim.condition1.C2H4 || co>lim.condition1.CO) {
    ieee_condition = 2; score = Math.max(score, 40)
    rules.push('IEEE C57.104 Condicao 2 — concentracao acima do normal — monitorar')
  }

  // --- IEC 60599:2022: Limites 90% ---
  const iec = IEC60599_90PCT_LIMITS
  if (h2  > iec.H2)   { score=Math.max(score,35); rules.push('IEC 60599: H2=' +h2 +'ppm > limite 90% ('+iec.H2+'ppm)') }
  if (ch4 > iec.CH4)  { score=Math.max(score,35); rules.push('IEC 60599: CH4='+ch4+'ppm > limite 90% ('+iec.CH4+'ppm)') }
  if (c2h2> iec.C2H2) { score=Math.max(score,60); rules.push('IEC 60599: C2H2='+c2h2+'ppm > limite 90% ('+iec.C2H2+'ppm) — ATENCAO: acetileno indica arco') }
  if (c2h4> iec.C2H4) { score=Math.max(score,40); rules.push('IEC 60599: C2H4='+c2h4+'ppm > limite 90% ('+iec.C2H4+'ppm)') }
  if (co  > iec.CO)   { score=Math.max(score,35); rules.push('IEC 60599: CO='+co+'ppm > limite 90% ('+iec.CO+'ppm) — degradacao celulósica') }

  // --- Regras especiais IEC 60599 ---
  if (c2h2 > 1 && c2h2 <= 9) { score=Math.max(score,45); rules.push('IEC 60599: C2H2 detectado ('+c2h2+'ppm) — qualquer acetileno exige investigacao') }
  if (c2h2 > 9) { score=Math.max(score,80); rules.push('IEC 60599: C2H2 alto ('+c2h2+'ppm) — forte indicativo de descarga de alta energia / arco eletrico') }
  const co_co2_ratio = co > 0 ? co2/co : 0
  if (co_co2_ratio < 3 && co > 50) { score=Math.max(score,45); rules.push('IEC 60599: CO2/CO='+co_co2_ratio.toFixed(2)+' < 3 — possivel degradacao termal do papel isolante') }

  // --- Triangulo de Duval ---
  const duval_code = duvalTriangle(ch4, c2h2, c2h4)
  if (['D1','D2'].includes(duval_code)) { score=Math.max(score,70); rules.push('Duval Triangle: '+duval_code+' — '+DUVAL_ZONES[duval_code].desc) }
  else if (duval_code === 'T3')         { score=Math.max(score,75); rules.push('Duval Triangle: T3 — sobreaquecimento termal severo > 700°C') }
  else if (duval_code === 'T2')         { score=Math.max(score,55); rules.push('Duval Triangle: T2 — sobreaquecimento termal moderado 300-700°C') }
  else if (duval_code !== 'PD' && duval_code !== 'T1') { rules.push('Duval Triangle: '+duval_code+' — '+DUVAL_ZONES[duval_code as keyof typeof DUVAL_ZONES]?.desc) }

  // --- Rogers Ratio ---
  const rogers = rogersRatio(ch4, h2, c2h2, c2h4, c2h6)
  if (rogers.code !== 'N') { rules.push('Rogers Ratio: '+rogers.code+' — '+rogers.fault+' (R1='+rogers.R1+' R2='+rogers.R2+' R3='+rogers.R3+')') }

  // --- Papel (IEC 60599 + IEC 61198 + ASTM D5837) ---
  const paper = diagnosePaper(co, co2, furfural_ppm * 1000) // converter ppm -> ppb
  if (paper.papelStatus === 'critico') { score=Math.max(score,60); rules.push(paper.papelMsg) }
  else if (paper.papelStatus === 'atencao') { rules.push(paper.papelMsg) }
  if (paper.furanicsStatus === 'critico') { score=Math.max(score,75); rules.push('ASTM D5837/IEC 61198: Furfural critico — degradacao severa da isolacao celulósica') }
  else if (paper.furanicsStatus === 'alto')  { score=Math.max(score,55); rules.push('ASTM D5837/IEC 61198: Furfural elevado — monitorar degradacao do papel') }

  // --- Determinar nivel final ---
  let level: SeverityLevel = 'normal'
  if (score >= 75)      level = 'critical'
  else if (score >= 50) level = 'high'
  else if (score >= 25) level = 'medium'

  return { level, score, ieee_condition, duval_code, rogers_code:rogers.code, paper_status:paper.papelStatus, triggered_rules:rules }
}

// ============================================================
// 8. RECOMENDAÇÃO DE INTERVALO DE COLETA
// IEEE C57.104-2019 Table 2 + IEC 60599 Section 6
// ============================================================
export function getSamplingInterval(severity: SeverityResult): string {
  const { ieee_condition, level } = severity
  if (level === 'critical' || ieee_condition === 4) return 'IMEDIATO — Retirar de servico ou amostrar diariamente. Acionar equipe tecnica.'
  if (level === 'high'     || ieee_condition === 3) return '1 a 4 semanas — Monitoramento intensivo. Reduzir carga se possivel.'
  if (level === 'medium'   || ieee_condition === 2) return '3 a 6 meses — Monitoramento reforcado. Verificar tendencia.'
  return '12 meses — Rotina normal conforme IEEE C57.104-2019.'
}

// ============================================================
// 9. AVALIACAO FÍSICO-QUÍMICA DO OLEO (NBRs Brasileiras)
// Para uso quando os parametros do laudo incluem analise do oleo
// ============================================================
export type OilQualityInput = {
  oil_type: 'Mineral' | 'Vegetal' | 'Sintetico' | 'Siliconado'
  rigidez_kv?: number          // NBR IEC 60156:2019
  agua_ppm?: number            // NBR 10710:2022
  acidez_mg_koh?: number       // NBR 14248:2009
  tensao_interfacial_mn_m?: number // NBR 6234:2015
  fator_potencia_pct?: number  // NBR 12133:1991 (a 90°C)
  cor_astm?: number            // NBR 14483:2015
  densidade?: number           // NBR 7148:2013
}

export function evalOilQuality(oil: OilQualityInput): { status: string; issues: string[] } {
  const issues: string[] = []
  const lim = OIL_QUALITY_LIMITS
  const isMineral = oil.oil_type === 'Mineral'
  const limits = isMineral ? lim.mineral : lim.vegetal

  if (oil.rigidez_kv !== undefined) {
    const norma = 'NBR IEC 60156:2019'
    if (oil.rigidez_kv < limits.rigidez_kv_min.critico) issues.push(norma+': Rigidez dieletrica CRITICA ('+oil.rigidez_kv+'kV < '+limits.rigidez_kv_min.critico+'kV) — substituicao imediata')
    else if (oil.rigidez_kv < limits.rigidez_kv_min.servico) issues.push(norma+': Rigidez dieletrica abaixo do limite ('+oil.rigidez_kv+'kV) — tratar oleo')
  }
  if (oil.agua_ppm !== undefined) {
    const norma = 'NBR 10710:2022'
    if (oil.agua_ppm > limits.agua_ppm_max.critico) issues.push(norma+': Teor de agua CRITICO ('+oil.agua_ppm+'ppm > '+limits.agua_ppm_max.critico+'ppm) — desumidificar urgente')
    else if (oil.agua_ppm > limits.agua_ppm_max.servico) issues.push(norma+': Teor de agua elevado ('+oil.agua_ppm+'ppm) — monitorar e planejar tratamento')
  }
  if (oil.acidez_mg_koh !== undefined) {
    const norma = 'NBR 14248:2009'
    if (oil.acidez_mg_koh > limits.acidez_mg_koh_max.critico) issues.push(norma+': Acidez CRITICA ('+oil.acidez_mg_koh+' mgKOH/g) — oleo degradado, substituir')
    else if (oil.acidez_mg_koh > limits.acidez_mg_koh_max.servico) issues.push(norma+': Acidez elevada ('+oil.acidez_mg_koh+' mgKOH/g) — monitorar degradacao')
  }
  if (oil.tensao_interfacial_mn_m !== undefined) {
    const norma = 'NBR 6234:2015'
    if (oil.tensao_interfacial_mn_m < limits.tensao_interfacial_min.critico) issues.push(norma+': Tensao interfacial CRITICA ('+oil.tensao_interfacial_mn_m+' mN/m) — oleo oxidado, substituir')
    else if (oil.tensao_interfacial_mn_m < limits.tensao_interfacial_min.servico) issues.push(norma+': Tensao interfacial baixa ('+oil.tensao_interfacial_mn_m+' mN/m) — inicio de oxidacao')
  }
  if (oil.fator_potencia_pct !== undefined) {
    const norma = 'NBR 12133:1991'
    if (oil.fator_potencia_pct > limits.fator_potencia_max.critico) issues.push(norma+': Fator de potencia CRITICO ('+oil.fator_potencia_pct+'%) — contaminantes ou oxidacao severa')
    else if (oil.fator_potencia_pct > limits.fator_potencia_max.servico) issues.push(norma+': Fator de potencia elevado ('+oil.fator_potencia_pct+'%) — investigar contaminacao')
  }
  if (oil.cor_astm !== undefined && 'cor_max' in limits) {
    const norma = 'NBR 14483:2015'
    if (oil.cor_astm > (limits as any).cor_max.critico) issues.push(norma+': Cor CRITICA (ASTM '+oil.cor_astm+') — oleo muito escurecido, oxidado')
    else if (oil.cor_astm > (limits as any).cor_max.servico) issues.push(norma+': Cor elevada (ASTM '+oil.cor_astm+') — oxidacao em progresso')
  }
  const status = issues.length === 0 ? 'bom' : issues.some(i => i.includes('CRITICA') || i.includes('CRITICO')) ? 'critico' : 'atencao'
  return { status, issues }
}