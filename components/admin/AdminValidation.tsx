'use client';

import { createContext } from 'react';
import type { SiteContent } from '@/lib/types';
import { mapCenterCoordinates } from '@/lib/location';
import { THEME_COLOR_GROUPS } from '@/lib/theme';
import { normalizeTaxId } from '@/lib/tax-id';

export type ValidationIssue = { tab: 'products' | 'categories' | 'appearance'; productId?: string; field: string; message: string };
export const AdminValidationContext = createContext<ValidationIssue | null>(null);

function validImage(value: string) {
  const url = value.trim();
  if (!url || (/^\/(images|api\/media)\/[a-zA-Z0-9/_.-]+$/.test(url) && !url.includes('..'))) return true;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { return false; }
}

// Client guidance mirrors editable backend constraints; the server remains authoritative.
export function firstContentIssue(content: SiteContent): ValidationIssue | null {
  const identifier = /^[a-zA-Z0-9_-]+$/;
  const color = /^#[a-f\d]{6}$/i;
  const productSlugs = new Set<string>();
  const categorySlugs = new Set<string>();
  for (const [index, product] of content.products.entries()) {
    const label = `Produto “${product.name.trim() || `sem nome (${index + 1})`}”`;
    const issue = (field: string, message: string): ValidationIssue => ({ tab: 'products', productId: product.id, field: `product.${product.id}.${field}`, message: `${label}: ${message}` });
    if (index >= 500) return issue('name', 'o catálogo permite até 500 produtos. Exclua uma peça antes de adicionar outra.');
    if (!product.name.trim() || product.name.length > 160) return issue('name', 'preencha o nome com até 160 caracteres.');
    if (!product.slug.trim() || product.slug.length > 120 || !identifier.test(product.slug.trim())) return issue('slug', 'preencha o endereço com até 120 letras, números ou hífens.');
    if (productSlugs.has(product.slug.trim())) return issue('slug', 'este endereço já pertence a outro produto. Escolha um endereço único.');
    productSlugs.add(product.slug.trim());
    if (!content.categories.some(category => category.id === product.categoryId)) return issue('categoryId', 'selecione uma categoria existente.');
    for (const [key, name, max] of [['description', 'descrição', 8000], ['details', 'detalhes', 8000], ['composition', 'composição', 2000], ['care', 'cuidados', 2000], ['badge', 'etiqueta', 60]] as const) {
      if (product[key].length > max) return issue(key, `use até ${max} caracteres em ${name}.`);
    }
    if (!Number.isSafeInteger(product.price) || product.price < 0 || product.price > 100_000_000) return issue('price', 'informe um preço de venda entre R$ 0,00 e R$ 1.000.000,00.');
    if (!Number.isSafeInteger(product.compareAtPrice) || product.compareAtPrice < 0 || product.compareAtPrice > 100_000_000) return issue('compareAtPrice', 'informe um preço anterior entre R$ 0,00 e R$ 1.000.000,00.');
    if (product.compareAtPrice > 0 && product.compareAtPrice <= product.price) return issue('compareAtPrice', 'o preço anterior precisa superar o preço de venda. Use zero para remover a promoção.');
    if (product.active && product.price === 0) return issue('price', 'adicione um preço maior que zero para publicar.');
    for (const [imageIndex, image] of product.images.entries()) {
      if (image.length > 2048 || !validImage(image)) return issue(`image.${imageIndex}`, `a imagem ${imageIndex + 1} precisa ser uma imagem enviada ou uma URL HTTPS válida.`);
    }
    if (product.active && !product.images.some(image => image.trim())) return issue(product.images.length ? 'image.0' : 'images', 'adicione uma imagem para publicar.');
    if (product.active && !product.variants.length) return issue('variants', 'adicione uma variação para publicar.');
    const combinations = new Set<string>();
    for (const [variantIndex, variant] of product.variants.entries()) {
      const prefix = `variação ${variantIndex + 1}`;
      const field = (key: string) => `variant.${variant.id}.${key}`;
      if (!variant.size.trim() || variant.size.length > 30) return issue(field('size'), `${prefix}: preencha o tamanho com até 30 caracteres.`);
      if (!variant.color.trim() || variant.color.length > 60) return issue(field('color'), `${prefix}: preencha a cor com até 60 caracteres.`);
      if (!color.test(variant.colorHex)) return issue(field('colorHex'), `${prefix}: escolha uma cor válida.`);
      if (!Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 100_000) return issue(field('stock'), `${prefix}: o estoque deve ser um número inteiro entre 0 e 100.000.`);
      const combination = `${variant.size.trim().toLowerCase()}:${variant.color.trim().toLowerCase()}`;
      if (combinations.has(combination)) return issue(field('size'), `${prefix}: esta combinação de tamanho e cor já existe. Altere ou remova a variação.`);
      combinations.add(combination);
    }
  }
  for (const [index, category] of content.categories.entries()) {
    const issue = (field: string, message: string): ValidationIssue => ({ tab: 'categories', field: `category.${category.id}.${field}`, message: `Categoria “${category.name.trim() || `sem nome (${index + 1})`}”: ${message}` });
    if (index >= 50) return issue('name', 'o catálogo permite até 50 categorias. Exclua uma categoria antes de adicionar outra.');
    if (!category.name.trim() || category.name.length > 100) return issue('name', 'preencha o nome com até 100 caracteres.');
    if (!category.slug.trim() || category.slug.length > 120 || !identifier.test(category.slug.trim())) return issue('slug', 'preencha o endereço com até 120 letras, números ou hífens.');
    if (categorySlugs.has(category.slug.trim())) return issue('slug', 'este endereço já pertence a outra categoria. Escolha um endereço único.');
    categorySlugs.add(category.slug.trim());
    if (category.description.length > 2000) return issue('description', 'use até 2.000 caracteres na descrição.');
    if (category.image.length > 2048 || !validImage(category.image)) return issue('image', 'use uma imagem enviada ou uma URL HTTPS válida.');
  }
  const settings = content.settings;
  const labels = { brandName: 'Nome da loja', tagline: 'Assinatura da marca', announcement: 'Aviso no topo', heroEyebrow: 'Texto acima do título', heroTitle: 'Título principal', heroDescription: 'Descrição principal', heroButton: 'Texto do botão', editorialTitle: 'Título do editorial', editorialText: 'Texto do editorial', footerText: 'Texto do rodapé', contactEmail: 'E-mail de contato', whatsapp: 'WhatsApp', instagram: 'Instagram', shippingNote: 'Informações de envio', returnsNote: 'Informações de trocas' } as const;
  const settingIssue = (key: string, message: string): ValidationIssue => ({ tab: 'appearance', field: `settings.${key}`, message: `Aparência e conteúdo — ${message}` });
  const themeIds = new Set(THEME_COLOR_GROUPS.map(group => group.id));
  for (const [id, value] of Object.entries(settings.themeColors ?? {})) {
    if (!themeIds.has(id) || !color.test(value)) return settingIssue(`themeColors.${id}`, 'Cores da loja: escolha uma cor com seis dígitos, como #1F2B4D, para um grupo existente.');
  }
  for (const [key, label, max] of [['legalName', 'Razão social ou nome do responsável', 240], ['taxId', 'CPF ou CNPJ', 24], ['businessAddress', 'Endereço comercial', 1000], ['privacyEmail', 'E-mail de privacidade', 254], ['privacyPolicy', 'Política de privacidade', 20000], ['purchaseTerms', 'Termos de compra', 20000], ['returnsPolicy', 'Política de trocas e devoluções', 20000]] as const) {
    if (typeof settings[key] !== 'string' || settings[key].length > max) return settingIssue(key, `${label}: use um texto de até ${max} caracteres.`);
  }
  if (normalizeTaxId(settings.taxId) === null) return settingIssue('taxId', 'CPF ou CNPJ inválido: confira o número e os dígitos verificadores.');
  if (settings.privacyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.privacyEmail.trim())) return settingIssue('privacyEmail', 'Informe um e-mail de privacidade válido.');
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    if ((['brandName', 'heroTitle', 'heroButton'].includes(key) && !settings[key].trim()) || settings[key].length > 5000) return settingIssue(key, `${labels[key]}: preencha um texto de até 5.000 caracteres.`);
  }
  for (const [key, name, max] of [['locationTitle', 'Título da localização', 120], ['locationDescription', 'Descrição da localização', 2000], ['locationAddress', 'Endereço completo', 1000], ['locationHours', 'Horário de atendimento', 1000]] as const) {
    if (typeof settings[key] !== 'string' || (key === 'locationTitle' && !settings[key].trim()) || settings[key].length > max) return settingIssue(key, `${name}: preencha um texto de até ${max} caracteres.`);
  }
  if (typeof settings.locationMapsUrl !== 'string' || settings.locationMapsUrl.length > 2048) return settingIssue('locationMapsUrl', 'Link do Google Maps: use uma URL HTTPS de até 2.048 caracteres.');
  if (settings.locationMapCenter !== undefined && (typeof settings.locationMapCenter !== 'string' || settings.locationMapCenter.length > 100 || (settings.locationMapCenter.trim() && !mapCenterCoordinates(settings.locationMapCenter)))) return settingIssue('locationMapCenter', 'Centro do mapa: informe latitude e longitude válidas, separadas por vírgula. Use ponto nos decimais.');
  if (settings.locationMapsUrl.trim()) {
    try { const url = new URL(settings.locationMapsUrl.trim()); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); }
    catch { return settingIssue('locationMapsUrl', 'Link do Google Maps: use uma URL HTTPS, sem código de incorporação.'); }
  }
  for (const [key, name] of [['heroImage', 'Imagem principal'], ['editorialImage', 'Imagem do editorial']] as const) {
    if (settings[key].length > 2048 || !validImage(settings[key])) return settingIssue(key, `${name}: use uma imagem enviada ou uma URL HTTPS válida.`);
  }
  for (const [key, name] of [['accentColor', 'Cor de destaque'], ['backgroundColor', 'Cor de fundo'], ['fabricColor', 'Cor do tecido']] as const) {
    if (!color.test(settings[key])) return settingIssue(key, `${name}: use seis dígitos, como #566044.`);
  }
  if (!Number.isFinite(settings.fabricIntensity) || settings.fabricIntensity < 0.2 || settings.fabricIntensity > 1) return settingIssue('fabricIntensity', 'Intensidade do tecido: escolha um valor entre 20% e 100%.');
  if (!['scroll', 'loop'].includes(settings.fabricMode)) return settingIssue('fabricMode', 'Modo de movimento: escolha “Ao rolar a página” ou “Contínuo”.');
  if (settings.whatsapp.trim() && !/^\d{10,15}$/.test(settings.whatsapp.trim())) return settingIssue('whatsapp', 'WhatsApp: use de 10 a 15 números, incluindo país e DDD.');
  if (settings.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail.trim())) return settingIssue('contactEmail', 'informe um e-mail de contato válido.');
  if (settings.instagram.trim()) {
    try { const url = new URL(settings.instagram.trim()); if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.username || url.password) throw new Error(); }
    catch { return settingIssue('instagram', 'Instagram: use o endereço https://www.instagram.com/seu-perfil.'); }
  }
  return null;
}
