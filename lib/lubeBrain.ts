/**
 * LUBE BRAIN — Motor de Avaliação de Óleo Lubrificante (Redutores)
 *
 * Diferente do óleo isolante de transformadores, NÃO existe uma norma única
 * (tipo IEC 60599) que publique limites absolutos universais para óleo
 * lubrificante — cada fabricante de redutor especifica sua própria faixa
 * aceitável, e boa parte da prática de tribologia industrial usa faixas de
 * referência consolidadas no mercado (ex: SKF, Noria/Machinery Lubrication),
 * não uma tabela regulatória fixa.
 *
 * Por isso este motor é explícito sobre a natureza de cada limite:
 * - Faixas com base em norma real (ex: tolerância ISO VG) são citadas como tal.
 * - Faixas de referência de mercado são marcadas como "referência da indústria",
 *   recomendando validação contra a especificação do fabricante do redutor.
 * - Metais de desgaste NÃO usam limite absoluto — usam TENDÊNCIA (variação
 *   entre amostras consecutivas), que é a prática correta reconhecida no setor,
 *   já que desgaste normal varia muito por tamanho/volume de óleo/horas de uso.
 *
 * Normas referenciadas:
 * ASTM D445    — Viscosidade cinemática
 * ASTM D664/D974 — TAN (Número de Acidez Total)
 * ASTM D6304   — Teor de água (Karl Fischer)
 * ISO 4406:1999 — Contagem de partículas / código de limpeza
 * ASTM D5185   — Espectrometria de metais (desgaste + aditivos + contaminação)
 * ANSI/AGMA 9005-F16 — Diretrizes de lubrificação de engrenagens
 * DIN 51517-3  — Óleos de extrema pressão para redutores
 */

export type LubeQualityInput = {
  iso_vg?: number              // grau de viscosidade ISO VG do óleo especificado (ex: 220, 320, 460)
  viscosidade_40?: number      // cSt medido a 40°C
  tan_mg_koh?: number          // mgKOH/g
  agua_ppm?: number
  iso_4406_grande?: number     // código ISO 4406 - partículas >=14um (o 3º número, ex: 13 em "18/16/13")
  iso_4406_target?: number     // código-alvo especificado (referência, ex: 13 para meta 18/16/13)
  fe_ppm?: number              // ferro (desgaste geral)
  cu_ppm?: number              // cobre (desgaste de bronze/bucha)
  cr_ppm?: number              // cromo (desgaste de rolamento)
  si_ppm?: number              // silício (contaminação por poeira/areia)
}

// Faixas de referência de mercado (tribologia industrial) — NÃO são norma
// regulatória fixa, recomenda-se validar contra a especificação do
// fabricante do redutor.
export const LUBE_REFERENCE_RANGES = {
  viscosidade_desvio_pct_atencao: 10,  // ISO VG tem tolerancia real de +/-10% (ISO 3448)
  viscosidade_desvio_pct_critico: 15,
  tan_atencao_mg_koh: 0.3,             // aumento acima do TAN do óleo novo — referência de mercado
  tan_critico_mg_koh: 1.0,
  agua_ppm_atencao: 200,               // referência de mercado para óleo de engrenagem industrial
  agua_ppm_critico: 500,
  wear_trend_pct_atencao: 50,          // variação percentual entre amostras consecutivas
  wear_trend_pct_critico: 100,
}

export function evalLubeQuality(input: LubeQualityInput, prev?: LubeQualityInput): { status: 'bom'|'atencao'|'critico'; issues: string[] } {
  const issues: string[] = []
  let status: 'bom'|'atencao'|'critico' = 'bom'
  const R = LUBE_REFERENCE_RANGES

  function bump(next: 'atencao'|'critico') {
    if (next === 'critico' || status === 'bom') status = next
  }

  // Viscosidade — desvio do grau ISO VG especificado
  if (input.viscosidade_40 != null && input.iso_vg) {
    const desvioPct = Math.abs(input.viscosidade_40 - input.iso_vg) / input.iso_vg * 100
    if (desvioPct >= R.viscosidade_desvio_pct_critico) {
      bump('critico'); issues.push(`Viscosidade fora da faixa ISO VG (desvio ${desvioPct.toFixed(1)}%, ASTM D445) — risco de lubrificação inadequada`)
    } else if (desvioPct >= R.viscosidade_desvio_pct_atencao) {
      bump('atencao'); issues.push(`Viscosidade se afastando do grau ISO VG especificado (desvio ${desvioPct.toFixed(1)}%, ASTM D445)`)
    }
  }

  // TAN — acidez / oxidação
  if (input.tan_mg_koh != null) {
    if (input.tan_mg_koh >= R.tan_critico_mg_koh) {
      bump('critico'); issues.push(`TAN=${input.tan_mg_koh}mgKOH/g (ASTM D664) — oxidação avançada, óleo próximo do fim de vida útil [referência de mercado]`)
    } else if (input.tan_mg_koh >= R.tan_atencao_mg_koh) {
      bump('atencao'); issues.push(`TAN=${input.tan_mg_koh}mgKOH/g (ASTM D664) — oxidação iniciando, monitorar [referência de mercado]`)
    }
  }

  // Água
  if (input.agua_ppm != null) {
    if (input.agua_ppm >= R.agua_ppm_critico) {
      bump('critico'); issues.push(`Água=${input.agua_ppm}ppm (ASTM D6304) — risco de corrosão e falha de aditivos [referência de mercado]`)
    } else if (input.agua_ppm >= R.agua_ppm_atencao) {
      bump('atencao'); issues.push(`Água=${input.agua_ppm}ppm (ASTM D6304) — acima do ideal, investigar fonte de contaminação [referência de mercado]`)
    }
  }

  // ISO 4406 — limpeza vs meta
  if (input.iso_4406_grande != null && input.iso_4406_target != null) {
    const diff = input.iso_4406_grande - input.iso_4406_target
    if (diff >= 4) { bump('critico'); issues.push(`ISO 4406: código de limpeza ${diff} pontos acima da meta — contaminação sólida significativa`) }
    else if (diff >= 2) { bump('atencao'); issues.push(`ISO 4406: código de limpeza ${diff} pontos acima da meta — monitorar filtragem`) }
  }

  // Metais de desgaste — TENDENCIA, nao valor absoluto
  if (prev) {
    const wearChecks: [string, keyof LubeQualityInput, string][] = [
      ['fe_ppm', 'fe_ppm', 'Ferro'], ['cu_ppm', 'cu_ppm', 'Cobre'], ['cr_ppm', 'cr_ppm', 'Cromo'],
    ] as any
    for (const [key, , label] of wearChecks) {
      const cur = (input as any)[key], prv = (prev as any)[key]
      if (cur != null && prv != null && prv > 0) {
        const varPct = (cur - prv) / prv * 100
        if (varPct >= R.wear_trend_pct_critico) {
          bump('critico'); issues.push(`${label}: subiu ${varPct.toFixed(0)}% desde a última análise (${prv}→${cur}ppm, ASTM D5185) — taxa de desgaste elevada`)
        } else if (varPct >= R.wear_trend_pct_atencao) {
          bump('atencao'); issues.push(`${label}: subiu ${varPct.toFixed(0)}% desde a última análise (${prv}→${cur}ppm, ASTM D5185) — monitorar tendência`)
        }
      }
    }
  }

  // Silicio — contaminacao externa (poeira/areia), sempre relevante mesmo sem historico
  if (input.si_ppm != null && input.si_ppm > 20) {
    bump(input.si_ppm > 40 ? 'critico' : 'atencao')
    issues.push(`Silício=${input.si_ppm}ppm (ASTM D5185) — indício de contaminação externa por poeira/areia, verificar vedações e respiro`)
  }

  return { status, issues }
}
