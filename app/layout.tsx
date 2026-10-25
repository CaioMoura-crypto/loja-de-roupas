import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CRIATIVA — Loja de Roupas', description: 'Moda feminina para combinar do seu jeito. Descubra vestidos, conjuntos, calças e novas combinações.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
