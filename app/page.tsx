import Storefront from '@/components/Storefront';
import { getContent, publicContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function generateMetadata() {
  const { settings } = await getContent();
  return { title: `${settings.brandName} — ${settings.tagline}`, description: settings.heroDescription };
}
export default async function Home() { return <Storefront content={publicContent(await getContent())} />; }
