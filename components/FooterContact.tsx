import type { ReactNode } from 'react';
import { Mail } from 'lucide-react';
import type { Settings } from '@/lib/types';
import { getContactDetails } from '@/lib/contact';
import WhatsAppIcon from './WhatsAppIcon';
import styles from './FooterContact.module.css';

type Props = {
  settings: Pick<Settings, 'whatsapp' | 'contactEmail' | 'catalogIsDemo'>;
  children?: ReactNode;
};

export default function FooterContact({ settings, children }: Props) {
  const contact = getContactDetails(settings);
  if (!contact.whatsapp && !contact.contactEmail && !children) return null;
  return (
    <div className={`footer-column ${styles.contact}`}>
      <h2>Contato</h2>
      {contact.whatsappUrl && <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp: ${contact.formattedWhatsApp}${contact.isDemoWhatsApp ? ', número ilustrativo' : ''}`}><WhatsAppIcon width={19} height={19}/><span>{contact.formattedWhatsApp}</span></a>}
      {contact.contactEmail && <a href={`mailto:${contact.contactEmail}`}><Mail size={18} aria-hidden="true"/><span>{contact.contactEmail}</span></a>}
      {children}
      {(contact.isDemoWhatsApp || contact.isDemoEmail) && <p className={styles.demo}>Contatos ilustrativos para demonstração.</p>}
    </div>
  );
}
