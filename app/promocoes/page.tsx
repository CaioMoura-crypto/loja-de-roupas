import type { Metadata } from 'next';
import Storefront from '@/components/Storefront';
import { getContent, publicContent } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    title: `Promoções — ${settings.brandName}`,
    description: `Veja as peças com preço reduzido na coleção de ${settings.brandName}.`,
  };
}

export default async function PromotionsPage() {
  return <Storefront content={publicContent(await getContent())} view="collection" promotionsOnly />;
}
