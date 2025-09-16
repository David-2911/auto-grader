export interface DecodedJwt {
  exp?: number;
  iat?: number;
  [key: string]: any; // other claims
}

function base64UrlDecode(str: string): string {
  try {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const base64 = (str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    if (typeof atob !== 'undefined') return atob(base64);
    return Buffer.from(base64, 'base64').toString('binary');
  } catch {
    return '';
  }
}

export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = base64UrlDecode(parts[1]);
    if (!payload) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
