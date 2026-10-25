import { randomBytes } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
const target = new URL('../.env.local', import.meta.url);
try { await access(target); console.log('.env.local já existe; nenhuma credencial foi alterada.'); }
catch {
  const password = randomBytes(18).toString('base64url');
  await writeFile(target, `ADMIN_USERNAME=admin\nADMIN_PASSWORD=${password}\nADMIN_SESSION_SECRET=${randomBytes(48).toString('hex')}\nAPP_ORIGIN=http://127.0.0.1:3010\nSTORAGE_DRIVER=local\nDATA_DIR=./data\n`, { mode: 0o600, flag: 'wx' });
  console.log('Configuração local criada. Usuário: admin. A senha está em ADMIN_PASSWORD no arquivo .env.local.');
}
