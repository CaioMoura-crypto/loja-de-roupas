import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getThemeStyle } from '@/lib/theme';
import type { Settings } from '@/lib/types';
import StoreLegalDetails from './StoreLegalDetails';
import styles from './StorePolicyPage.module.css';

type PolicyKey = 'privacyPolicy' | 'purchaseTerms' | 'returnsPolicy';
type Props = { settings: Settings; title: string; policy: PolicyKey };
const links = [
  { href: '/privacidade', label: 'Privacidade', key: 'privacyPolicy' },
  { href: '/termos-de-compra', label: 'Condições de compra', key: 'purchaseTerms' },
  { href: '/trocas-e-devolucoes', label: 'Trocas e devoluções', key: 'returnsPolicy' },
] as const;

export default function StorePolicyPage({ settings, title, policy }: Props) {
  const paragraphs = settings[policy].trim().split(/\n\s*\n/).filter(Boolean);
  return (
    <div className={styles.page} style={getThemeStyle(settings)}>
      <header className={styles.header}><Link href="/" className={styles.brand} aria-label={`${settings.brandName}, início`}>{settings.brandName}</Link><Link href="/checkout" className={styles.back}><ArrowLeft size={17} aria-hidden="true"/>Voltar à finalização</Link></header>
      <main className={styles.main}>
        <h1>{title}</h1>
        {settings.catalogIsDemo && <p className={styles.notice}>Modelo demonstrativo: personalize conforme a operação da loja. Este conteúdo não comprova a conformidade de uma loja real.</p>}
        <div className={styles.layout}>
          <article className={styles.content} aria-label={title}>
            {paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>Esta informação ainda não foi cadastrada pela loja. Entre em contato com o atendimento para mais informações.</p>}
          </article>
          <nav className={styles.navigation} aria-label="Informações da loja">{links.map(link => <Link key={link.key} href={link.href} aria-current={policy === link.key ? 'page' : undefined}>{link.label}</Link>)}</nav>
        </div>
        <div className={styles.seller}><StoreLegalDetails settings={settings}/></div>
      </main>
      <footer className={styles.footer}><span>{settings.brandName}</span><Link href="/colecao">Explorar a coleção</Link></footer>
    </div>
  );
}
