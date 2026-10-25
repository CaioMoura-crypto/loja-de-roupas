import { DEFAULT_CONTENT } from './default-content';
import type { SiteContent } from './types';
import { validateContent } from './validation';
import { readObject, writeObject, serialized } from './storage';
import { HttpError } from './http';
export async function getContent(): Promise<SiteContent> {
  const stored = await readObject('content.json');
  return stored ? validateContent(JSON.parse(stored.data.toString('utf8'))) : structuredClone(DEFAULT_CONTENT);
}
export async function saveContent(input: unknown): Promise<SiteContent> {
  const content = validateContent(input);
  return serialized('content', async () => {
    const existing = await readObject('content.json');
    const current = existing ? validateContent(JSON.parse(existing.data.toString('utf8'))) : DEFAULT_CONTENT;
    if (current.revision !== content.revision) throw new HttpError(409, 'Outra edição foi salva. Copie suas alterações e recarregue antes de tentar novamente.');
    content.revision++;
    await writeObject('content.json', JSON.stringify(content, null, 2), 'application/json', existing ? { etag: existing.etag } : { create: true });
    return content;
  });
}
export function publicContent(content: SiteContent): SiteContent {
  const categories = content.categories.filter(c => c.visible);
  return { ...content, categories, products: content.products.filter(p => p.active && categories.some(c => c.id === p.categoryId)) };
}
