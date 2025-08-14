// Security & robustness utilities (Phase G)
// NOTE: These are lightweight client-side guards; server-side validation & sanitization still required.

// Basic HTML sanitizer (very conservative):
// - Removes <script> blocks
// - Strips on* event handler attributes
// - Optionally truncates overly long strings
const SCRIPT_RE = /<script[^>]*>[\s\S]*?<\/script>/gi;
const ONEVENT_ATTR_RE = /on[a-z]+\s*=\s*"[^"]*"/gi;
export function sanitizeHtml(input: string, maxLen = 8000): string {
  if(!input) return '';
  let out = input.replace(SCRIPT_RE, '');
  out = out.replace(ONEVENT_ATTR_RE, '');
  if(out.length > maxLen) out = out.slice(0, maxLen);
  return out;
}

// Escape HTML entities (for situations where raw insertion might occur)
export function escapeHtml(input: string): string {
  return input.replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
}

// Scrub potentially sensitive fields from error payloads before logging / emitting.
const SENSITIVE_KEYS = ['password', 'token', 'authorization'];
export function scrubObject(obj: any): any {
  if(!obj || typeof obj !== 'object') return obj;
  if(Array.isArray(obj)) return obj.map(scrubObject);
  const clone: any = {};
  for(const [k,v] of Object.entries(obj)) {
    if(SENSITIVE_KEYS.includes(k.toLowerCase())) { clone[k] = '[REDACTED]'; continue; }
    clone[k] = (typeof v === 'object' && v !== null) ? scrubObject(v) : v;
  }
  return clone;
}

// Simple rate limiter / backoff tracker.
export class BackoffController {
  private attempt = 0;
  constructor(private baseMs=500, private maxMs=5000) {}
  reset(){ this.attempt=0; }
  nextDelay(){ const d = Math.min(this.maxMs, this.baseMs * Math.pow(2, this.attempt++)) * (0.75 + Math.random()*0.5); return Math.round(d); }
}
