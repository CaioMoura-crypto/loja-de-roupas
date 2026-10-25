import { HttpError } from './http';
export function inspectImage(data: Buffer) {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { ext: 'png', type: 'image/png' };
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  if (data.length >= 16 && data.toString('ascii', 4, 8) === 'ftyp' && ['avif','avis'].includes(data.toString('ascii', 8, 12))) return { ext: 'avif', type: 'image/avif' };
  throw new HttpError(400, 'Envie uma imagem JPG, PNG, WebP ou AVIF válida (até 10 MB).');
}
