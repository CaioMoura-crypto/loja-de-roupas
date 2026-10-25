export function mapCenterCoordinates(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 100) return null;
  const match = value.trim().match(/^([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return `${latitude},${longitude}`;
}
