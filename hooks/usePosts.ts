import { useCallback } from 'react';
import { PostModel } from '../lib/types';
import { createPostApi, createCommentApi, createReplyApi, API_URL } from '../lib/api'; // legacy direct calls retained for now
import { uid } from '../lib/helpers';
import { optimisticUpdate } from '../lib/optimistic';
import { updateUserActions } from '../lib/storage';
import { chooseAdapter, PersistenceAdapter } from '../lib/adapters';
import { useAdapterFromContext, resolveAdapter } from '../lib/AdapterContext';
import { validatePost, validateComment, firstError, attachModeration } from '../lib/validation';
import { sanitizeHtml } from '../lib/security';

// Basic in-memory report throttle: prevent more than one report toggle per 3s per entity (client only safety net)
const reportTimestamps: Record<string, number> = {};
function canReport(key: string, windowMs=3000) {
  if(typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return true; // disable throttle in tests
  const last = reportTimestamps[key]||0; const now=Date.now(); if(now-last < windowMs) return false; reportTimestamps[key]=now; return true; }

export function usePosts(posts: PostModel[], setPosts: React.Dispatch<React.SetStateAction<PostModel[]>>, sessionUser: any, pushToast: (m:string,o?:any)=>void, adapter?: PersistenceAdapter) {
  const ctxAdapter = useAdapterFromContext();
  const effectiveAdapter = resolveAdapter(adapter, ctxAdapter);
  const createPost = useCallback(async (p: { title: string; body: string; media?: string[]; mediaUrl?: string; price?: string; profile: any }) => {
    const v = validatePost({ title: p.title, body: p.body });
    if(!v.ok) { pushToast(firstError(v)||'Invalid post', { type:'error' }); return; }
    // Security: sanitize rich text fields before persisting / sending
    const safe = { ...p, title: sanitizeHtml(p.title), body: sanitizeHtml(p.body) };
    // Build local temp via adapter (which may call remote) & attach moderation heuristics
    const tempRaw = await effectiveAdapter.createPost({ ...safe, sessionUser });
    const temp = attachModeration(tempRaw);
    await optimisticUpdate(
      () => {
        setPosts(prev => [temp, ...prev]);
        return { rollback: () => setPosts(prev => prev.filter(x => x.id !== temp.id)), snapshot: null };
      },
      async () => {
        // Remote adapter already persisted; for local no-op.
      },
      () => pushToast('Failed to create post', { type: 'error' })
    );
  }, [effectiveAdapter, setPosts, sessionUser, pushToast]);

  const addComment = useCallback(async (postId: string, text: string) => {
    const v = validateComment({ text }); if(!v.ok) { pushToast(firstError(v)||'Invalid comment', { type:'error' }); return; }
    const safeText = sanitizeHtml(text);
    const comment = attachModeration({ id: uid(), author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', authorType: sessionUser?.type, text: safeText, createdAt: Date.now(), reactions:{like:0,love:0}, userReaction:null, reports:0, stars:0, replies: [] });
    await optimisticUpdate(
      () => {
        setPosts(prev => prev.map(p => p.id===postId ? { ...p, comments: [...p.comments, comment] } : p));
        return { rollback: () => setPosts(prev => prev.map(p => p.id===postId ? { ...p, comments: p.comments.filter(c=>c.id!==comment.id) } : p)), snapshot: null };
      },
  async () => { try { await effectiveAdapter.createComment({ postId, text, sessionUser }); } catch {} },
      () => pushToast('Failed to add comment', { type: 'error' })
    );
  }, [effectiveAdapter, setPosts, sessionUser, pushToast]);

  const addReply = useCallback(async (postId: string, commentId: string, text: string) => {
    const reply = { id: uid(), author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', text: sanitizeHtml(text), createdAt: Date.now(), stars:0, reports:0, replies: [] };
    await optimisticUpdate(
      () => {
        setPosts(prev => prev.map(p => p.id===postId ? { ...p, comments: p.comments.map(c=> c.id===commentId ? { ...c, replies: [...c.replies, reply] } : c) } : p));
        return { rollback: () => setPosts(prev => prev.map(p => p.id===postId ? { ...p, comments: p.comments.map(c=> c.id===commentId ? { ...c, replies: c.replies.filter(r=>r.id!==reply.id) } : c) } : p)), snapshot: null };
      },
  async () => { try { await effectiveAdapter.createReply({ postId, commentId, text, sessionUser }); } catch {} },
      () => pushToast('Failed to add reply', { type: 'error' })
    );
  }, [effectiveAdapter, setPosts, sessionUser, pushToast]);

  const toggleStarPost = useCallback((postId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, postStars:{...prev.postStars}} as any; if(next.postStars[postId]) { delete next.postStars[postId]; } else { next.postStars[postId]=true; added=true; } return next; });
    setPosts(prev => prev.map(p => p.id===postId ? { ...p, stars: Math.max(0,(p.stars||0)+(added?1:-1)) } : p));
  effectiveAdapter.recordUserAction?.('postStar',{ postId, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'post', entityId: postId, added });
  }, [setPosts, sessionUser, effectiveAdapter]);

  // Nested reply (reply to a reply)
  const addReplyToReply = useCallback((postId: string, commentId: string, parentReplyId: string, text: string) => {
    if(!sessionUser) return;
    const nested = { id: uid(), author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', text: sanitizeHtml(text), createdAt: Date.now(), stars:0, reports:0 };
    setPosts(prev => prev.map(p => p.id!==postId ? p : { ...p, comments: p.comments.map(c => c.id!==commentId ? c : { ...c, replies: c.replies.map(r => r.id!==parentReplyId ? r : { ...r, replies: [ ...(r.replies||[]), nested ] }) }) }));
  }, [setPosts, sessionUser]);

  // Stars for comment & reply
  const toggleCommentStar = useCallback((postId: string, commentId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, commentStars:{...prev.commentStars}} as any; if(next.commentStars[commentId]) { delete next.commentStars[commentId]; } else { next.commentStars[commentId]=true; added=true; } return next; });
    setPosts(prev=> prev.map(p=> p.id!==postId? p : { ...p, comments: p.comments.map((c:any)=> c.id!==commentId? c : { ...c, stars: Math.max(0,(c.stars||0)+(added?1:-1)) }) }));
  effectiveAdapter.recordUserAction?.('commentStar',{ postId, commentId, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'comment', entityId: commentId, parentId: postId, added });
  }, [setPosts, sessionUser, effectiveAdapter]);
  const toggleReplyStar = useCallback((postId: string, commentId: string, replyId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, replyStars:{...prev.replyStars}} as any; if(next.replyStars[replyId]) { delete next.replyStars[replyId]; } else { next.replyStars[replyId]=true; added=true; } return next; });
    setPosts(prev=> prev.map(p=> p.id!==postId? p : { ...p, comments: p.comments.map((c:any)=> c.id!==commentId? c : { ...c, replies: c.replies.map((r:any)=> r.id!==replyId? r : { ...r, stars: Math.max(0,(r.stars||0)+(added?1:-1)) }) }) }));
  effectiveAdapter.recordUserAction?.('replyStar',{ postId, commentId, replyId, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'reply', entityId: replyId, parentId: commentId, added });
  }, [setPosts, sessionUser, effectiveAdapter]);

  // Reports
  const reportPost = useCallback((postId: string) => {
    if(!canReport('post:'+postId)) { pushToast('Please wait before reporting again', { type:'info' }); return; }
    if(!sessionUser) return; const email=sessionUser.email; let removed=false;
    updateUserActions(email, prev=> { const next={...prev, reports:{...prev.reports, posts:{...prev.reports.posts}}}; if(next.reports.posts[postId]) { delete next.reports.posts[postId]; removed=true; } else { next.reports.posts[postId]=true; } return next; });
    setPosts(prev => prev.map(p => p.id===postId ? { ...p, reports: Math.max(0,(p.reports||0)+(removed?-1:1)) } : p));
  effectiveAdapter.recordUserAction?.('postReport',{ postId, removed });
  effectiveAdapter.persistEngagement?.({ kind:'report', entityType:'post', entityId: postId, added: !removed });
  }, [setPosts, sessionUser, effectiveAdapter]);
  const reportComment = useCallback((postId: string, commentId: string) => {
    if(!canReport('comment:'+commentId)) { pushToast('Please wait before reporting again', { type:'info' }); return; }
    if(!sessionUser) return; const email=sessionUser.email; let removed=false;
    updateUserActions(email, prev=> { const next={...prev, reports:{...prev.reports, comments:{...prev.reports.comments}}}; if(next.reports.comments[commentId]) { delete next.reports.comments[commentId]; removed=true; } else { next.reports.comments[commentId]=true; } return next; });
    setPosts(prev => prev.map(p => p.id!==postId ? p : { ...p, comments: p.comments.map((c:any)=> c.id===commentId ? { ...c, reports: Math.max(0,(c.reports||0)+(removed?-1:1)) } : c) }));
  effectiveAdapter.recordUserAction?.('commentReport',{ postId, commentId, removed });
  effectiveAdapter.persistEngagement?.({ kind:'report', entityType:'comment', entityId: commentId, parentId: postId, added: !removed });
  }, [setPosts, sessionUser, effectiveAdapter]);
  const reportReply = useCallback((postId: string, commentId: string, replyId: string) => {
    if(!canReport('reply:'+replyId)) { pushToast('Please wait before reporting again', { type:'info' }); return; }
    if(!sessionUser) return; const email=sessionUser.email; let removed=false;
    updateUserActions(email, prev => { const next={...prev, reports:{...prev.reports, replies:{...(prev.reports.replies||{})}}} as any; if(next.reports.replies[replyId]) { delete next.reports.replies[replyId]; removed=true; } else { next.reports.replies[replyId]=true; } return next; });
    setPosts(prev => prev.map(p => p.id!==postId? p : { ...p, comments: p.comments.map((c:any)=> c.id!==commentId? c : { ...c, replies: c.replies.map((r:any)=> r.id===replyId ? { ...r, reports: Math.max(0,(r.reports||0)+(removed?-1:1)) } : { ...r, replies: (r.replies||[]).map((nr:any)=> nr.id===replyId ? { ...nr, reports: Math.max(0,(nr.reports||0)+(removed?-1:1)) } : nr) }) }) }));
  effectiveAdapter.recordUserAction?.('replyReport',{ postId, commentId, replyId, removed });
  effectiveAdapter.persistEngagement?.({ kind:'report', entityType:'reply', entityId: replyId, parentId: commentId, added: !removed });
  }, [setPosts, sessionUser, effectiveAdapter]);

  return { createPost, addComment, addReply, addReplyToReply, toggleStarPost, toggleCommentStar, toggleReplyStar, reportPost, reportComment, reportReply };
}
