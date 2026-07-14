// Base de conhecimento normativo do Agente DUVAL.
// Injetado no contexto do Claude nas rotas /api/diagnose e /api/duval-chat.
// Cromatografia gasosa (DGA) + análise físico-química do óleo isolante — normas ABNT NBR / IEC / IEEE.

export const DUVAL_KNOWLEDGE = `
=== CONHECIMENTO NORMATIVO — CROMATOGRAFIA GASOSA (DGA) ===

NBR 7070:2006 — Amostragem e análise cromatográfica de gases dissolvidos em óleo mineral isolante.
Define coleta em seringa de vidro (sem contato com ar), extração e quantificação por cromatografia gasosa dos gases: H2, CH4, C2H2, C2H4, C2H6, CO, CO2 (e O2/N2). É a norma-base brasileira para o PROCEDIMENTO de coleta/extração do laudo DGA — não define limites de interpretação (isso é papel de outra norma).

NBR 7274 — Interpretação da análise de gases de transformadores em serviço (norma brasileira de interpretação, equivalente conceitual da IEC 60599 no Brasil).
IMPORTANTE: a versão NBR 7274:2012 foi CANCELADA pela ABNT. Existe versão vigente com escopo atualizado, mas seu texto e tabela numérica completa não puderam ser verificados (norma paga, sem republicação livre confiável). Historicamente a NBR 7274 foi construída como adaptação brasileira do método de razões de gases do IEC/IEEE (mesmas 3 razões do método de Rogers: CH4/H2, C2H2/C2H4, C2H4/C2H6). Por isso, os resultados do IEC 60599 e Rogers Ratio abaixo são estruturalmente equivalentes à abordagem da NBR 7274, mas os limiares numéricos exatos da versão vigente da norma NÃO foram confirmados byte a byte. Se o usuário pedir conformidade estrita com a NBR 7274 vigente, informe essa limitação com transparência e não invente valores — sugira que ele forneça o texto oficial da norma para validação.

IEC 60599:2022 — Interpretação da análise de gases dissolvidos (norma internacional principal).
- Limites típicos 90% (óleo mineral, transformador em serviço): H2 ≤ 150 ppm; CH4 ≤ 130 ppm; C2H2 ≤ 3 ppm (QUALQUER valor > 1 ppm exige investigação — acetileno só se forma em arco/alta energia ou > 700°C); C2H4 ≤ 280 ppm; C2H6 ≤ 90 ppm; CO ≤ 600 ppm.
- Gás-chave × falha: H2 alto isolado → descargas parciais (corona); CH4+C2H6 → falha térmica baixa (< 300°C); C2H4 alto → falha térmica alta (> 300°C, T2/T3); C2H2 → descarga elétrica de alta energia (arco, D1/D2); CO e CO2 → degradação da celulose (papel).
- Relação CO2/CO: > 10 papel sem degradação térmica significativa; 3–10 monitorar; < 3 (com CO relevante) possível degradação acelerada do papel.

Triângulo de Duval (IEC 60599): zonas PD (descarga parcial), D1 (descarga baixa energia), D2 (arco de alta energia), DT (misto térmico+elétrico), T1 (<300°C), T2 (300–700°C), T3 (>700°C). Usa proporções relativas de CH4, C2H2, C2H4.
Razões de Rogers (IEEE C57.104 Anexo): R1=CH4/H2, R2=C2H2/C2H4, R3=C2H4/C2H6 — combinações classificam o tipo de falha (PD, D1, D2, T1, T2, T3).

IEEE C57.104-2019 — Condições 1 a 4 pelo TDCG (soma de gases combustíveis):
- Condição 1: operação normal, coleta anual. Condição 2: acima do normal, investigar, 3–6 meses. Condição 3: alto nível, investigar imediatamente, 1–4 semanas. Condição 4: decomposição excessiva, risco de falha, retirar de serviço/operar com extremo cuidado.

Papel isolante (celulose): IEC 61198 / ASTM D5837 — 2-furfuraldeído (2-FAL) em ppb: < 50 normal; 50–250 monitorar; 250–1000 elevado; > 1000 degradação severa; > 5000 fim de vida. Correlação de Emsley estima o Grau de Polimerização (DP): DP > 800 bom; 400–800 monitorar; < 250 substituir isolação.

=== CONHECIMENTO NORMATIVO — FÍSICO-QUÍMICA DO ÓLEO ISOLANTE ===
(Limites para óleo MINERAL — novo / em serviço / crítico)

NBR IEC 60156:2019 — Rigidez dielétrica (tensão de ruptura, kV): novo ≥ 70; serviço ≥ 30; < 20 crítico (substituição/tratamento imediato). Queda indica umidade e/ou partículas.
NBR 10710:2022 — Teor de água (Karl Fischer, ppm): novo ≤ 10; serviço ≤ 35; > 50 crítico. Água reduz rigidez e acelera degradação do papel (a água migra do óleo para a celulose).
NBR 14248:2009 — Índice de neutralização / acidez (mg KOH/g): novo ≤ 0,03; serviço ≤ 0,10; > 0,30 crítico. Acidez crescente = oxidação do óleo; forma borra (sludge) e ataca a celulose.
NBR 6234:2015 — Tensão interfacial — IFT (mN/m): novo ≥ 40; atenção < 22; < 18 crítico. IFT em queda com acidez em alta é assinatura clássica de envelhecimento/oxidação.
NBR 12133:1991 — Fator de potência / dissipação dielétrica (tan δ, % a 90°C): novo ≤ 0,1; serviço ≤ 0,5; > 2,0 crítico. Sobe com contaminação polar (água, produtos de oxidação).
NBR 14483:2015 — Cor (escala ASTM): novo ≤ 0,5; serviço ≤ 3,0; > 5,0 crítico. Escurecimento indica oxidação/contaminação.
NBR 7148:2013 — Densidade relativa a 20°C (g/cm³): faixa típica 0,820–0,895.

Óleo VEGETAL (ésteres naturais — IEC 62770 / NBR 16788): tolera muito mais água (serviço até ~600 ppm), ponto de fulgor > 280°C; limites de rigidez e IFT distintos do mineral. NUNCA aplicar os limites do mineral a óleo vegetal/éster.

=== CORRELAÇÕES DE DIAGNÓSTICO ===
- IFT baixa + acidez alta + cor escura → óleo oxidado/envelhecido → regenerar ou substituir.
- Água alta + rigidez baixa → contaminação por umidade → desumidificar/termovácuo; verificar vedações e sílica-gel.
- Gases de falha (Duval D1/D2/T3) + degradação do papel (CO2/CO baixo, furânicos altos) → falha ativa envolvendo isolação sólida → prioridade máxima.
- Sempre citar a norma aplicada em cada afirmação e distinguir "óleo" (físico-química) de "gases" (DGA/celulose).
- Ao citar NBR 7274, sempre mencionar que é metodologicamente equivalente ao método de razões IEC/IEEE implementado, sem afirmar conformidade numérica exata com o texto vigente da norma (não verificado).
`.trim()
