import type { Settings } from './types';

export const DEMO_WHATSAPP = '5571000000000';
export const DEMO_CONTACT_EMAIL = 'contato@criativa.example';

type ContactSettings = Pick<Settings, 'whatsapp' | 'contactEmail'>;

export function getWhatsAppUrl(phone: string, message: string): string | null {
  if (!/^\+?[\d\s().-]+$/.test(phone.trim())) return null;
  const number = phone.replace(/\D/g, '');
  if (!/^[1-9]\d{9,14}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function formatPhone(number: string): string {
  if (/^55\d{11}$/.test(number)) return number.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (/^55\d{10}$/.test(number)) return number.replace(/^55(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return number ? `+${number}` : '';
}

export function getContactDetails(settings: ContactSettings) {
  const whatsapp = settings.whatsapp.replace(/\D/g, '');
  const contactEmail = settings.contactEmail.trim();
  const message = 'Olá! Gostaria de saber mais sobre as peças da loja.';
  return {
    whatsapp,
    formattedWhatsApp: formatPhone(whatsapp),
    whatsappUrl: getWhatsAppUrl(settings.whatsapp, message),
    contactEmail,
    isDemoWhatsApp: whatsapp === DEMO_WHATSAPP,
    isDemoEmail: contactEmail.toLowerCase().endsWith('.example'),
  };
}
