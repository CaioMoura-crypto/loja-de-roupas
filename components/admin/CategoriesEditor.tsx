'use client';

import { ArrowDown, ArrowUp, Plus, Tags, Trash2 } from 'lucide-react';
import type { Category, Product } from '@/lib/types';
import { slugify } from '@/lib/format';
import { Field, ImageField } from './AdminFields';

export default function CategoriesEditor({ categories, products, patch, add, remove, move, onUpload }: { categories: Category[]; products: Product[]; patch: (id: string, changes: Partial<Category>) => void; add: () => void; remove: (category: Category) => void; move: (index: number, direction: number) => void; onUpload: (busy: boolean) => void }) {
  return <><div className="admin-section-heading"><div><h2>Uma coleção bem organizada.</h2><p>Separe as peças por categoria e escolha a ordem em que aparecem na loja.</p></div><button className="admin-button admin-button-primary" onClick={add}><Plus size={18} />Nova categoria</button></div><div className="admin-category-list">{categories.map((category, index) => <section className="admin-card admin-category-card" key={category.id}>
    <div className="admin-category-title"><span className="admin-category-number">{String(index + 1).padStart(2, '0')}</span><h3>{category.name}</h3><span className="admin-category-count">{products.filter(product => product.categoryId === category.id).length} peças</span><div className="admin-row-actions"><button className="admin-icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover ${category.name} para cima`}><ArrowUp size={17} /></button><button className="admin-icon-button" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Mover ${category.name} para baixo`}><ArrowDown size={17} /></button><button className="admin-icon-button admin-danger" onClick={() => remove(category)} aria-label={`Excluir ${category.name}`}><Trash2 size={17} /></button></div></div>
    <div className="admin-category-body"><div className="admin-form-grid">
      <Field path={`category.${category.id}.name`} label="Nome"><input value={category.name} onChange={event => patch(category.id, { name: event.target.value })} /></Field>
      <Field path={`category.${category.id}.slug`} label="Endereço" hint="Use letras minúsculas e hífens, sem espaços."><input value={category.slug} onChange={event => patch(category.id, { slug: slugify(event.target.value) })} /></Field>
      <Field path={`category.${category.id}.description`} label="Descrição" wide><textarea rows={2} value={category.description} onChange={event => patch(category.id, { description: event.target.value })} /></Field>
      <label className="admin-check"><input type="checkbox" checked={category.visible} onChange={event => patch(category.id, { visible: event.target.checked })} /><span>Exibir categoria na loja</span></label>
    </div><ImageField path={`category.${category.id}.image`} label="Imagem da categoria" value={category.image} onChange={image => patch(category.id, { image })} onBusy={onUpload} /></div>
  </section>)}</div>{!categories.length && <div className="admin-empty admin-card"><Tags size={30} /><h3>Vamos organizar sua coleção</h3><p>Crie categorias como vestidos, blusas, calças e conjuntos.</p></div>}</>;
}
