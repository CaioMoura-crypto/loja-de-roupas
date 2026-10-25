import type { Metadata } from 'next';
import StorePolicyPage from '@/components/StorePolicyPage';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { title: `Privacidade — ${settings.brandName}` };
}
export default async function PrivacyPage() {
  const { settings } = await getContent();
  return <StorePolicyPage settings={settings} title="Privacidade" policy="privacyPolicy"/>;
}
