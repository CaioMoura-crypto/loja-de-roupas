import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getContent } from '@/lib/content';
import AdminPanel from '@/components/admin/AdminPanel';
import './admin.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administração — CRIATIVA', robots: { index: false, follow: false } };
export default async function Admin() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <AdminPanel initialContent={await getContent()} />;
}
