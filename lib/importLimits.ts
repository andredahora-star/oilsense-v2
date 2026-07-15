import { createClient } from '@supabase/supabase-js'

// Limites de importacao — protecao contra custo inesperado ou abuso
// (relevante apos o susto de credito da Anthropic zerado).
export const IMPORT_LIMITS = {
  max_pdf_bytes: 10 * 1024 * 1024,      // 10MB decodificado — generoso para laudo de laboratorio
  max_imports_per_window: 30,            // por empresa
  window_minutes: 5,
}

export function checkPdfSize(pdf_base64: string): string | null {
  // base64 expande ~33% o tamanho original; estimamos o tamanho decodificado
  const approxBytes = pdf_base64.length * 0.75
  if (approxBytes > IMPORT_LIMITS.max_pdf_bytes) {
    const mb = (approxBytes / (1024 * 1024)).toFixed(1)
    return `Arquivo muito grande (~${mb}MB). Limite: ${IMPORT_LIMITS.max_pdf_bytes / (1024 * 1024)}MB.`
  }
  return null
}

// Rate limit baseado em contagem no banco (sem estado em memoria — serverless
// nao garante persistencia entre invocacoes). Conta quantas analises essa
// empresa criou nos ultimos N minutos, nas duas tabelas (transformador +
// redutor), e bloqueia se passar do limite.
export async function checkImportRateLimit(subscription_id: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const since = new Date(Date.now() - IMPORT_LIMITS.window_minutes * 60 * 1000).toISOString()

  const [lab, lube] = await Promise.all([
    supabase.from('lab_analyses').select('id', { count: 'exact', head: true }).eq('subscription_id', subscription_id).gte('created_at', since),
    supabase.from('lube_analyses').select('id', { count: 'exact', head: true }).eq('subscription_id', subscription_id).gte('created_at', since),
  ])
  const total = (lab.count || 0) + (lube.count || 0)
  if (total >= IMPORT_LIMITS.max_imports_per_window) {
    return `Limite de ${IMPORT_LIMITS.max_imports_per_window} importações em ${IMPORT_LIMITS.window_minutes} minutos atingido. Aguarde um pouco e tente novamente.`
  }
  return null
}
