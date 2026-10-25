import type { Metadata } from 'next';
import StorePolicyPage from '@/components/StorePolicyPage';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { title: `Trocas e devoluções — ${settings.brandName}` };
}
export default async function ReturnsPolicyPage() {
  const { settings } = await getContent();
  return <StorePolicyPage settings={settings} title="Trocas e devoluções" policy="returnsPolicy"/>;
}
