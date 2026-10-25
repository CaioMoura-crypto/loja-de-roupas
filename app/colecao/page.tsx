import type { Metadata } from 'next';
import Storefront from '@/components/Storefront';
import { getContent, publicContent } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    title: `A coleção — ${settings.brandName}`,
    description: `Explore a coleção de ${settings.brandName} e encontre suas peças por categoria.`,
  };
}

export default async function CollectionPage() {
  return <Storefront content={publicContent(await getContent())} view="collection" />;
}
