'use client';

import { Children, cloneElement, isValidElement, useContext, useId, useState, type ReactNode } from 'react';
import { ImageOff, ImagePlus, LoaderCircle, RefreshCw, Upload } from 'lucide-react';
import { AdminValidationContext } from './AdminValidation';

type FieldChildProps = { children?: ReactNode; type?: string; id?: string; 'data-admin-field'?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };

export function Field({ label, children, hint, wide = false, path }: { label: string; children: ReactNode; hint?: string; wide?: boolean; path?: string }) {
  const id = useId();
  const issue = useContext(AdminValidationContext);
  const error = path && issue?.field === path ? issue.message : '';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  let controlIndex = 0;
  function decorate(nodes: ReactNode): ReactNode {
    return Children.map(nodes, child => {
      if (!isValidElement<FieldChildProps>(child) || typeof child.type !== 'string') return child;
      if (['input', 'select', 'textarea'].includes(child.type)) {
        const first = controlIndex++ === 0;
        return cloneElement(child, { id: child.props.id || (first ? id : `${id}-${controlIndex}`), 'data-admin-field': path, 'aria-invalid': !!error || undefined, 'aria-describedby': [child.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined });
      }
      return child.props.children ? cloneElement(child, { children: decorate(child.props.children) }) : child;
    });
  }
  return <div className={`admin-field${wide ? ' admin-field-wide' : ''}`}><label htmlFor={id}>{label}</label>{decorate(children)}{hint && <small id={`${id}-hint`}>{hint}</small>}{error && <p className="admin-inline-error" id={`${id}-error`}>{error}</p>}</div>;
}

export function ProductThumbnail({ src }: { src?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <div className="admin-product-thumb">{src && failedSource !== src ? <img src={src} alt="" onError={() => setFailedSource(src)} /> : src ? <ImageOff size={20} aria-label="Imagem indisponível" role="img" /> : <ImagePlus size={20} aria-label="Sem imagem" role="img" />}</div>;
}

function ImagePreview({ value, label }: { value: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <><div className="admin-image-preview">{value && !failed ? <img key={attempt} src={value} alt={`Prévia: ${label}`} onError={() => setFailed(true)} /> : failed ? <ImageOff size={25} aria-hidden="true" /> : <ImagePlus size={25} aria-hidden="true" />}</div>{failed && <div className="admin-image-error" role="status"><p>Não foi possível carregar a imagem. Confira a URL ou envie outra foto.</p><button className="admin-text-button" type="button" onClick={() => { setFailed(false); setAttempt(current => current + 1); }}><RefreshCw size={16} />Tentar novamente</button></div>}</>;
}

export function ImageField({ label, value, onChange, onBusy, path }: { label: string; value: string; onChange: (url: string) => void; onBusy: (busy: boolean) => void; path?: string }) {
  const id = useId();
  const issue = useContext(AdminValidationContext);
  const validationError = path && issue?.field === path ? issue.message : '';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastFile, setLastFile] = useState<File | null>(null);
  async function upload(file?: File) {
    if (!file) return;
    setLastFile(file); setError(''); setUploading(true); onBusy(true);
    try {
      const body = new FormData(); body.set('file', file);
      const response = await fetch('/api/admin/media', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a imagem.');
      onChange(data.url); setLastFile(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao enviar imagem.'); }
    finally { setUploading(false); onBusy(false); }
  }
  return <div className="admin-image-field"><label htmlFor={id}>{label}</label><div className="admin-image-row"><div className="admin-image-preview-group"><ImagePreview key={value} value={value} label={label} /></div><div className="admin-image-controls"><input id={id} data-admin-field={path} aria-invalid={!!validationError || undefined} aria-describedby={`${id}-hint${validationError ? ` ${id}-validation` : ''}`} value={value} onChange={event => onChange(event.target.value)} placeholder="https://… ou /images/…" /><label className="admin-button admin-button-small admin-upload">{uploading ? <LoaderCircle size={15} className="admin-spin" /> : <Upload size={15} />}{uploading ? 'Enviando…' : 'Enviar imagem'}<input aria-label={`Enviar ${label.toLocaleLowerCase('pt-BR')}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label><small id={`${id}-hint`}>JPG, PNG, WebP ou AVIF. Ou cole uma URL.</small></div></div>{validationError && <p className="admin-inline-error" id={`${id}-validation`}>{validationError}</p>}{error && <div className="admin-inline-error" role="alert"><p>{error}</p>{lastFile && <button className="admin-text-button" onClick={() => void upload(lastFile)} disabled={uploading}>Tentar enviar novamente</button>}</div>}</div>;
}
