import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Termos de Uso — OilSense' }

function S({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>{n}. {title}</h2>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{children}</div>
    </section>
  )
}

export default function TermosPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Image src="/logo.png" alt="OilSense" width={32} height={32} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>OilSense</span>
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', margin: '20px 0 4px' }}>Termos de Uso</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Última atualização: 14/07/2026. Revisão jurídica realizada em 14/07/2026.
        </p>

        <div style={{ background: 'rgba(251, 191, 36, .08)', border: '1px solid rgba(251, 191, 36, .25)', borderRadius: '8px', padding: '14px 16px', marginBottom: '32px', fontSize: '13px', color: '#d97706' }}>
          Revisão jurídica realizada em 14/07/2026. Único item ainda pendente: a cláusula 5 (planos e cobrança), a ser detalhada quando o modelo de cobrança for implementado.
        </div>

        <S n="1" title="Aceitação dos termos">
          Ao criar uma conta ou utilizar a plataforma OilSense ("Plataforma"), você concorda com estes Termos de Uso e com a nossa <Link href="/privacidade" style={{ color: 'var(--green)' }}>Política de Privacidade</Link>. Se você está aceitando estes termos em nome de uma empresa, declara ter poderes para vinculá-la a este contrato.
        </S>

        <S n="2" title="Descrição do serviço">
          A OilSense é uma plataforma de software como serviço (SaaS) para gestão preditiva de ativos elétricos (transformadores de potência), oferecendo importação e organização de laudos de análise de óleo isolante, diagnóstico assistido por inteligência artificial com base em normas técnicas nacionais e internacionais (IEC, IEEE, ASTM, NBR), geração de alertas e ordens de serviço.
        </S>

        <S n="3" title="Natureza do diagnóstico — leitura obrigatória">
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>
            Os diagnósticos, health scores e alertas gerados pela Plataforma são ferramentas de apoio à decisão técnica, baseadas na interpretação automatizada dos dados fornecidos pelo usuário. Eles NÃO substituem a avaliação de um engenheiro qualificado, a inspeção física do equipamento, nem qualquer obrigação normativa ou regulatória aplicável ao ativo elétrico do cliente. A decisão final sobre manutenção, reparo, substituição ou continuidade de operação de qualquer equipamento é de exclusiva responsabilidade do cliente e de seus profissionais técnicos responsáveis.
          </p>
        </S>

        <S n="4" title="Cadastro e conta">
          Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado. As informações fornecidas no cadastro devem ser verdadeiras e mantidas atualizadas.
        </S>

        <S n="5" title="Planos, cobrança e cancelamento">
          [A ser detalhado quando o modelo de cobrança for implementado: valores, periodicidade, formas de pagamento, política de reembolso, e condições de suspensão por inadimplência.] Reservamo-nos o direito de alterar os planos e valores mediante aviso prévio razoável aos clientes ativos.
        </S>

        <S n="6" title="Uso aceitável">
          <p style={{ margin: '0 0 10px' }}>Você concorda em não:</p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Utilizar a Plataforma para fins ilegais ou não autorizados;</li>
            <li>Tentar acessar dados de outros clientes ou contornar mecanismos de segurança e isolamento de dados;</li>
            <li>Realizar engenharia reversa, copiar ou revender a Plataforma sem autorização;</li>
            <li>Sobrecarregar deliberadamente a infraestrutura (ex: ataques de negação de serviço, scraping automatizado não autorizado).</li>
          </ul>
        </S>

        <S n="7" title="Propriedade intelectual">
          A Plataforma, seu código, marca, layout e o motor de diagnóstico são de propriedade da OilSense. Os dados que você insere na Plataforma (laudos, informações de ativos) permanecem de sua propriedade; concedemos a nós mesmos apenas a licença necessária para processá-los e prestar o serviço contratado.
        </S>

        <S n="8" title="Limitação de responsabilidade">
          Na máxima extensão permitida pela lei, a OilSense não se responsabiliza por danos indiretos, lucros cessantes, ou falhas de equipamento decorrentes de decisões tomadas com base nos diagnósticos da Plataforma, ressalvados os casos de dolo ou culpa grave comprovada. A responsabilidade total da OilSense, quando aplicável, está limitada ao valor pago pelo cliente nos últimos 12 (doze) meses.
        </S>

        <S n="9" title="Disponibilidade do serviço">
          Envidamos esforços para manter a Plataforma disponível de forma contínua, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência razoável quando possível.
        </S>

        <S n="10" title="Rescisão">
          Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar contas que violem estes Termos, mediante notificação prévia, exceto em casos de violação grave que exijam ação imediata.
        </S>

        <S n="11" title="Alterações destes termos">
          Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por e-mail ou aviso na Plataforma, com antecedência razoável antes de entrarem em vigor.
        </S>

        <S n="12" title="Lei aplicável e foro">
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Natal/RN (1ª Comarca — TJRN) para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.
        </S>

        <S n="13" title="Contato">
          Dúvidas sobre estes Termos podem ser enviadas para <strong>comercial@oilssense.com</strong>.
        </S>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <Link href="/privacidade" style={{ color: 'var(--green)', fontSize: '13px', fontWeight: 600, marginRight: '20px' }}>Ver Política de Privacidade</Link>
          <Link href="/signup" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Voltar ao cadastro</Link>
        </div>
      </div>
    </div>
  )
}
