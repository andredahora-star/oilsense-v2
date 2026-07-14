import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Política de Privacidade — OilSense' }

function S({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>{n}. {title}</h2>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{children}</div>
    </section>
  )
}

export default function PrivacidadePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Image src="/logo.png" alt="OilSense" width={32} height={32} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>OilSense</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', margin: '20px 0 4px' }}>Política de Privacidade</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Última atualização: [DATA]. Documento em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>

        <div style={{ background: 'rgba(251, 191, 36, .08)', border: '1px solid rgba(251, 191, 36, .25)', borderRadius: '8px', padding: '14px 16px', marginBottom: '32px', fontSize: '13px', color: '#d97706' }}>
          Rascunho gerado para uso interno da OilSense. Revisar com um advogado antes de publicar como versão final, e preencher os campos entre colchetes com os dados reais da empresa.
        </div>

        <S n="1" title="Quem somos (controlador dos dados)">
          A OilSense ([RAZÃO SOCIAL], CNPJ [CNPJ], sediada em [ENDEREÇO]) é a controladora dos dados pessoais tratados através da plataforma OilSense (app.oilssense.com e v2.oilssense.com), nos termos da LGPD.
          Para qualquer assunto relacionado a esta política, entre em contato pelo e-mail <strong>comercial@oilssense.com</strong>.
        </S>

        <S n="2" title="Quais dados coletamos">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Dados de cadastro: nome completo, e-mail, nome da empresa, senha (armazenada de forma criptografada).</li>
            <li>Dados de uso da plataforma: transformadores cadastrados, laudos de análise de óleo importados, diagnósticos gerados, ordens de serviço, alertas, histórico de interações com o assistente DUVAL IA.</li>
            <li>Dados técnicos de acesso: endereço IP, tipo de navegador, data e hora de acesso, registros de erro (logs).</li>
            <li>Dados de cobrança, quando aplicável a um plano pago (nome, CNPJ/CPF, dados de faturamento — não armazenamos dados completos de cartão de crédito, que são processados diretamente pelo provedor de pagamento).</li>
          </ul>
        </S>

        <S n="3" title="Para que usamos seus dados (finalidade e base legal)">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>Execução do contrato/prestação do serviço</strong>: criar e manter sua conta, processar laudos, gerar diagnósticos, emitir alertas e ordens de serviço.</li>
            <li><strong>Comunicação</strong>: enviar e-mails transacionais (confirmação de cadastro, recuperação de senha, alertas críticos) e, quando autorizado, comunicações comerciais.</li>
            <li><strong>Cumprimento de obrigação legal/regulatória</strong>: emissão de nota fiscal e obrigações fiscais, quando houver cobrança.</li>
            <li><strong>Legítimo interesse</strong>: melhoria do produto, prevenção a fraudes e uso indevido, segurança da plataforma.</li>
          </ul>
        </S>

        <S n="4" title="Com quem compartilhamos seus dados (operadores)">
          <p style={{ margin: '0 0 10px' }}>Utilizamos os seguintes fornecedores (operadores de dados, nos termos da LGPD) para operar a plataforma:</p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>Supabase</strong> — banco de dados e autenticação. Pode envolver processamento em servidores fora do Brasil, com salvaguardas contratuais do próprio fornecedor.</li>
            <li><strong>Resend</strong> — envio de e-mails transacionais (confirmação de conta, recuperação de senha, alertas).</li>
            <li><strong>Anthropic (Claude API)</strong> — processamento de inteligência artificial para extração de dados de laudos em PDF e geração de diagnósticos. Os documentos enviados para análise podem ser processados em servidores fora do Brasil.</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
          </ul>
          <p style={{ margin: '10px 0 0' }}>Não vendemos seus dados pessoais a terceiros. O compartilhamento se limita ao necessário para a prestação do serviço.</p>
        </S>

        <S n="5" title="Por quanto tempo guardamos seus dados">
          Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo adicional necessário para cumprir obrigações legais, fiscais ou regulatórias, ou para o exercício regular de direitos em processos administrativos ou judiciais. Após esse período, os dados são eliminados ou anonimizados.
        </S>

        <S n="6" title="Seus direitos como titular de dados">
          <p style={{ margin: '0 0 10px' }}>Nos termos do artigo 18 da LGPD, você pode solicitar a qualquer momento:</p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Confirmação da existência de tratamento de dados;</li>
            <li>Acesso aos seus dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
            <li>Eliminação dos dados tratados com base em consentimento;</li>
            <li>Informação sobre entidades com as quais compartilhamos seus dados;</li>
            <li>Revogação do consentimento, quando aplicável.</li>
          </ul>
          <p style={{ margin: '10px 0 0' }}>Solicitações podem ser feitas pelo e-mail <strong>comercial@oilssense.com</strong>. Responderemos em prazo razoável, conforme a LGPD.</p>
        </S>

        <S n="7" title="Segurança dos dados">
          Adotamos medidas técnicas para proteger seus dados, incluindo criptografia em trânsito (HTTPS), controle de acesso por usuário autenticado, isolamento de dados entre clientes (cada empresa só acessa seus próprios dados) e políticas de segurança em nível de banco de dados (Row Level Security). Apesar dos esforços, nenhum sistema é completamente livre de risco, e nos comprometemos a notificar autoridades e titulares em caso de incidente de segurança relevante, conforme exigido pela LGPD.
        </S>

        <S n="8" title="Cookies">
          A plataforma utiliza cookies e tecnologias similares essenciais ao funcionamento (ex: manter sua sessão autenticada). [Complementar caso sejam adicionadas ferramentas de analytics/marketing no futuro.]
        </S>

        <S n="9" title="Alterações desta política">
          Podemos atualizar esta política periodicamente. Alterações relevantes serão comunicadas por e-mail ou aviso na plataforma. A data da última atualização está indicada no topo deste documento.
        </S>

        <S n="10" title="Contato">
          Dúvidas, solicitações ou reclamações sobre o tratamento de dados pessoais podem ser enviadas para <strong>comercial@oilssense.com</strong>. [Se houver Encarregado de Proteção de Dados (DPO) formalmente designado, incluir nome/contato aqui.]
        </S>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <Link href="/termos" style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 600, marginRight: '20px' }}>Ver Termos de Uso</Link>
          <Link href="/signup" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Voltar ao cadastro</Link>
        </div>
      </div>
    </div>
  )
}
