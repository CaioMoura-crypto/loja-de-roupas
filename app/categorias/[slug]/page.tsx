import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Storefront from '@/components/Storefront';
import { getContent, publicContent } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CategoryPageProps = { params: Promise<{ slug: string }> };

async function getCategoryContent(slug: string) {
  const content = publicContent(await getContent());
  const category = content.categories.find(item => item.slug === slug);
  if (!category) notFound();
  return { content, category };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { content, category } = await getCategoryContent(slug);
  return {
    title: `${category.name} — ${content.settings.brandName}`,
    description: category.description || `Explore ${category.name.toLowerCase()} na coleção de ${content.settings.brandName}.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const { content, category } = await getCategoryContent(slug);
  return <Storefront key={category.id} content={content} view="collection" initialCategory={category.id} />;
}
