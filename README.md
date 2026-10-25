# Loja de Roupas

Loja feminina independente criada em `/home/caio/Projects/loja-de-roupas`. A marca **CRIATIVA** é editável pelo painel. O grupoFood foi usado como referência de arquitetura, sem reutilizar credenciais, dados ou identidade visual.

## Rodar localmente

Requer Node.js >=20.9 e pnpm 10.17.1.

```bash
cd /home/caio/Projects/loja-de-roupas
pnpm install --frozen-lockfile
pnpm run setup
pnpm dev
```

Abra http://127.0.0.1:3010 e http://127.0.0.1:3010/admin. Use **admin** e a senha gerada no campo `ADMIN_PASSWORD` de `.env.local`. `pnpm run setup` preserva configurações existentes. O arquivo é privado, ignorado pelo Git e criado com permissão 0600. Use `pnpm run setup`, pois `pnpm setup` é um comando interno do gerenciador.

## O que está pronto

- Vitrine responsiva, seis categorias iniciais, busca, ordenação, favoritos, detalhes e galeria de produtos.
- Preços em reais, preço anterior, descrições, detalhes, composição, cuidados, variações de tamanho/cor e estoque por variação.
- Sacola persistente, quantidades limitadas ao estoque e a 20 unidades por variação.
- Solicitações de pedido registradas no backend, com cálculo de preço no servidor e proteção de repetição por idempotência.
- Painel `/admin`: produtos, categorias e ordem/visibilidade, fotos por upload ou URL, conteúdo principal, editorial, textos de envio/troca, contatos, cores e acompanhamento de solicitações.
- Animações 2D, entrada gradual, hover de fotos e perspectiva CSS 3D que responde ao mouse. Respeita a preferência de movimento reduzido; não depende de WebGL.
- Tipografia e fotos incluídas localmente para evitar dependência de serviços externos na renderização padrão.

## Editar

Entre no painel, altere os campos e use **Salvar alterações**. As alterações aparecem nas próximas visitas ou ao atualizar a vitrine. Produtos e categorias podem ficar ocultos. Produtos publicados precisam de preço positivo, imagem e variação. Rascunhos aceitam preço zero.

O painel impede excluir categorias vinculadas a produtos. O salvamento detecta revisões concorrentes; se outra sessão salvar primeiro, suas alterações permanecem na tela e podem ser exportadas antes de recarregar. Um upload é persistido antes de salvar o conteúdo; mídias sem uso não são removidas automaticamente.

## Pedidos nesta primeira versão

O checkout é uma **solicitação de atendimento**, não uma cobrança. Não há gateway, Pix automático, cálculo automático de frete, e-mail/SMS de confirmação, rastreio ou reserva/desconto automático de estoque. A equipe confirma disponibilidade, frete e forma de pagamento e ajusta o estoque pelo painel. Os status são pendente, em atendimento, concluído e cancelado.

Configure WhatsApp com país e DDD em Aparência e conteúdo. Quando houver número, a confirmação oferece um link para o cliente iniciar a conversa; o site não envia mensagens automaticamente. O painel recebe solicitações mesmo sem WhatsApp configurado. Contatos começam vazios para evitar informações inventadas.

**Catálogo, preços, tecidos e estoques são demonstrativos; as fotografias são ilustrativas.** Substitua pelo catálogo real antes de vender. O aviso demonstrativo fica no rodapé; retire-o do componente `components/Storefront.tsx` quando a loja real estiver configurada.

## Arquitetura

Next.js App Router, React e TypeScript, no mesmo modelo de aplicação e APIs do grupoFood. Versões fixadas e lockfile incluído. CSS próprio, ícones Lucide. Sem necessidade de banco externo para uso local.

- `lib/types.ts`: contratos de catálogo e pedidos.
- `lib/default-content.ts`: catálogo inicial (usado enquanto não houver conteúdo salvo).
- `lib/content.ts`, `lib/validation.ts`: CMS, validação e revisões.
- `lib/storage.ts`: persistência atômica local e adaptador S3/MinIO.
- `lib/orders.ts`: valores calculados no servidor, snapshots e idempotência.
- `lib/auth.ts`, `lib/http.ts`: cookie HttpOnly assinado, expiração, origem, limites e erros.
- `app/api/admin/*`: APIs autenticadas de conteúdo, mídia, sessão e pedidos.
- `components/Storefront.tsx` e `components/admin/*`: interfaces.

### Armazenamento

Por padrão, `data/content.json`, `data/orders/*.json` e `data/media/*`. Dados e imagens enviados ficam fora de `public` e são ignorados pelo Git. Faça backup da pasta `data` e do `.env.local`. Reiniciar não apaga o conteúdo. Não use sistema de arquivos efêmero para esse modo.

O driver local exige **uma instância/processo** e volume persistente. Para S3/MinIO, configure as variáveis `S3_*` da `.env.example` e `STORAGE_DRIVER=s3`. O prefixo padrão é `loja-de-roupas/`; mantenha bucket/prefixo separados de grupoFood. O provedor deve suportar gravação condicional `If-Match`/`If-None-Match`. O adaptador foi implementado; a integração com um bucket real ainda depende das suas credenciais e não foi testada.

### Publicação

```bash
pnpm build
pnpm start
```

`start` escuta apenas em `127.0.0.1:3010`, para uso atrás de proxy HTTPS. Configure `APP_ORIGIN` com a URL pública exata e credenciais próprias. Cookie de administrador é Secure em produção. Só ative `TRUST_PROXY=true` quando um proxy confiável sobrescrever `x-forwarded-for`; sem isso, os limites em memória são compartilhados por ação entre visitantes. Para múltiplas instâncias, use limite distribuído no proxy/plataforma. Acesso público à vitrine não exige login.

Não foi criado deploy, domínio, conta de pagamento ou integração externa. As próximas decisões naturais são fotos/catálogo reais, contato comercial, regras de entrega e gateway.

## Verificação

```bash
pnpm typecheck
pnpm build
```

Os testes de integração fazem mutações. Execute apenas contra um servidor separado e armazenamento temporário, com **APP_ORIGIN igual à URL de teste**. Exemplo após compilar:

```bash
TEST_SHOP_DATA=$(mktemp -d /tmp/loja-roupas-test.XXXXXX)
APP_ORIGIN=http://127.0.0.1:3012 DATA_DIR="$TEST_SHOP_DATA" STORAGE_DRIVER=local \
  node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3012
```

Em outro terminal:

```bash
TEST_ALLOW_MUTATIONS=true BASE_URL=http://127.0.0.1:3012 pnpm test
```

Os testes verificam autenticação/origem, upload, persistência e revisão, visibilidade, cálculo de preço, estoque, pedidos idempotentes e status. O conteúdo anterior é restaurado; uploads e pedidos de teste ficam exclusivamente no diretório temporário.

## Créditos

Fotografias ilustrativas: [Unsplash](https://unsplash.com/license); IDs de origem preservados nos nomes `public/images/photo-*.jpg` e em `lib/default-content.ts`. Fontes Bodoni Moda e DM Sans: [Google Fonts](https://fonts.google.com/), licenças OFL incluídas em `public/fonts/`. Ícones Lucide (licença ISC). Referências técnicas: [cookies do Next.js](https://nextjs.org/docs/app/api-reference/functions/cookies) e [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
# loja-de-roupas
