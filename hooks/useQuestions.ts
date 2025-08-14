import { useCallback } from 'react';
import { QuestionModel } from '../lib/types';
import { createQuestionApi, createAnswerApi, API_URL } from '../lib/api';
import { uid } from '../lib/helpers';
import { optimisticUpdate } from '../lib/optimistic';
import { updateUserActions } from '../lib/storage';
import { chooseAdapter, PersistenceAdapter } from '../lib/adapters';
import { useAdapterFromContext, resolveAdapter } from '../lib/AdapterContext';
import { validateQuestion, validateAnswer, firstError, attachModeration } from '../lib/validation';
import { sanitizeHtml } from '../lib/security';

// Shared report throttle map (simple client heuristic)
const qReportTimestamps: Record<string, number> = {};
function canReport(key: string, windowMs=3000) { const last = qReportTimestamps[key]||0; const now=Date.now(); if(now-last < windowMs) return false; qReportTimestamps[key]=now; return true; }

export function useQuestions(questions: QuestionModel[], setQuestions: React.Dispatch<React.SetStateAction<QuestionModel[]>>, sessionUser: any, pushToast: (m:string,o?:any)=>void, adapter?: PersistenceAdapter) {
  const ctxAdapter = useAdapterFromContext();
  const effectiveAdapter = resolveAdapter(adapter, ctxAdapter);
  const askQuestion = useCallback(async ({ title, details }: { title: string; details?: string }) => {
    const v = validateQuestion({ title, details }); if(!v.ok) { pushToast(firstError(v)||'Invalid question', { type:'error' }); return; }
  const raw = await effectiveAdapter.createQuestion({ title: sanitizeHtml(title), details: details ? sanitizeHtml(details) : undefined, sessionUser });
  const qLocal = attachModeration(raw);
    await optimisticUpdate(
      () => { setQuestions(prev => [qLocal, ...prev]); return { rollback: () => setQuestions(prev => prev.filter(q=>q.id!==qLocal.id)), snapshot: null }; },
      async () => { /* remote already persisted */ },
      () => pushToast('Failed to post question', { type: 'error' })
    );
  }, [effectiveAdapter, setQuestions, sessionUser, pushToast]);

  const answerQuestion = useCallback(async (qid: string, text: string) => {
    const v = validateAnswer({ text }); if(!v.ok) { pushToast(firstError(v)||'Invalid answer', { type:'error' }); return; }
  const safeText = sanitizeHtml(text);
  const ansId = (await effectiveAdapter.createAnswer({ questionId: qid, text: safeText, sessionUser })).id;
    const ans = attachModeration({ id: ansId, author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', text: safeText, reports:0, stars:0, createdAt: Date.now() } as any);
    await optimisticUpdate(
      () => { setQuestions(prev => prev.map(q => q.id===qid ? { ...q, answers: [...q.answers, ans] } : q)); return { rollback: () => setQuestions(prev => prev.map(q => q.id===qid ? { ...q, answers: q.answers.filter(a=>a.id!==ans.id) } : q)), snapshot: null }; },
      async () => { /* remote already persisted */ },
      () => pushToast('Failed to add answer', { type: 'error' })
    );
  }, [effectiveAdapter, setQuestions, sessionUser, pushToast]);

  const toggleQuestionStar = useCallback((qid: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, questionStars:{...prev.questionStars}} as any; if(next.questionStars[qid]) { delete next.questionStars[qid]; } else { next.questionStars[qid]=true; added=true; } return next; });
    setQuestions(prev => prev.map(q => q.id===qid ? { ...q, stars: Math.max(0,(q.stars||0)+(added?1:-1)) } : q));
  effectiveAdapter.recordUserAction?.('questionStar',{ qid, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'question', entityId: qid, added });
  }, [setQuestions, sessionUser, effectiveAdapter]);

  const toggleAnswerStar = useCallback((qid: string, answerId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, answerStars:{...prev.answerStars}} as any; if(next.answerStars[answerId]) { delete next.answerStars[answerId]; } else { next.answerStars[answerId]=true; added=true; } return next; });
    setQuestions(prev=> prev.map(q=> q.id!==qid? q : { ...q, answers: q.answers.map(a=> a.id!==answerId? a : { ...a, stars: Math.max(0,(a.stars||0)+(added?1:-1)) }) }));
  effectiveAdapter.recordUserAction?.('answerStar',{ qid, answerId, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'answer', entityId: answerId, parentId: qid, added });
  }, [setQuestions, sessionUser, effectiveAdapter]);

  const toggleUsefulAnswer = useCallback((qid: string, answerId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, answerUseful:{...(prev as any).answerUseful||{}}} as any; if(next.answerUseful[answerId]) { delete next.answerUseful[answerId]; } else { next.answerUseful[answerId]=true; added=true; } return next; });
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, useful: Math.max(0,(a.useful||0)+(added?1:-1)), usefulByUser: !a.usefulByUser }) }));
  effectiveAdapter.recordUserAction?.('answerUseful',{ qid, answerId, added });
  effectiveAdapter.persistEngagement?.({ kind:'useful', entityType:'answer', entityId: answerId, parentId: qid, added });
  }, [setQuestions, sessionUser, effectiveAdapter]);

  const addAnswerReply = useCallback((qid: string, answerId: string, text: string) => {
    if(!sessionUser) return;
    const reply = { id: uid(), author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', text: sanitizeHtml(text), createdAt: Date.now(), stars:0, reports:0, useful:0, usefulByUser:false, replies:[] } as any;
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, replies: [ ...(a.replies||[]), reply ] }) }));
  }, [setQuestions, sessionUser]);
  const addNestedAnswerReply = useCallback((qid: string, answerId: string, parentReplyId: string, text: string) => {
    if(!sessionUser) return;
    const nested = { id: uid(), author: sessionUser?.name||'User', authorEmail: sessionUser?.email||'', authorAvatar: sessionUser?.avatar||'', text: sanitizeHtml(text), createdAt: Date.now(), stars:0, reports:0, useful:0, usefulByUser:false } as any;
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, replies: (a.replies||[]).map(r => r.id!==parentReplyId ? r : { ...r, replies: [ ...(r.replies||[]), nested ] }) }) }));
  }, [setQuestions, sessionUser]);
  const toggleAnswerReplyUseful = useCallback((qid: string, answerId: string, replyId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, answerReplyUseful:{...(prev as any).answerReplyUseful||{}}} as any; if(next.answerReplyUseful[replyId]) { delete next.answerReplyUseful[replyId]; } else { next.answerReplyUseful[replyId]=true; added=true; } return next; });
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, replies: (a.replies||[]).map(r => {
      if(r.id===replyId) return { ...r, useful: Math.max(0,(r.useful||0)+(added?1:-1)), usefulByUser: !r.usefulByUser };
      if(r.replies && r.replies.length) return { ...r, replies: r.replies.map((nr:any)=> nr.id===replyId ? { ...nr, useful: Math.max(0,(nr.useful||0)+(added?1:-1)), usefulByUser: !nr.usefulByUser } : nr) };
      return r;
    }) }) }));
  effectiveAdapter.recordUserAction?.('answerReplyUseful',{ qid, answerId, replyId, added });
  effectiveAdapter.persistEngagement?.({ kind:'useful', entityType:'answerReply', entityId: replyId, parentId: answerId, added });
  }, [setQuestions, sessionUser, effectiveAdapter]);
  const starAnswerReply = useCallback((qid: string, answerId: string, replyId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let added=false;
    updateUserActions(email, prev=> { const next={...prev, answerReplyStars:{...(prev as any).answerReplyStars||{}}} as any; if(next.answerReplyStars[replyId]) { delete next.answerReplyStars[replyId]; } else { next.answerReplyStars[replyId]=true; added=true; } return next; });
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, replies: (a.replies||[]).map(r => r.id===replyId ? { ...r, stars: Math.max(0,(r.stars||0)+(added?1:-1)) } : { ...r, replies: (r.replies||[]).map((nr:any)=> nr.id===replyId ? { ...nr, stars: Math.max(0,(nr.stars||0)+(added?1:-1)) } : nr) }) }) }));
  effectiveAdapter.recordUserAction?.('answerReplyStar',{ qid, answerId, replyId, added });
  effectiveAdapter.persistEngagement?.({ kind:'star', entityType:'answerReply', entityId: replyId, parentId: answerId, added });
  }, [setQuestions, sessionUser, effectiveAdapter]);
  const reportQuestion = useCallback((qid: string, answerId?: string) => {
    if(!canReport((answerId?'answer:':'question:') + (answerId||qid))) { pushToast('Please wait before reporting again', { type:'info' }); return; }
    if(!sessionUser) return; const email=sessionUser.email; let removed=false;
    updateUserActions(email, prev=> { const next={...prev, reports:{...prev.reports}} as any; if(!answerId) { next.reports.questions={...next.reports.questions}; if(next.reports.questions[qid]) { delete next.reports.questions[qid]; removed=true; } else { next.reports.questions[qid]=true; } return next; } next.reports.answers={...next.reports.answers}; if(next.reports.answers[answerId]) { delete next.reports.answers[answerId]; removed=true; } else { next.reports.answers[answerId]=true; } return next; });
    setQuestions(prev => prev.map(q => {
      if(q.id!==qid) return q;
      if(!answerId) return { ...q, reports: Math.max(0,(q.reports||0)+(removed?-1:1)) };
      return { ...q, answers: q.answers.map(a => a.id===answerId ? { ...a, reports: Math.max(0,(a.reports||0)+(removed?-1:1)) } : a) };
    }));
  effectiveAdapter.recordUserAction?.('questionReport',{ qid, answerId, removed });
  effectiveAdapter.persistEngagement?.({ kind:'report', entityType: answerId ? 'answer' : 'question', entityId: answerId || qid, parentId: answerId ? qid : undefined, added: !removed });
  }, [setQuestions, sessionUser, effectiveAdapter]);
  const reportAnswerReply = useCallback((qid: string, answerId: string, replyId: string) => {
    if(!sessionUser) return; const email=sessionUser.email; let removed=false;
    updateUserActions(email, prev=> { const next={...prev, reports:{...prev.reports, answerReplies:{...(prev.reports as any).answerReplies||{}}}} as any; if(next.reports.answerReplies[replyId]) { delete next.reports.answerReplies[replyId]; removed=true; } else { next.reports.answerReplies[replyId]=true; } return next; });
    setQuestions(prev => prev.map(q => q.id!==qid ? q : { ...q, answers: q.answers.map(a => a.id!==answerId ? a : { ...a, replies: (a.replies||[]).map(r => r.id===replyId ? { ...r, reports: Math.max(0,(r.reports||0)+(removed?-1:1)) } : { ...r, replies: (r.replies||[]).map((nr:any)=> nr.id===replyId ? { ...nr, reports: Math.max(0,(nr.reports||0)+(removed?-1:1)) } : nr) }) }) }));
  effectiveAdapter.recordUserAction?.('answerReplyReport',{ qid, answerId, replyId, removed });
  effectiveAdapter.persistEngagement?.({ kind:'report', entityType:'answerReply', entityId: replyId, parentId: answerId, added: !removed });
  }, [setQuestions, sessionUser, effectiveAdapter]);

  return { askQuestion, answerQuestion, toggleQuestionStar, toggleAnswerStar, toggleUsefulAnswer, addAnswerReply, addNestedAnswerReply, toggleAnswerReplyUseful, starAnswerReply, reportQuestion, reportAnswerReply };
}
