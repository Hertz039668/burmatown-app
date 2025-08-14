// Minimal API client to optionally use a backend, falling back gracefully on errors.
// Made mutable so tests can override.
import { instrumentedFetch } from './observability';
import { scrubObject } from './security';
export let API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
export function __setApiUrl(url: string | undefined) { API_URL = url; }

// Simple auth token accessor (reads latest session from localStorage on each call to avoid stale closure)
function getAuthToken(): string | undefined {
  try { const raw = localStorage.getItem('bt_session'); if(!raw) return; const s = JSON.parse(raw); return s?.token; } catch { return; }
}

let refreshing = false;
async function attemptRefresh(): Promise<boolean> {
  if(refreshing) return false; // avoid parallel refresh storms
  refreshing = true;
  try {
    // Placeholder: call /auth/refresh if backend supports
    const token = getAuthToken(); if(!token) return false;
    const res = await instrumentedFetch(`${API_URL}/auth/refresh`, { method:'POST', headers:{ 'Authorization': `Bearer ${token}` } });
    if(!res.ok) return false;
    const body: any = await res.json().catch(()=>null);
    if(body?.token) {
      try { const sessRaw = localStorage.getItem('bt_session'); if(sessRaw){ const sess = JSON.parse(sessRaw); sess.token = body.token; localStorage.setItem('bt_session', JSON.stringify(sess)); } } catch {}
      return true;
    }
    return false;
  } catch { return false; }
  finally { refreshing = false; }
}

async function http<T>(path: string, init?: RequestInit, retry=true): Promise<T> {
  if (!API_URL) throw new Error('No API_URL');
  const token = getAuthToken();
  const res = await instrumentedFetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
    ...init,
  });
  if (res.status === 401 && token && retry) {
    const refreshed = await attemptRefresh();
    if(refreshed) return http<T>(path, init, false);
    // dispatch sign-out event
    try { window.dispatchEvent(new CustomEvent('bt_auth_expired')); } catch {}
  }
  if (!res.ok) {
  let errDetail: any = null; try { errDetail = await res.json(); } catch {}
  errDetail = scrubObject(errDetail);
  const e: any = new Error(errDetail?.error?.message || `${res.status} ${res.statusText}`);
  (e as any).code = errDetail?.error?.code || res.status;
  (e as any).details = errDetail?.error || errDetail;
    throw e;
  }
  try { return (await res.json()) as T; } catch { return undefined as unknown as T; }
}

// Posts
export type ApiPost = {
  id: string;
  title: string;
  body: string;
  media?: string[];
  price?: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorType?: string;
  createdAt: number;
  // Optional server-provided engagement counts (hydration)
  stars?: number;
  reports?: number;
  commentsCount?: number;
  answersCount?: number; // for symmetry if server returns
  userStarred?: boolean; userReported?: boolean;
};

export const fetchPostsApi = async (): Promise<ApiPost[]> => {
  try {
    return await http<ApiPost[]>(`/posts`);
  } catch {
    return [];
  }
};

export const createPostApi = async (post: Partial<ApiPost>): Promise<ApiPost | null> => {
  try {
    return await http<ApiPost>(`/posts`, { method: 'POST', body: JSON.stringify(post) });
  } catch {
    return null;
  }
};

// Questions
export type ApiQuestion = {
  id: string;
  title: string;
  details?: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  createdAt: number;
  // Optional server-provided engagement counts
  stars?: number; reports?: number; useful?: number; answersCount?: number;
  userStarred?: boolean; userReported?: boolean; usefulByUser?: boolean;
};
// Auth endpoints (prototype)
export interface AuthResponse { email: string; name?: string; token: string; type?: string; }
export const signInApi = async (email: string, password: string): Promise<AuthResponse | null> => {
  try { return await http<AuthResponse>(`/auth/signin`, { method:'POST', body: JSON.stringify({ email, password }) }); } catch { return null; }
};
export const signUpApi = async (payload: { email: string; password: string; name?: string; type?: string }): Promise<AuthResponse | null> => {
  try { return await http<AuthResponse>(`/auth/signup`, { method:'POST', body: JSON.stringify(payload) }); } catch { return null; }
};

export const fetchQuestionsApi = async (): Promise<ApiQuestion[]> => {
  try {
    return await http<ApiQuestion[]>(`/questions`);
  } catch {
    return [];
  }
};

export const createQuestionApi = async (q: Partial<ApiQuestion>): Promise<ApiQuestion | null> => {
  try {
    return await http<ApiQuestion>(`/questions`, { method: 'POST', body: JSON.stringify(q) });
  } catch {
    return null;
  }
};

// --- Extended endpoints (prototype assumptions) ---
// Comments
export type ApiComment = {
  id: string; text: string; postId: string; author: string; authorEmail?: string; authorAvatar?: string; createdAt: number;
};
export const createCommentApi = async (postId: string, payload: Partial<ApiComment>): Promise<ApiComment | null> => {
  try { return await http<ApiComment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(payload) }); } catch { return null; }
};

// Comment reply
export type ApiReply = { id: string; text: string; postId?: string; commentId?: string; author: string; authorEmail?: string; authorAvatar?: string; createdAt: number };
export const createReplyApi = async (postId: string, commentId: string, payload: Partial<ApiReply>): Promise<ApiReply | null> => {
  try { return await http<ApiReply>(`/posts/${postId}/comments/${commentId}/replies`, { method: 'POST', body: JSON.stringify(payload) }); } catch { return null; }
};

// Answers
export type ApiAnswer = { id: string; text: string; questionId: string; author: string; authorEmail?: string; authorAvatar?: string; createdAt: number };
// Extended potential answer engagement flags (optional server support)
export interface ApiAnswerExtended extends ApiAnswer { stars?: number; reports?: number; useful?: number; usefulByUser?: boolean; }
export const createAnswerApi = async (questionId: string, payload: Partial<ApiAnswer>): Promise<ApiAnswer | null> => {
  try { return await http<ApiAnswer>(`/questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify(payload) }); } catch { return null; }
};

// Follow / Unfollow (assumed simple endpoints)
export const followUserApi = async (targetEmail: string): Promise<{ ok: true } | null> => {
  try { return await http<{ ok: true }>(`/follow/${encodeURIComponent(targetEmail)}`, { method: 'POST' }); } catch { return null; }
};
export const unfollowUserApi = async (targetEmail: string): Promise<{ ok: true } | null> => {
  try { return await http<{ ok: true }>(`/follow/${encodeURIComponent(targetEmail)}`, { method: 'DELETE' }); } catch { return null; }
};

// Generic engagement endpoint (prototype) to persist star/report/useful toggles.
export interface EngagementPayload { kind: 'star'|'report'|'useful'; entityType: string; entityId: string; added: boolean; parentId?: string; extra?: any; }
export const sendEngagementApi = async (payload: EngagementPayload): Promise<{ ok: true } | null> => {
  try { return await http<{ ok: true }>(`/engagement`, { method: 'POST', body: JSON.stringify(payload) }); } catch { return null; }
};
// Batch endpoint (optional). If server lacks this route it will fail fast and caller can fallback.
export const sendEngagementBatchApi = async (batch: EngagementPayload[]): Promise<{ ok: true } | null> => {
  try { return await http<{ ok: true }>(`/engagement/batch`, { method:'POST', body: JSON.stringify(batch) }); } catch { return null; }
};
