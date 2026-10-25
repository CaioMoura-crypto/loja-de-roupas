import type { Metadata } from 'next';
import DemoCheckout from '@/components/DemoCheckout';
import { getContent, publicContent } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return {
    title: `Finalizar compra — ${settings.brandName}`,
    description: 'Experimente a finalização demonstrativa por Pix ou cartão. Nenhuma cobrança é realizada.',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage() {
  return <DemoCheckout content={publicContent(await getContent())} />;
}
