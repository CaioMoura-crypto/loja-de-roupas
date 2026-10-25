'use client';

import type { Settings } from '@/lib/types';
import { THEME_COLOR_GROUPS, getThemeStyle, resolveThemeColors, type ThemeColorGroup } from '@/lib/theme';
import { Field } from './AdminFields';
import styles from './ThemeEditor.module.css';

const editableGroups = THEME_COLOR_GROUPS.filter(group => ['1f2b4d', 'f7941d'].includes(group.id)).map(group => ({
  ...group,
  label: group.id === '1f2b4d' ? 'Principal' : 'Destaque',
  description: group.id === '1f2b4d' ? 'Textos, botões, ícones e rodapé em toda a loja.' : 'Botão de abertura e realces, independentemente da cor principal.',
}));

function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(first); const b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export default function ThemeEditor({ settings, onChange }: { settings: Settings; onChange: (colors: Record<string, string>) => void }) {
  const colors = resolveThemeColors(settings);
  const contrastChecks = [
    { label: 'Texto principal e fundo', foreground: '1f2b4d', background: 'ffffff' },
    { label: 'Botão de abertura', foreground: '1f2b4d', background: 'f7941d' },
    { label: 'Links do rodapé', foreground: 'e0e3eb', background: '1f2b4d' },
  ].map(pair => ({ label: pair.label, ratio: contrastRatio(colors[pair.foreground], colors[pair.background]) }));
  const lowContrast = contrastChecks.filter(pair => pair.ratio < 4.5);

  function colorField(group: ThemeColorGroup) {
    const value = settings.themeColors?.[group.id] ?? colors[group.id];
    return <Field key={group.id} path={`settings.themeColors.${group.id}`} label={group.label} hint={group.description}>
      <span className="admin-color-input">
        <input type="color" value={/^#[\da-f]{6}$/i.test(value) ? value : colors[group.id]} onChange={event => onChange({ ...settings.themeColors, [group.id]: event.target.value })}/>
        <input value={value} maxLength={7} onChange={event => onChange({ ...settings.themeColors, [group.id]: event.target.value })} aria-label={`Código da cor: ${group.label}`} spellCheck={false}/>
      </span>
    </Field>;
  }

  return <section className={`admin-card admin-form-card ${styles.card}`} aria-labelledby="theme-heading">
    <div className={styles.heading}><div><h3 id="theme-heading">Paleta da loja</h3><p>Principal reúne textos, botões e rodapé. Destaque controla o botão de abertura e os realces, de forma independente.</p></div><button type="button" className="admin-text-button" onClick={() => onChange({ ...settings.themeColors, ...Object.fromEntries(editableGroups.map(group => [group.id, group.defaultColor])) })}>Restaurar as duas cores</button></div>
    <div className={styles.layout}>
      <div><div className={`admin-form-grid ${styles.colorGrid}`}>{editableGroups.map(colorField)}</div>
        {lowContrast.length > 0 && <p className={styles.warning} role="status">Contraste baixo: {lowContrast.map(pair => pair.label.toLocaleLowerCase('pt-BR')).join(', ')}. Ajuste as cores para facilitar a leitura.</p>}
      </div>
      <div className={styles.previewColumn}><h4>Prévia das combinações</h4>
        <div className={styles.preview} style={getThemeStyle(settings)} aria-label="Prévia das cores da loja">
          <div className={styles.previewMain}><strong className={styles.previewBrand}>{settings.brandName || 'Sua loja'}</strong><h5>Combine do seu jeito.</h5><p>Novas escolhas para o seu guarda-roupa.</p><div className={styles.previewActions}><span className={`${styles.previewButton} ${styles.previewHighlight}`}>Explorar a coleção</span><span className={styles.previewButton}>Ver coleção completa</span></div></div>
          <div className={styles.previewFooter}><strong>{settings.brandName || 'Sua loja'}</strong><span>Contato e informações</span></div>
        </div>
        <p className={styles.previewHint}>Prévia de cores. As fotografias mantêm as cores originais.</p>
      </div>
    </div>
  </section>;
}
