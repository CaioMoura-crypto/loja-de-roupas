'use client';

import type { Category, Settings } from '@/lib/types';
import { Field, ImageField } from './AdminFields';
import ThemeEditor from './ThemeEditor';

export default function SettingsEditor({ settings, categories, patch, onUpload }: { settings: Settings; categories: Category[]; patch: <K extends keyof Settings>(key: K, value: Settings[K]) => void; onUpload: (busy: boolean) => void }) {
  const visibleCategories = categories.filter(category => category.visible);
  const selectedCategoryIds = settings.homeCategoryIds.filter(id => visibleCategories.some(category => category.id === id));
  function toggleHomeCategory(id: string, checked: boolean) {
    if (!checked) patch('homeCategoryIds', selectedCategoryIds.filter(selectedId => selectedId !== id));
    else if (selectedCategoryIds.length < 3) patch('homeCategoryIds', [...selectedCategoryIds, id]);
  }
  return <><div className="admin-section-heading"><div><h2>A loja com a sua identidade.</h2><p>Edite os textos, as imagens e os detalhes que contam sua história.</p></div></div><div className="admin-settings-layout">
    <section className="admin-card admin-form-card"><h3>Identidade da marca</h3><div className="admin-form-grid">
      <Field path="settings.brandName" label="Nome da loja"><input value={settings.brandName} onChange={event => patch('brandName', event.target.value)} /></Field>
      <Field path="settings.tagline" label="Assinatura da marca"><input value={settings.tagline} onChange={event => patch('tagline', event.target.value)} /></Field>
      <label className="admin-check admin-field-wide"><input type="checkbox" checked={settings.catalogIsDemo} onChange={event => patch('catalogIsDemo', event.target.checked)} /><span><strong>Catálogo demonstrativo</strong><small>Mantenha ativo enquanto imagens, preços e medidas forem exemplos. Desative após cadastrar os produtos reais.</small></span></label>
      <Field path="settings.announcement" label="Aviso no topo do site" wide><input value={settings.announcement} onChange={event => patch('announcement', event.target.value)} /></Field>
    </div></section>
    <ThemeEditor settings={settings} onChange={colors => patch('themeColors', colors)}/>
    <section className="admin-card admin-form-card"><h3>Primeira impressão</h3><p className="admin-card-description">O destaque principal da página inicial.</p><div className="admin-form-grid">
      <Field path="settings.heroEyebrow" label="Subtítulo da abertura" hint="Texto curto que acompanha o título principal."><input value={settings.heroEyebrow} onChange={event => patch('heroEyebrow', event.target.value)} /></Field>
      <Field path="settings.heroButton" label="Texto do botão"><input value={settings.heroButton} onChange={event => patch('heroButton', event.target.value)} /></Field>
      <Field path="settings.heroTitle" label="Título principal" wide><textarea rows={2} value={settings.heroTitle} onChange={event => patch('heroTitle', event.target.value)} /></Field>
      <Field path="settings.heroDescription" label="Descrição principal" wide><textarea rows={3} value={settings.heroDescription} onChange={event => patch('heroDescription', event.target.value)} /></Field>
    </div><ImageField path="settings.heroImage" label="Imagem principal" value={settings.heroImage} onChange={value => patch('heroImage', value)} onBusy={onUpload} /></section>
    <section className="admin-card admin-form-card" aria-labelledby="admin-home-categories-heading"><h3 id="admin-home-categories-heading">Categorias na página inicial</h3><p className="admin-card-description" id="admin-home-categories-help">Escolha até três categorias para mostrar uma prévia dos produtos. Desmarque todas para ocultar esse bloco.</p>
      <fieldset className="admin-editable" aria-describedby="admin-home-categories-help admin-home-categories-count"><legend className="admin-sr-only">Categorias com prévia na página inicial</legend><div className="admin-form-grid">{visibleCategories.map(category => <label className="admin-check" key={category.id}><input type="checkbox" checked={selectedCategoryIds.includes(category.id)} disabled={selectedCategoryIds.length >= 3 && !selectedCategoryIds.includes(category.id)} onChange={event => toggleHomeCategory(category.id, event.target.checked)} /><span>{category.name}</span></label>)}</div></fieldset>
      {!visibleCategories.length && <p>Nenhuma categoria visível. Ative uma categoria na seção Categorias para selecioná-la aqui.</p>}
      <p id="admin-home-categories-count" role="status">{selectedCategoryIds.length} de 3 categorias selecionadas{selectedCategoryIds.length === 0 ? ' · Bloco oculto' : ''}.</p>
      <p>As promoções são exibidas automaticamente quando o preço anterior é maior que o preço de venda.</p>
    </section>
    <section className="admin-card admin-form-card" aria-labelledby="admin-location-heading"><h3 id="admin-location-heading">Localização</h3><p className="admin-card-description">Endereço, horário e mapa para quem quer visitar a loja.</p><div className="admin-form-grid">
      <label className="admin-check admin-field-wide"><input type="checkbox" data-admin-field="settings.locationEnabled" checked={settings.locationEnabled} onChange={event => patch('locationEnabled', event.target.checked)} /><span><strong>Exibir localização na página inicial</strong><small>A seção aparece quando há um endereço preenchido.</small></span></label>
      <Field path="settings.locationTitle" label="Título da localização" wide><input maxLength={120} value={settings.locationTitle} onChange={event => patch('locationTitle', event.target.value)} /></Field>
      <Field path="settings.locationDescription" label="Descrição da localização" wide><textarea rows={2} maxLength={2000} value={settings.locationDescription} onChange={event => patch('locationDescription', event.target.value)} /></Field>
      <Field path="settings.locationAddress" label="Endereço completo" hint="Inclua o nome do local, rua, número, cidade e estado. A rota no Apple Maps usa este endereço. Ao alterá-lo, atualize também o centro do mapa." wide><textarea rows={3} maxLength={1000} value={settings.locationAddress} onChange={event => { patch('locationAddress', event.target.value); patch('locationMapCenter', ''); }} /></Field>
      <Field path="settings.locationMapCenter" label="Centro do mapa (opcional)" hint="No Google Maps, clique com o botão direito no ponto da loja e copie o par de coordenadas. Cole latitude, longitude, com ponto nos decimais. Sem coordenadas, a seção mostra somente endereço e rota no Apple Maps." wide><input maxLength={100} value={settings.locationMapCenter || ''} onChange={event => patch('locationMapCenter', event.target.value)} placeholder="-12.9778603, -38.455251" /></Field>
      {settings.locationAddress.trim() && !settings.locationMapCenter?.trim() && <p className="admin-card-description admin-field-wide" role="status">Atualize o centro do mapa para exibi-lo neste endereço.</p>}
      <Field path="settings.locationHours" label="Horário de atendimento" hint="Informe também os dias de atendimento, quando necessário." wide><textarea rows={2} maxLength={1000} value={settings.locationHours} onChange={event => patch('locationHours', event.target.value)} /></Field>
    </div></section>
    <section className="admin-card admin-form-card"><h3>Contato e informações</h3><div className="admin-form-grid">
      <Field path="settings.contactEmail" label="E-mail de contato"><input type="email" value={settings.contactEmail} onChange={event => patch('contactEmail', event.target.value)} /></Field>
      <Field path="settings.whatsapp" label="WhatsApp" hint="Código do país + DDD + número. Ex.: 5571999999999."><input type="tel" value={settings.whatsapp} onChange={event => patch('whatsapp', event.target.value)} /></Field>
      <Field path="settings.instagram" label="Instagram" hint="Link completo do perfil."><input type="url" value={settings.instagram} onChange={event => patch('instagram', event.target.value)} /></Field>
      <Field path="settings.footerText" label="Texto do rodapé"><textarea rows={2} value={settings.footerText} onChange={event => patch('footerText', event.target.value)} /></Field>
      <Field path="settings.shippingNote" label="Informações de envio" wide><textarea rows={3} value={settings.shippingNote} onChange={event => patch('shippingNote', event.target.value)} /></Field>
      <Field path="settings.returnsNote" label="Informações de trocas e devoluções" wide><textarea rows={3} value={settings.returnsNote} onChange={event => patch('returnsNote', event.target.value)} /></Field>
    </div></section>
    <section className="admin-card admin-form-card" aria-labelledby="admin-business-heading"><h3 id="admin-business-heading">Informações da loja e políticas</h3><p className="admin-card-description">Preencha com os dados do responsável pela loja e revise os textos antes de vender produtos reais. Os modelos demonstrativos não substituem as condições da sua operação.</p><div className="admin-form-grid">
      <Field path="settings.legalName" label="Razão social ou nome do responsável" wide><input maxLength={240} value={settings.legalName} onChange={event => patch('legalName', event.target.value)}/></Field>
      <Field path="settings.taxId" label="CPF ou CNPJ" hint="Opcional durante a demonstração. Aceita CNPJ numérico e alfanumérico; confira os dígitos verificadores." wide><input maxLength={24} autoCapitalize="characters" spellCheck={false} value={settings.taxId} onChange={event => patch('taxId', event.target.value)}/></Field>
      <Field path="settings.businessAddress" label="Endereço comercial completo" hint="Rua, número, complemento, bairro, cidade, estado e CEP." wide><textarea rows={3} maxLength={1000} value={settings.businessAddress} onChange={event => patch('businessAddress', event.target.value)}/></Field>
      <Field path="settings.privacyEmail" label="E-mail para assuntos de privacidade" hint="Pode ser o mesmo e-mail de atendimento da loja." wide><input type="email" maxLength={254} value={settings.privacyEmail} onChange={event => patch('privacyEmail', event.target.value)}/></Field>
      <Field path="settings.privacyPolicy" label="Política de privacidade" hint="Descreva o uso dos dados, finalidades, prestadores, retenção e o canal para solicitações. Texto simples, sem HTML." wide><textarea rows={7} maxLength={20000} value={settings.privacyPolicy} onChange={event => patch('privacyPolicy', event.target.value)}/></Field>
      <Field path="settings.purchaseTerms" label="Termos de compra" hint="Informe disponibilidade, preços, pagamento, frete, entrega e atendimento conforme a operação da sua loja." wide><textarea rows={7} maxLength={20000} value={settings.purchaseTerms} onChange={event => patch('purchaseTerms', event.target.value)}/></Field>
      <Field path="settings.returnsPolicy" label="Política de trocas e devoluções" hint="Informe os canais, condições e prazos aplicáveis a trocas, devoluções, cancelamentos e reembolsos." wide><textarea rows={7} maxLength={20000} value={settings.returnsPolicy} onChange={event => patch('returnsPolicy', event.target.value)}/></Field>
    </div></section>
  </div></>;
}
