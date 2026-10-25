'use client';

import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';
import { getContactDetails } from '@/lib/contact';
import WhatsAppIcon from './WhatsAppIcon';
import styles from './FloatingWhatsApp.module.css';

type Props = {
  settings: Pick<Settings, 'whatsapp' | 'contactEmail'>;
  suspended?: boolean;
};

export default function FloatingWhatsApp({ settings, suspended = false }: Props) {
  const contact = getContactDetails(settings);
  // Stay hidden until the viewport is known, including direct visits to #informacoes.
  const [footerVisible, setFooterVisible] = useState(true);

  useEffect(() => {
    const footer = document.getElementById('informacoes');
    if (!footer) { setFooterVisible(false); return; }
    const updateFromBounds = () => {
      const bounds = footer.getBoundingClientRect();
      setFooterVisible(bounds.top <= window.innerHeight && bounds.bottom >= 0);
    };
    updateFromBounds();
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0 });
      observer.observe(footer);
      return () => observer.disconnect();
    }
    window.addEventListener('scroll', updateFromBounds, { passive: true });
    window.addEventListener('resize', updateFromBounds);
    return () => {
      window.removeEventListener('scroll', updateFromBounds);
      window.removeEventListener('resize', updateFromBounds);
    };
  }, []);

  if (!contact.whatsappUrl) return null;
  const hidden = suspended || footerVisible;
  return (
    <div className={styles.floating} data-visible={!hidden} aria-hidden={hidden} inert={hidden}>
      <a className={styles.button} href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined} aria-label={`Conversar no WhatsApp${contact.isDemoWhatsApp ? ' — contato de demonstração' : ''}`} title={contact.isDemoWhatsApp ? `WhatsApp de demonstração: ${contact.formattedWhatsApp}` : 'Conversar no WhatsApp'}>
        <WhatsAppIcon width={27} height={27}/>
      </a>
    </div>
  );
}
