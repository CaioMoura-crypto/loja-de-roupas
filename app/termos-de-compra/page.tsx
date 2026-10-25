import type { Metadata } from 'next';
import StorePolicyPage from '@/components/StorePolicyPage';
import { getContent } from '@/lib/content';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { title: `Condições de compra — ${settings.brandName}` };
}
export default async function PurchaseTermsPage() {
  const { settings } = await getContent();
  return <StorePolicyPage settings={settings} title="Condições de compra" policy="purchaseTerms"/>;
}
