import type { Settings } from '@/lib/types';
import { getContactDetails } from '@/lib/contact';
import styles from './StoreLegalDetails.module.css';

export default function StoreLegalDetails({ settings }: { settings: Settings }) {
  const contact = getContactDetails(settings);
  const incomplete = !settings.legalName.trim() || !settings.taxId.trim() || !settings.businessAddress.trim();
  return (
    <section className={styles.legal} aria-labelledby="seller-title">
      <h2 id="seller-title">Sobre a loja</h2>
      <p className={styles.brand}>{settings.brandName}</p>
      <dl className={styles.details}>
        <div><dt>Nome empresarial / responsável</dt><dd>{settings.legalName || 'Não informado'}</dd></div>
        <div><dt>CNPJ / CPF do fornecedor</dt><dd>{settings.taxId || 'Não informado'}</dd></div>
        <div><dt>Endereço do fornecedor</dt><dd>{settings.businessAddress || 'Não informado'}</dd></div>
        <div><dt>Atendimento</dt><dd>{contact.contactEmail ? <a href={`mailto:${contact.contactEmail}`}>{contact.contactEmail}</a> : 'E-mail não informado'}{contact.formattedWhatsApp && <><br/>{contact.whatsappUrl ? <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp {contact.formattedWhatsApp}</a> : contact.formattedWhatsApp}</>}{(contact.isDemoEmail || contact.isDemoWhatsApp) && <small>Contatos ilustrativos para demonstração.</small>}</dd></div>
        <div><dt>Privacidade e dados pessoais</dt><dd>{settings.privacyEmail ? <a href={`mailto:${settings.privacyEmail}`}>{settings.privacyEmail}</a> : 'Contato não informado'}</dd></div>
      </dl>
      {incomplete && <p className={styles.note}>Cadastro demonstrativo. A identificação do fornecedor deve ser preenchida antes de publicar uma loja real.</p>}
    </section>
  );
}
