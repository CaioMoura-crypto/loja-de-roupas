import type { SiteContent, Category, Product, Settings, Variant } from './types';
import { mapCenterCoordinates } from './location';
import { HttpError } from './http';
import { THEME_COLOR_GROUPS } from './theme';
import { normalizeTaxId } from './tax-id';
type RecordValue = Record<string, unknown>;
export function object(value: unknown, label = 'Conteúdo'): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, `${label} inválido.`);
  return value as RecordValue;
}
export function text(value: unknown, label: string, max = 2000, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new HttpError(400, `${label}: preencha um texto válido (até ${max} caracteres).`);
  return value.trim();
}
function bool(value: unknown, label: string) { if (typeof value !== 'boolean') throw new HttpError(400, `${label} inválido.`); return value; }
export function integer(value: unknown, label: string, min = 0, max = 100_000_000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `${label} inválido.`);
  return value;
}
function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, `${label}: máximo de ${max} itens.`);
  return value;
}
function identifier(value: unknown, label: string) {
  const id = text(value, label, 120, true);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new HttpError(400, `${label}: use apenas letras, números e hífens.`);
  return id;
}
export function imageUrl(value: unknown, label: string) {
  const url = text(value, label, 2048);
  if (!url) return '';
  if (/^\/(images|api\/media)\/[a-zA-Z0-9/_.-]+$/.test(url) && !url.includes('..')) return url;
  try { const u = new URL(url); if (u.protocol === 'https:' && !u.username && !u.password) return u.href; } catch {}
  throw new HttpError(400, `${label}: use uma imagem enviada ou uma URL HTTPS.`);
}
function hex(value: unknown, label: string) {
  const color = text(value, label, 7, true);
  if (!/^#[a-f\d]{6}$/i.test(color)) throw new HttpError(400, `${label}: use cor hexadecimal com 6 dígitos.`);
  return color;
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new HttpError(400, `${label} duplicados.`);
}
export function validateContent(value: unknown): SiteContent {
  const root = object(value);
  const s = object(root.settings, 'Configurações');
  const stringFields = ['brandName', 'tagline', 'announcement', 'heroEyebrow', 'heroTitle', 'heroDescription', 'heroButton', 'editorialTitle', 'editorialText', 'footerText', 'contactEmail', 'whatsapp', 'instagram', 'shippingNote', 'returnsNote'] as const;
  const settings = Object.fromEntries(stringFields.map(k => [k, text(s[k], k, 5000, ['brandName', 'heroTitle', 'heroButton'].includes(k))])) as unknown as Settings;
  settings.heroImage = imageUrl(s.heroImage, 'Imagem principal');
  settings.editorialImage = imageUrl(s.editorialImage, 'Imagem editorial');
  settings.accentColor = hex(s.accentColor, 'Cor de destaque');
  settings.backgroundColor = hex(s.backgroundColor, 'Cor de fundo');
  const themeInput = s.themeColors === undefined ? {} : object(s.themeColors, 'Cores da loja');
  const themeIds = new Set<string>(THEME_COLOR_GROUPS.map(group => group.id));
  settings.themeColors = {};
  for (const [id, value] of Object.entries(themeInput)) {
    if (!themeIds.has(id)) throw new HttpError(400, 'Cores da loja: selecione um grupo de cor existente.');
    settings.themeColors[id] = hex(value, `Cor do grupo #${id}`).toLowerCase();
  }
  settings.legalName = text(s.legalName === undefined ? '' : s.legalName, 'Razão social ou nome do responsável', 240);
  settings.businessAddress = text(s.businessAddress === undefined ? '' : s.businessAddress, 'Endereço comercial', 1000);
  settings.privacyEmail = text(s.privacyEmail === undefined ? '' : s.privacyEmail, 'E-mail de privacidade', 254);
  const taxId = text(s.taxId === undefined ? '' : s.taxId, 'CPF ou CNPJ', 24);
  const normalizedTaxId = normalizeTaxId(taxId);
  if (normalizedTaxId === null) throw new HttpError(400, 'CPF ou CNPJ inválido: confira o número e os dígitos verificadores.');
  settings.taxId = normalizedTaxId;
  for (const [key, label] of [['privacyPolicy', 'Política de privacidade'], ['purchaseTerms', 'Termos de compra'], ['returnsPolicy', 'Política de trocas e devoluções']] as const) {
    settings[key] = text(s[key] === undefined ? '' : s[key], label, 20_000);
  }
  if (settings.privacyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.privacyEmail)) throw new HttpError(400, 'E-mail de privacidade inválido.');
  settings.catalogIsDemo = s.catalogIsDemo === undefined ? true : bool(s.catalogIsDemo, 'Catálogo demonstrativo');
  settings.locationEnabled = s.locationEnabled === undefined ? true : bool(s.locationEnabled, 'Exibir localização');
  settings.locationTitle = text(s.locationTitle === undefined ? 'Localização' : s.locationTitle, 'Título da localização', 120, true);
  settings.locationDescription = text(s.locationDescription === undefined ? 'Venha conhecer suas próximas favoritas de perto.' : s.locationDescription, 'Descrição da localização', 2000);
  // Older catalogs keep their location empty until the owner supplies an address.
  settings.locationAddress = text(s.locationAddress === undefined ? '' : s.locationAddress, 'Endereço da localização', 1000);
  settings.locationHours = text(s.locationHours === undefined ? '' : s.locationHours, 'Horário de atendimento', 1000);
  settings.locationMapsUrl = text(s.locationMapsUrl === undefined ? '' : s.locationMapsUrl, 'Link do Google Maps', 2048);
  settings.locationMapCenter = text(s.locationMapCenter === undefined ? '' : s.locationMapCenter, 'Centro do mapa', 100);
  if (settings.locationMapCenter) {
    const center = mapCenterCoordinates(settings.locationMapCenter);
    if (!center) throw new HttpError(400, 'Centro do mapa: informe latitude e longitude válidas, separadas por vírgula. Use ponto nos decimais.');
    settings.locationMapCenter = center;
  }
  if (settings.locationMapsUrl) {
    try { const u = new URL(settings.locationMapsUrl); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); settings.locationMapsUrl = u.href; }
    catch { throw new HttpError(400, 'Link do Google Maps: use uma URL HTTPS, sem código de incorporação.'); }
  }
  settings.fabricEnabled = s.fabricEnabled === undefined ? true : bool(s.fabricEnabled, 'Animação de tecido');
  settings.fabricColor = s.fabricColor === undefined ? '#FFFFFF' : hex(s.fabricColor, 'Cor do tecido');
  settings.fabricIntensity = s.fabricIntensity === undefined ? 0.6 : Number(s.fabricIntensity);
  if (!Number.isFinite(settings.fabricIntensity) || settings.fabricIntensity < 0.2 || settings.fabricIntensity > 1) throw new HttpError(400, 'Intensidade do tecido: use um valor entre 0,2 e 1.');
  settings.fabricMode = s.fabricMode === undefined ? 'scroll' : s.fabricMode as Settings['fabricMode'];
  if (!['scroll', 'loop'].includes(settings.fabricMode)) throw new HttpError(400, 'Movimento do tecido inválido.');
  if (settings.whatsapp && !/^\d{10,15}$/.test(settings.whatsapp)) throw new HttpError(400, 'WhatsApp: use apenas números com país e DDD.');
  if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) throw new HttpError(400, 'E-mail de contato inválido.');
  if (settings.instagram) {
    try { const u = new URL(settings.instagram); if (u.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(u.hostname) || u.username || u.password) throw new Error(); }
    catch { throw new HttpError(400, 'Instagram: use o endereço https://www.instagram.com/seu-perfil.'); }
  }
  const categories: Category[] = list(root.categories, 'Categorias', 50).map((item) => {
    const c = object(item, 'Categoria');
    return { id: identifier(c.id, 'ID de categoria'), slug: identifier(c.slug, 'Slug da categoria'), name: text(c.name, 'Nome de categoria', 100, true), description: text(c.description, 'Descrição de categoria'), image: imageUrl(c.image, 'Imagem da categoria'), visible: bool(c.visible, 'Visibilidade da categoria') };
  });
  unique(categories.map(c => c.id), 'IDs de categoria'); unique(categories.map(c => c.slug), 'Slugs de categoria');
  const visibleCategoryIds = categories.filter(category => category.visible).map(category => category.id);
  if (s.homeCategoryIds === undefined) {
    const preferred = ['vestidos', 'conjuntos', 'calcas'].filter(id => visibleCategoryIds.includes(id));
    settings.homeCategoryIds = [...preferred, ...visibleCategoryIds.filter(id => !preferred.includes(id))].slice(0, 3);
  } else {
    const selectedIds = list(s.homeCategoryIds, 'Categorias na página inicial', 3).map(id => identifier(id, 'Categoria na página inicial'));
    unique(selectedIds, 'Categorias na página inicial');
    // Hiding or removing a category also removes its home preview on the next save.
    settings.homeCategoryIds = selectedIds.filter(id => visibleCategoryIds.includes(id));
  }
  const products: Product[] = list(root.products, 'Produtos', 500).map((item) => {
    const p = object(item, 'Produto');
    const variants: Variant[] = list(p.variants, 'Variações', 100).map(item => {
      const v = object(item, 'Variação');
      return { id: identifier(v.id, 'ID de variação'), size: text(v.size, 'Tamanho', 30, true), color: text(v.color, 'Cor', 60, true), colorHex: hex(v.colorHex, 'Cor da variação'), stock: integer(v.stock, 'Estoque', 0, 100_000) };
    });
    unique(variants.map(v => v.id), 'IDs de variação');
    unique(variants.map(v => `${v.size.toLowerCase()}:${v.color.toLowerCase()}`), 'Combinações tamanho/cor');
    const categoryId = identifier(p.categoryId, 'Categoria do produto');
    if (!categories.some(c => c.id === categoryId)) throw new HttpError(400, 'Selecione uma categoria existente para cada produto.');
    const images = list(p.images, 'Imagens', 8).map(i => imageUrl(i, 'Imagem de produto')).filter(Boolean);
    const price = integer(p.price, 'Preço em centavos', 0);
    const compareAtPrice = integer(p.compareAtPrice, 'Preço anterior em centavos');
    if (compareAtPrice > 0 && compareAtPrice <= price) throw new HttpError(400, 'Preço anterior precisa ser maior que o preço atual.');
    const active = bool(p.active, 'Produto ativo');
    if (active && price === 0) throw new HttpError(400, 'Produtos ativos precisam de preço maior que zero.');
    if (active && (!images.length || !variants.length)) throw new HttpError(400, 'Produtos ativos precisam de imagem e variação.');
    return { id: identifier(p.id, 'ID do produto'), slug: identifier(p.slug, 'Slug do produto'), name: text(p.name, 'Nome do produto', 160, true), categoryId, price, compareAtPrice, description: text(p.description, 'Descrição', 8000), details: text(p.details, 'Detalhes', 8000), composition: text(p.composition, 'Composição'), care: text(p.care, 'Cuidados'), images, variants, active, featured: bool(p.featured, 'Destaque'), badge: text(p.badge, 'Etiqueta', 60) };
  });
  unique(products.map(p => p.id), 'IDs de produto'); unique(products.map(p => p.slug), 'Slugs de produto');
  return { schemaVersion: 1, revision: integer(root.revision, 'Revisão'), settings, categories, products };
}
