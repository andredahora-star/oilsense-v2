import { createClient } from '@supabase/supabase-js'

// Log de erro leve, sem dependencia de servico externo (Sentry exigiria
// criar conta nova). Best-effort: se o proprio log falhar, engole o erro
// silenciosamente — nunca deixa o log quebrar o fluxo principal da rota.
export async function logError(route: string, error: any, subscription_id?: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('error_logs').insert({
      route,
      message: (error?.message || String(error)).slice(0, 2000),
      subscription_id: subscription_id || null,
    })
  } catch {
    // intencional: log nunca deve derrubar a rota principal
  }
}
