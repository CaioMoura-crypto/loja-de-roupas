import type { CSSProperties } from 'react';

export type ThemeColorGroup = {
  id: string;
  label: string;
  description: string;
  defaultColor: string;
  advanced: boolean;
};

// A group follows the original color, even when it is shared by text and surfaces.
const groups = [
  ['1f2b4d', 'Azul principal', 'Textos, botões, ícones, rodapé e finalização.', false],
  ['ffffff', 'Branco', 'Fundos brancos e textos claros sobre botões e rodapé.', false],
  ['f7941d', 'Laranja de destaque', 'Botão de abertura, promoções e indicação de foco.', false],
  ['555f76', 'Texto secundário', 'Descrições, legendas e informações da vitrine.', false],
  ['d4d8e0', 'Bordas e rodapé', 'Bordas da vitrine e textos suaves do rodapé.', false],
  ['f4f4f2', 'Fundo suave', 'Áreas de apoio da vitrine e avisos da sacola.', false],
  ['f3f4f7', 'Fundo da localização', 'Seção de endereço e mapa.', false],
  ['f2f4f7', 'Fundo da finalização', 'Resumo da compra e áreas de apoio no checkout.', false],
  ['55627a', 'Texto secundário da finalização', 'Descrições, legendas e valores de apoio no checkout.', true],
  ['000000', 'Sombras neutras', 'Sombras e contornos discretos, mantendo a transparência.', true],
  ['e2e5ec', 'Apoio da localização', 'Botão Apple Maps e fundo enquanto o mapa carrega.', true],
  ['eef0f5', 'Seleção e navegação', 'Opções selecionadas e interação com carrosséis.', true],
  ['e0e3eb', 'Links do rodapé', 'Textos dos links de contato no rodapé.', true],
  ['c4cbd9', 'Nota de demonstração', 'Texto discreto abaixo dos contatos.', true],
  ['bbc0ad', 'Contador da sacola', 'Contorno do número de peças no cabeçalho.', true],
  ['9da48c', 'Traço dos links', 'Sublinhado dos links de ação.', true],
  ['d9dbcc', 'Interação nas categorias', 'Fundo translúcido das categorias ao passar o cursor.', true],
  ['efefed', 'Base das fotos do catálogo', 'Fundo atrás das fotos, sem alterar as imagens.', true],
  ['e1dfd4', 'Imagem ausente', 'Fundo do aviso de imagem ainda não cadastrada.', true],
  ['252a23', 'Fundo atrás das janelas', 'Camada translúcida atrás de detalhes e sacola.', true],
  ['e3e0d7', 'Base da foto em destaque', 'Fundo atrás da foto no detalhe da peça.', true],
  ['e2e1d6', 'Base das fotos na sacola', 'Fundo atrás das miniaturas da sacola.', true],
  ['b8bfce', 'Bordas dos dados de contato', 'Contorno dos campos da solicitação de pedido.', true],
  ['687185', 'Exemplos nos campos', 'Textos de exemplo nos campos da solicitação.', true],
  ['913d2d', 'Texto de erro', 'Mensagem de erro em formulários.', true],
  ['a8503a', 'Apoio dos erros', 'Contorno e fundo translúcido das mensagens de erro.', true],
  ['763223', 'Avisos da peça', 'Disponibilidade e feedback no detalhe do produto.', true],
  ['6f788c', 'Barra de rolagem', 'Indicador de rolagem nas janelas da loja.', true],
  ['cbd0da', 'Borda da ordenação', 'Contorno do seletor de ordenação.', true],
  ['f4f5f8', 'Interação na ordenação', 'Fundo do seletor ao passar o cursor.', true],
  ['d5d9e1', 'Borda das opções', 'Contorno da lista de opções de ordenação.', true],
  ['86500f', 'Indicador de opção selecionada', 'Ícone da ordenação selecionada.', true],
  ['f2f2f0', 'Base das prévias da home', 'Fundo atrás das imagens das promoções e categorias.', true],
  ['dce4ee', 'Seleção de texto no checkout', 'Fundo ao selecionar texto na finalização.', true],
  ['c1c8d4', 'Bordas do checkout', 'Contorno dos campos da finalização.', true],
  ['f7f8fa', 'Painéis de pagamento', 'Fundos dos exemplos Pix, cartão e campos preenchidos.', true],
  ['77849a', 'Escolha do pagamento', 'Contorno das opções Pix e cartão.', true],
  ['e5eaf1', 'Pagamento selecionado', 'Opção escolhida, botão de copiar e confirmação.', true],
  ['e1e5eb', 'Base das fotos no checkout', 'Fundo atrás das miniaturas do resumo.', true],
  ['334469', 'Interação no botão do checkout', 'Botão principal da finalização ao passar o cursor.', true],
  ['dbe2ec', 'Interação nas opções de pagamento', 'Opções e botão de copiar ao passar o cursor.', true],
  ['17213a', 'Botão do checkout pressionado', 'Cor enquanto o botão principal está pressionado.', true],
  ['d1dae7', 'Botão de copiar pressionado', 'Cor enquanto o botão de copiar está pressionado.', true],
  ['14213d', 'Sombra do WhatsApp', 'Sombra translúcida do atalho flutuante.', true],
  ['334366', 'Interação no WhatsApp', 'Atalho flutuante ao passar o cursor.', true],
] as const;

export const THEME_COLOR_GROUPS: readonly ThemeColorGroup[] = groups.map(([id, label, description, advanced]) => ({
  id, label, description, advanced, defaultColor: `#${id}`,
}));

type ThemeSettings = { themeColors?: unknown; accentColor?: unknown; backgroundColor?: unknown };
const validHex = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

export function resolveThemeColors(settings: ThemeSettings = {}): Record<string, string> {
  const colors = Object.fromEntries(THEME_COLOR_GROUPS.map(group => [group.id, group.defaultColor]));
  if (validHex(settings.accentColor)) colors['1f2b4d'] = settings.accentColor.toLowerCase();
  if (validHex(settings.backgroundColor)) colors.ffffff = settings.backgroundColor.toLowerCase();
  const overrides = settings.themeColors;
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const group of THEME_COLOR_GROUPS) {
      const value = (overrides as Record<string, unknown>)[group.id];
      if (validHex(value)) colors[group.id] = value.toLowerCase();
    }
  }
  return colors;
}

export function getThemeStyle(settings: ThemeSettings = {}): CSSProperties {
  const colors = resolveThemeColors(settings);
  const style: Record<string, string> = {};
  for (const [id, color] of Object.entries(colors)) {
    style[`--theme-${id}`] = color;
    style[`--theme-${id}-rgb`] = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)).join(' ');
  }
  for (const [alias, id] of Object.entries({ accent: '1f2b4d', bg: 'ffffff', ink: '1f2b4d', muted: '555f76', border: 'd4d8e0', surface: 'f4f4f2', highlight: 'f7941d' })) {
    style[`--shop-${alias}`] = `var(--theme-${id})`;
  }
  return style as CSSProperties;
}
