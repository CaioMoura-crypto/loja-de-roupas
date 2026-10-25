'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main style={{ padding: '12vh 8vw', fontFamily: 'sans-serif' }}><h1>Não conseguimos carregar a loja.</h1><p>Uma falha temporária impediu a leitura do catálogo. Tente novamente.</p><button onClick={reset}>Tentar novamente</button></main>;
}
