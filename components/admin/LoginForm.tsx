'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';

export default function LoginForm({ configured, brandName = 'CRIATIVA' }: { configured: boolean; brandName?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar. Confira seus dados.');
      window.location.assign('/admin');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.'); setBusy(false); }
  }
  return <main className="admin-login">
    <div className="admin-login-story"><a href="/" className="admin-login-brand">{brandName}<span>PAINEL DA LOJA</span></a><div><span className="admin-kicker">POR TRÁS DE CADA ESCOLHA</span><h1>O seu olhar.<br /><em>A sua loja.</em></h1><p>Um espaço para cuidar da coleção, dos detalhes e de quem compra com você.</p></div><span className="admin-login-caption">Uma boa experiência começa nos detalhes.</span></div>
    <section className="admin-login-form"><div className="admin-login-icon"><LockKeyhole size={22} /></div><span className="admin-kicker">BEM-VINDA DE VOLTA</span><h2>Vamos cuidar da loja?</h2><p>Entre para gerenciar produtos, categorias e o visual do site.</p>
      {!configured ? <div className="admin-alert admin-alert-error" role="status"><strong>Configure o primeiro acesso</strong><p>As credenciais do painel ainda não foram configuradas. No projeto, execute <code>pnpm run setup</code> e reinicie o servidor para ativar o acesso.</p></div> : <form onSubmit={submit}>
        <label className="admin-field"><span>Usuário</span><input name="username" autoComplete="username" required autoFocus disabled={busy} /></label>
        <label className="admin-field"><span>Senha</span><span className="admin-password"><input name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required disabled={busy} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
        <button className="admin-button admin-button-primary admin-login-submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar no painel'}<ArrowRight size={18} /></button>
      </form>}
      <a className="admin-back-link" href="/">← Voltar para a loja</a>
    </section>
  </main>;
}
