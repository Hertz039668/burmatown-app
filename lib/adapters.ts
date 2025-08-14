// Unified persistence adapter layer for posts & questions. Allows swapping local (in-memory/localStorage)
// implementation with a remote API without rewriting hooks.
import { PostModel, QuestionModel } from './types';
import { createPostApi, createCommentApi, createReplyApi, createQuestionApi, createAnswerApi, followUserApi, unfollowUserApi, sendEngagementApi, sendEngagementBatchApi, API_URL } from './api';
import { uid } from './helpers';
import { updateUserActions } from './storage';
import { BackoffController } from './security';

export interface CreatePostInput { title: string; body: string; media?: string[]; mediaUrl?: string; price?: string; profile: any; sessionUser: any; }
export interface CreateCommentInput { postId: string; text: string; sessionUser: any; }
export interface CreateReplyInput { postId: string; commentId: string; text: string; sessionUser: any; }
export interface CreateQuestionInput { title: string; details?: string; sessionUser: any; }
export interface CreateAnswerInput { questionId: string; text: string; sessionUser: any; }

export interface PersistenceAdapter {
  createPost(data: CreatePostInput): Promise<PostModel>;
  createComment(data: CreateCommentInput): Promise<{ id: string }>;
  createReply(data: CreateReplyInput): Promise<{ id: string }>;
  createQuestion(data: CreateQuestionInput): Promise<QuestionModel>;
  createAnswer(data: CreateAnswerInput): Promise<{ id: string }>;
  // Mutations that are purely client-local (stars/reports) can remain in hooks; optionally expose later.
  recordUserAction?(actionType: string, payload: Record<string, any>): Promise<void>;
  followUser?(targetEmail: string): Promise<void>;
  unfollowUser?(targetEmail: string): Promise<void>;
  persistEngagement?(data: { kind: 'star'|'report'|'useful'; entityType: string; entityId: string; added: boolean; parentId?: string; extra?: any }): Promise<void>;
  flushEngagements?(): Promise<void>;
  getPendingEngagements?(): number;
}

// Local adapter (no real network). Returns locally built models.
export const localAdapter: PersistenceAdapter = {
  async createPost({ title, body, media, mediaUrl, price, profile, sessionUser }) {
    return { id: uid(), title, body, media, mediaUrl, price, author: profile.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: profile.avatar||'', authorType: profile.type, createdAt: Date.now(), stars:0, reports:0, comments: [] } as PostModel;
  },
  async createComment({ postId, text, sessionUser }) {
    return { id: uid() };
  },
  async createReply({ postId, commentId, text, sessionUser }) {
    return { id: uid() };
  },
  async createQuestion({ title, details, sessionUser }) {
    return { id: uid(), title, details, author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', createdAt: Date.now(), useful:0, usefulByUser:false, reports:0, stars:0, answers: [] } as QuestionModel;
  },
  async createAnswer({ questionId, text, sessionUser }) {
    return { id: uid() };
  },
  async recordUserAction() { /* no-op for local */ }
  , async followUser() { /* no-op local */ }
  , async unfollowUser() { /* no-op local */ }
  , async persistEngagement() { /* no-op */ }
  , async flushEngagements() { /* no-op */ }
};

// Remote adapter: uses API when API_URL present, otherwise falls back to local logic for that call.
// Simple in-memory queue for batching engagement events (persisted for offline resilience)
const ENGAGEMENT_LS_KEY = 'bt_engagement_queue';
function loadPersistedEngagementQueue() {
  try { const raw = localStorage.getItem(ENGAGEMENT_LS_KEY); if(!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr)? arr: []; } catch { return []; }
}
function savePersistedEngagementQueue(q: any[]) { try { localStorage.setItem(ENGAGEMENT_LS_KEY, JSON.stringify(q)); } catch {}
}
const engagementQueue: any[] = loadPersistedEngagementQueue();
let flushTimer: any = null;
const engagementBackoff = new BackoffController(800, 8000);
// Batching for recordUserAction (lightweight, persisted)
const ACTION_LOG_LS_KEY = 'bt_action_log_queue';
function loadPersistedActionQueue() { try { const raw = localStorage.getItem(ACTION_LOG_LS_KEY); if(!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr)? arr: []; } catch { return []; } }
function savePersistedActionQueue(q: any[]) { try { localStorage.setItem(ACTION_LOG_LS_KEY, JSON.stringify(q)); } catch {}
}
const actionLogQueue: { actionType: string; payload: any; ts: number }[] = loadPersistedActionQueue();
let actionLogTimer: any = null;
const actionLogBackoff = new BackoffController(500, 6000);
function scheduleActionLogFlush() {
  if(actionLogTimer) return;
  actionLogTimer = setTimeout(async () => {
  const batch = actionLogQueue.splice(0, actionLogQueue.length);
  savePersistedActionQueue(actionLogQueue);
    actionLogTimer = null;
    if(!API_URL || batch.length===0) return;
    let attempt = 0; let sent = false;
    while(!sent && attempt < 5) {
      try {
        await fetch(`${API_URL}/actions/batch`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(batch) });
        sent = true; actionLogBackoff.reset();
      } catch {
        // fallback: sequential attempt
        try {
          for(const item of batch) { try { await fetch(`${API_URL}/actions`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(item) }); } catch {} }
          sent = true; actionLogBackoff.reset();
        } catch {}
        if(!sent) {
          const delay = actionLogBackoff.nextDelay();
          attempt++;
          if(attempt>=5) {
            // restore unsent batch to queue front for later retry
            actionLogQueue.unshift(...batch);
            savePersistedActionQueue(actionLogQueue);
            try { window.dispatchEvent(new CustomEvent('bt_user_action_log_failed', { detail:{ size: batch.length } })); } catch {}
            break;
          }
          await new Promise(r=>setTimeout(r, delay));
        }
      }
    }
  }, 500);
}
async function scheduleFlush() {
  if(flushTimer) return;
  flushTimer = setTimeout(async () => {
  const batch = engagementQueue.splice(0, engagementQueue.length);
  savePersistedEngagementQueue(engagementQueue);
    flushTimer = null;
    if(!API_URL || batch.length===0) return;
    let success = false; let attempt = 0;
    while(!success && attempt < 5) {
      try {
        const res = await sendEngagementBatchApi(batch as any);
        if(res) { success = true; engagementBackoff.reset(); break; }
      } catch {}
      if(!success) {
        // sequential fallback
        try { for(const item of batch) { try { await sendEngagementApi(item); } catch {} } success = true; engagementBackoff.reset(); break; } catch {}
      }
      if(!success) {
        attempt++;
        const delay = engagementBackoff.nextDelay();
        if(attempt>=5) {
          // push back into queue for later retry
          engagementQueue.unshift(...batch);
          savePersistedEngagementQueue(engagementQueue);
          try { window.dispatchEvent(new CustomEvent('bt_engagement_flush_failed', { detail:{ count: batch.length } })); } catch {}
          return;
        }
        await new Promise(r=>setTimeout(r, delay));
      }
    }
    if(success) { try { window.dispatchEvent(new CustomEvent('bt_engagement_flush', { detail:{ count: batch.length } })); } catch {} }
  }, 300);
}

export const remoteAdapter: PersistenceAdapter = {
  async createPost(input) {
    if(!API_URL) return localAdapter.createPost(input);
    const temp = await localAdapter.createPost(input); // build shape
    const saved = await createPostApi(temp);
    return saved ? { ...temp, id: saved.id } : temp;
  },
  async createComment({ postId, text, sessionUser }) {
    if(!API_URL) return localAdapter.createComment({ postId, text, sessionUser });
    const created = await createCommentApi(postId, { text, author: sessionUser?.name, authorEmail: sessionUser?.email, createdAt: Date.now() });
    return created ? { id: created.id } : { id: uid() };
  },
  async createReply({ postId, commentId, text, sessionUser }) {
    if(!API_URL) return localAdapter.createReply({ postId, commentId, text, sessionUser });
    const created = await createReplyApi(postId, commentId, { text, author: sessionUser?.name, authorEmail: sessionUser?.email, createdAt: Date.now() });
    return created ? { id: created.id } : { id: uid() };
  },
  async createQuestion({ title, details, sessionUser }) {
    if(!API_URL) return localAdapter.createQuestion({ title, details, sessionUser });
    const temp = await localAdapter.createQuestion({ title, details, sessionUser });
    const saved = await createQuestionApi(temp);
    return saved ? { ...temp, id: saved.id } : temp;
  },
  async createAnswer({ questionId, text, sessionUser }) {
    if(!API_URL) return localAdapter.createAnswer({ questionId, text, sessionUser });
    const created = await createAnswerApi(questionId, { text, author: sessionUser?.name, authorEmail: sessionUser?.email, createdAt: Date.now() });
    return created ? { id: created.id } : { id: uid() };
  },
  async recordUserAction(actionType, payload) {
    if(!API_URL) return; // silent skip
  actionLogQueue.push({ actionType, payload, ts: Date.now() });
  savePersistedActionQueue(actionLogQueue);
  scheduleActionLogFlush();
  }
  , async followUser(targetEmail: string) {
    if(!API_URL) return; try { await followUserApi(targetEmail); } catch {}
  }
  , async unfollowUser(targetEmail: string) {
    if(!API_URL) return; try { await unfollowUserApi(targetEmail); } catch {}
  }
  , async persistEngagement(data) {
  if(!API_URL) return; engagementQueue.push(data);
  savePersistedEngagementQueue(engagementQueue);
    try { window.dispatchEvent(new CustomEvent('bt_engagement_pending', { detail:{ count: engagementQueue.length, entityId: data.entityId } })); } catch {}
  scheduleFlush();
  }
  , async flushEngagements() {
  if(!API_URL) return; const batch = engagementQueue.splice(0, engagementQueue.length); if(batch.length===0) return;
  savePersistedEngagementQueue(engagementQueue);
    let success = false; let attempt=0;
    while(!success && attempt<5) {
      try { const res = await sendEngagementBatchApi(batch as any); if(res) { success=true; engagementBackoff.reset(); break; } } catch {}
      if(!success) {
        try { for(const item of batch) { try { await sendEngagementApi(item); } catch {} } success=true; engagementBackoff.reset(); break; } catch {}
      }
      if(!success) { attempt++; const delay=engagementBackoff.nextDelay(); if(attempt>=5) { engagementQueue.unshift(...batch); savePersistedEngagementQueue(engagementQueue); try { window.dispatchEvent(new CustomEvent('bt_engagement_flush_failed', { detail:{ count: batch.length, manual:true } })); } catch {}; return; } await new Promise(r=>setTimeout(r, delay)); }
    }
    if(success) { try { window.dispatchEvent(new CustomEvent('bt_engagement_flush', { detail:{ count: batch.length, manual:true } })); } catch {} }
  }
  , getPendingEngagements() { return engagementQueue.length; }
};

export function chooseAdapter(): PersistenceAdapter {
  return API_URL ? remoteAdapter : localAdapter;
}

// Flush queue on page unload
if(typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { try { remoteAdapter.flushEngagements?.(); } catch {} });
  window.addEventListener('online', () => { try { remoteAdapter.flushEngagements?.(); scheduleActionLogFlush(); } catch {} });
}
