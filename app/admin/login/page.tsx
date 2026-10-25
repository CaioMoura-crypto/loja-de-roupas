import { redirect } from 'next/navigation';
import { authConfigured, isAdmin } from '@/lib/auth';
import { getContent } from '@/lib/content';
import LoginForm from '@/components/admin/LoginForm';
import '../admin.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar — CRIATIVA', robots: { index: false, follow: false } };
export default async function Login() {
  if (await isAdmin()) redirect('/admin');
  return <LoginForm configured={authConfigured()} brandName={(await getContent()).settings.brandName} />;
}
