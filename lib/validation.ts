// Phase B: Client-side validation & lightweight moderation heuristics.
// Provides synchronous validators returning structured error info.

export interface ValidationResult { ok: boolean; errors: string[]; }

function limit(str: string | undefined | null, max: number): boolean { return !!str && str.length <= max; }
function min(str: string | undefined | null, minLen: number): boolean { return !!str && str.trim().length >= minLen; }

// Basic content rules (can be evolved or server-aligned later)
export const limits = {
  post: { titleMax: 120, bodyMax: 4000, bodyMin: 1 },
  question: { titleMax: 120, detailsMax: 5000, titleMin: 3 },
  comment: { textMax: 1000, textMin: 1 },
  answer: { textMax: 4000, textMin: 1 },
};

export function validatePost(input: { title: string; body: string }): ValidationResult {
  const errors: string[] = [];
  if(!min(input.title, 1)) errors.push('Title is required');
  else if(!limit(input.title, limits.post.titleMax)) errors.push(`Title too long (> ${limits.post.titleMax} chars)`);
  if(!min(input.body, limits.post.bodyMin)) errors.push('Body is required');
  else if(!limit(input.body, limits.post.bodyMax)) errors.push(`Body too long (> ${limits.post.bodyMax} chars)`);
  return { ok: errors.length===0, errors };
}

export function validateQuestion(input: { title: string; details?: string }): ValidationResult {
  const errors: string[] = [];
  if(!min(input.title, limits.question.titleMin)) errors.push(`Title must be at least ${limits.question.titleMin} chars`);
  else if(!limit(input.title, limits.question.titleMax)) errors.push(`Title too long (> ${limits.question.titleMax} chars)`);
  if(input.details && !limit(input.details, limits.question.detailsMax)) errors.push(`Details too long (> ${limits.question.detailsMax} chars)`);
  return { ok: errors.length===0, errors };
}

export function validateComment(input: { text: string }): ValidationResult {
  const errors: string[] = [];
  if(!min(input.text, limits.comment.textMin)) errors.push('Comment text required');
  else if(!limit(input.text, limits.comment.textMax)) errors.push(`Comment too long (> ${limits.comment.textMax} chars)`);
  return { ok: errors.length===0, errors };
}

export function validateAnswer(input: { text: string }): ValidationResult {
  const errors: string[] = [];
  if(!min(input.text, limits.answer.textMin)) errors.push('Answer text required');
  else if(!limit(input.text, limits.answer.textMax)) errors.push(`Answer too long (> ${limits.answer.textMax} chars)`);
  return { ok: errors.length===0, errors };
}

// --- Moderation (client heuristic) ---

// Simple banned token list (case-insensitive). Placeholder; real list should come from server / config.
export const bannedWords = ['badword', 'offensive'];

export interface ModerationResult { flagged: boolean; reasons: string[]; }
export function moderateText(text: string | undefined | null): ModerationResult {
  if(!text) return { flagged: false, reasons: [] };
  const lower = text.toLowerCase();
  const hits = bannedWords.filter(w => lower.includes(w));
  if(hits.length) return { flagged: true, reasons: hits.map(h=>`Contains banned word: ${h}`) };
  return { flagged: false, reasons: [] };
}

export function attachModeration<T extends { flagged?: boolean; moderationReasons?: string[]; body?: string; text?: string; title?: string }>(obj: T): T {
  const base = obj.body || obj.text || obj.title || '';
  const mod = moderateText(base);
  if(mod.flagged) {
    return { ...obj, flagged: true, moderationReasons: mod.reasons };
  }
  return obj;
}

// Utility to surface first error message (can be swapped for form-level rendering later)
export function firstError(result: ValidationResult): string | undefined {
  return result.errors[0];
}
