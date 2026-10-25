'use client';

import { useContext } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ImagePlus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { Category, Product, Variant } from '@/lib/types';
import { money, slugify } from '@/lib/format';
import { Field, ImageField } from './AdminFields';
import { AdminValidationContext } from './AdminValidation';

export default function ProductEditor({ product, categories, patch, onBack, onDelete, onDuplicate, onUpload }: { product: Product; categories: Category[]; patch: (changes: Partial<Product>) => void; onBack: () => void; onDelete: () => void; onDuplicate: () => void; onUpload: (busy: boolean) => void }) {
  const issue = useContext(AdminValidationContext);
  const path = (field: string) => `product.${product.id}.${field}`;
  const galleryError = issue?.field === path('images') ? issue.message : '';
  const variantsError = issue?.field === path('variants') ? issue.message : '';
  const variant = (id: string, changes: Partial<Variant>) => patch({ variants: product.variants.map(item => item.id === id ? { ...item, ...changes } : item) });
  function moveImage(index: number, direction: number) { const images = [...product.images]; [images[index], images[index + direction]] = [images[index + direction], images[index]]; patch({ images }); }
  return <>
    <div className="admin-editor-top"><button className="admin-text-button" onClick={onBack}><ArrowLeft size={18} />Voltar para produtos</button><div className="admin-row-actions"><button className="admin-button admin-button-small" onClick={onDuplicate}><Copy size={16} />Duplicar</button><button className="admin-button admin-button-small admin-danger" onClick={onDelete}><Trash2 size={16} />Excluir produto</button></div></div>
    <div className="admin-section-heading"><h2 id="admin-product-heading" tabIndex={-1}>{product.name || 'Nova peça'}</h2><span className={`admin-badge${product.active ? ' admin-badge-live' : ''}`}>{product.active ? 'Publicado' : 'Rascunho'}</span></div>
    <div className="admin-product-layout">
      <section className="admin-card admin-form-card admin-product-identity"><h3>Identificação</h3><div className="admin-form-grid">
        <Field label="Nome do produto" path={path('name')} wide><input value={product.name} onChange={event => patch({ name: event.target.value })} /></Field>
        <Field label="Categoria" path={path('categoryId')}><select value={product.categoryId} onChange={event => patch({ categoryId: event.target.value })}>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field>
        <Field label="Endereço" path={path('slug')} hint="Identificador do produto, sem espaços ou acentos."><span className="admin-slug-input"><input value={product.slug} onChange={event => patch({ slug: slugify(event.target.value) })} /><button className="admin-icon-button" onClick={() => patch({ slug: slugify(product.name) })} aria-label="Gerar endereço a partir do nome" title="Gerar a partir do nome"><RefreshCw size={16} /></button></span></Field>
      </div></section>
      <aside className="admin-product-side" aria-label="Preço e publicação">
        <section className="admin-card admin-form-card"><h3>Preço</h3><div className="admin-price-preview">{money(product.price)}</div>
          <Field label="Preço de venda (R$)" path={path('price')}><input type="number" min="0" step="0.01" value={product.price / 100} onChange={event => patch({ price: Math.round(Number(event.target.value) * 100) })} /></Field>
          <Field label="Preço anterior (R$)" path={path('compareAtPrice')} hint="Opcional. Deixe zero quando não houver promoção."><input type="number" min="0" step="0.01" value={product.compareAtPrice / 100} onChange={event => patch({ compareAtPrice: Math.round(Number(event.target.value) * 100) })} /></Field>
          {product.compareAtPrice > product.price && <p className="admin-discount">{Math.round((1 - product.price / product.compareAtPrice) * 100)}% de desconto exibido na loja</p>}
        </section>
        <section className="admin-card admin-form-card"><h3>Na vitrine</h3>
          <label className="admin-check"><input type="checkbox" checked={product.active} onChange={event => patch({ active: event.target.checked })} /><span><strong>Publicar produto</strong><small>Visível para as clientes.</small></span></label>
          <label className="admin-check"><input type="checkbox" checked={product.featured} onChange={event => patch({ featured: event.target.checked })} /><span><strong>Destacar na página inicial</strong><small>Uma das escolhas da coleção.</small></span></label>
          <Field label="Etiqueta" path={path('badge')} hint="Ex.: Novidade, Últimas peças, Favorito."><input value={product.badge} onChange={event => patch({ badge: event.target.value })} maxLength={50} /></Field>
        </section>
      </aside>
      <section className="admin-card admin-form-card admin-product-description"><h3>Sobre a peça</h3><div className="admin-form-grid">
        <Field label="Descrição" path={path('description')} wide><textarea rows={4} value={product.description} onChange={event => patch({ description: event.target.value })} /></Field>
        <Field label="Detalhes da peça" path={path('details')} wide hint="Conte sobre o corte, o caimento e os acabamentos."><textarea rows={3} value={product.details} onChange={event => patch({ details: event.target.value })} /></Field>
        <Field label="Composição" path={path('composition')}><textarea rows={3} value={product.composition} onChange={event => patch({ composition: event.target.value })} /></Field>
        <Field label="Cuidados" path={path('care')}><textarea rows={3} value={product.care} onChange={event => patch({ care: event.target.value })} /></Field>
      </div></section>
      <section className="admin-card admin-form-card admin-product-gallery"><div className="admin-card-heading"><div><h3>Galeria de imagens</h3><p className="admin-card-description">A primeira imagem é a capa. Até 8 fotos por peça.</p></div><button className="admin-button admin-button-small" data-admin-field={path('images')} aria-invalid={!!galleryError || undefined} aria-describedby={galleryError ? 'admin-gallery-error' : undefined} disabled={product.images.length >= 8} onClick={() => patch({ images: [...product.images, ''] })}><Plus size={16} />Adicionar</button></div>
        {galleryError && <p className="admin-inline-error" id="admin-gallery-error">{galleryError}</p>}
        <div className="admin-gallery-fields">{product.images.map((url, index) => <div className="admin-gallery-item" key={index}><ImageField path={path(`image.${index}`)} label={index === 0 ? 'Imagem de capa' : `Imagem ${index + 1}`} value={url} onChange={value => patch({ images: product.images.map((image, imageIndex) => imageIndex === index ? value : image) })} onBusy={onUpload} /><div className="admin-row-actions"><button className="admin-icon-button" disabled={index === 0} aria-label={`Mover imagem ${index + 1} para cima`} onClick={() => moveImage(index, -1)}><ArrowUp size={16} /></button><button className="admin-icon-button" disabled={index === product.images.length - 1} aria-label={`Mover imagem ${index + 1} para baixo`} onClick={() => moveImage(index, 1)}><ArrowDown size={16} /></button><button className="admin-icon-button admin-danger" aria-label={`Remover imagem ${index + 1}`} onClick={() => patch({ images: product.images.filter((_, imageIndex) => imageIndex !== index) })}><Trash2 size={16} /></button></div></div>)}</div>
        {!product.images.length && <div className="admin-image-empty"><ImagePlus size={26} /><p>Adicione fotos para apresentar sua peça.</p></div>}
      </section>
      <section className="admin-card admin-form-card admin-product-variants"><div className="admin-card-heading"><div><h3>Tamanhos, cores e estoque</h3><p className="admin-card-description">Uma linha para cada combinação disponível.</p></div><button className="admin-button admin-button-small" data-admin-field={path('variants')} aria-invalid={!!variantsError || undefined} aria-describedby={variantsError ? 'admin-variants-error' : undefined} disabled={product.variants.length >= 100} onClick={() => patch({ variants: [...product.variants, { id: crypto.randomUUID(), size: '', color: '', colorHex: '#D9D3C5', stock: 0 }] })}><Plus size={16} />Variação</button></div>
        {variantsError && <p className="admin-inline-error" id="admin-variants-error">{variantsError}</p>}
        <div className="admin-variants">{product.variants.map((item, index) => <div className="admin-variant" key={item.id}>
          <Field label="Tamanho" path={path(`variant.${item.id}.size`)}><input value={item.size} placeholder="P, M, G…" aria-label={`Tamanho da variação ${index + 1}`} onChange={event => variant(item.id, { size: event.target.value })} /></Field>
          <Field label="Nome da cor" path={path(`variant.${item.id}.color`)}><input value={item.color} placeholder="Areia" aria-label={`Nome da cor da variação ${index + 1}`} onChange={event => variant(item.id, { color: event.target.value })} /></Field>
          <Field label="Cor" path={path(`variant.${item.id}.colorHex`)}><input className="admin-variant-color" type="color" value={item.colorHex} aria-label={`Cor da variação ${index + 1}`} onChange={event => variant(item.id, { colorHex: event.target.value })} /></Field>
          <Field label="Estoque" path={path(`variant.${item.id}.stock`)}><input type="number" min="0" step="1" value={item.stock} aria-label={`Estoque da variação ${index + 1}`} onChange={event => variant(item.id, { stock: Number(event.target.value) })} /></Field>
          <button className="admin-icon-button admin-danger" onClick={() => patch({ variants: product.variants.filter(variant => variant.id !== item.id) })} aria-label={`Remover variação ${index + 1}`}><Trash2 size={16} /></button>
        </div>)}</div>{!product.variants.length && !variantsError && <p className="admin-inline-error">Adicione pelo menos uma variação para publicar esta peça.</p>}
      </section>
    </div>
  </>;
}
