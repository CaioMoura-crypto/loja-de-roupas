import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Pure schema checks; no persisted store data, admin secrets or orders are read.
const modules = new Map();
for (const name of ['http', 'location', 'theme', 'tax-id', 'validation', 'default-content']) {
  const source = await readFile(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  for (const [dependency, url] of modules) outputText = outputText.replaceAll(`'./${dependency}'`, JSON.stringify(url));
  modules.set(name, `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { validateContent } = await import(modules.get('validation'));
const { DEFAULT_CONTENT } = await import(modules.get('default-content'));
const { THEME_COLOR_GROUPS, resolveThemeColors } = await import(modules.get('theme'));
const { normalizeTaxId } = await import(modules.get('tax-id'));
const fixture = () => structuredClone(DEFAULT_CONTENT);

test('defaults keep the existing palette and leave legal identity unset', () => {
  const settings = validateContent(fixture()).settings;
  const palette = resolveThemeColors(settings);
  for (const group of THEME_COLOR_GROUPS) assert.equal(palette[group.id], group.defaultColor);
  for (const key of ['legalName', 'taxId', 'businessAddress', 'privacyEmail']) assert.equal(settings[key], '');
  for (const key of ['privacyPolicy', 'purchaseTerms', 'returnsPolicy']) assert.match(settings[key], /^Modelo demonstrativo:/);
});

test('old content gains optional settings without losing its legacy colors or adding legal claims', () => {
  const content = fixture();
  for (const key of ['themeColors', 'legalName', 'taxId', 'businessAddress', 'privacyEmail', 'privacyPolicy', 'purchaseTerms', 'returnsPolicy']) delete content.settings[key];
  content.settings.accentColor = '#123456';
  content.settings.backgroundColor = '#F1EEDD';
  const settings = validateContent(content).settings;
  assert.deepEqual(settings.themeColors, {});
  assert.equal(resolveThemeColors(settings)['1f2b4d'], '#123456');
  assert.equal(resolveThemeColors(settings).ffffff, '#f1eedd');
  assert.equal(settings.privacyPolicy, '');
  assert.equal(settings.taxId, '');
});

test('explicit group overrides take precedence and keep independent colors unchanged', () => {
  const content = fixture();
  content.settings.themeColors = { '1f2b4d': '#AABBCC', ffffff: '#FEFDFC' };
  const settings = validateContent(content).settings;
  assert.deepEqual(settings.themeColors, { '1f2b4d': '#aabbcc', ffffff: '#fefdfc' });
  assert.equal(resolveThemeColors(settings)['1f2b4d'], '#aabbcc');
  assert.equal(resolveThemeColors(settings).f7941d, '#f7941d');
});

test('unknown theme keys, non-record palettes and CSS expressions are rejected', () => {
  for (const themeColors of [null, [], 'red', { unknown: '#123456' }, { '1f2b4d': 'red' }, { '1f2b4d': '#abc' }, { '1f2b4d': 'var(--x)' }, { '1f2b4d': '#123456;display:none' }, JSON.parse('{"__proto__":"#123456"}')]) {
    const content = fixture(); content.settings.themeColors = themeColors;
    assert.throws(() => validateContent(content), /Cores da loja|Cor do grupo/);
  }
});

test('CPF and numeric CNPJ verify their check digits and preserve no formatting', () => {
  assert.equal(normalizeTaxId('529.982.247-25'), '52998224725');
  assert.equal(normalizeTaxId('11.222.333/0001-81'), '11222333000181');
  for (const value of ['529.982.247-26', '11.222.333/0001-82', '00000000000', '11111111111111', '---', '52998224725<script>']) assert.equal(normalizeTaxId(value), null);
  assert.equal(normalizeTaxId(' '), '');
});

test('the official alphanumeric CNPJ example follows the Receita/Serpro algorithm', () => {
  // Example from https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
  assert.equal(normalizeTaxId('12.ABC.345/01DE-35'), '12ABC34501DE35');
  assert.equal(normalizeTaxId('12.abc.345/01de-35'), '12ABC34501DE35');
  assert.equal(normalizeTaxId('12.ABC.345/01DE-36'), null);
  const content = fixture(); content.settings.taxId = '12.ABC.345/01DE-35';
  assert.equal(validateContent(content).settings.taxId, '12ABC34501DE35');
});

test('store details and policies are optional, bounded plain strings', () => {
  const content = fixture();
  content.settings.legalName = ' Loja de exemplo ';
  content.settings.privacyEmail = 'privacidade@criativa.example';
  content.settings.privacyPolicy = 'Primeiro parágrafo.\n\nSegundo parágrafo.';
  const settings = validateContent(content).settings;
  assert.equal(settings.legalName, 'Loja de exemplo');
  assert.equal(settings.privacyPolicy, content.settings.privacyPolicy);
  for (const [key, value] of [['legalName', 'x'.repeat(241)], ['businessAddress', 'x'.repeat(1001)], ['privacyEmail', 'not-an-email'], ['privacyPolicy', 'x'.repeat(20001)], ['purchaseTerms', 5], ['returnsPolicy', null], ['taxId', '123']]) {
    const invalid = fixture(); invalid.settings[key] = value;
    assert.throws(() => validateContent(invalid));
  }
});
